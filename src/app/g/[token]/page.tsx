import type { Metadata } from "next";
import { formatDateKst, formatKrw } from "@/lib/gallery";
import { getGalleryAccess, type SharedGallery } from "@/lib/gallery-access";
import { getPaymentOptions } from "@/lib/payments";
import { extraAmount } from "@/lib/selection";
import { presignView } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { unlockGallery, type SavedPin } from "./actions";
import { GalleryView, type ClientPhoto } from "./gallery-view";
import { PasswordGate } from "./password-gate";

// 공유 링크는 검색 엔진에 노출하지 않는다.
export const metadata: Metadata = {
  title: "사진 갤러리",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-xs text-sm text-neutral-500">{body}</p>
    </main>
  );
}

function photographerName(gallery: SharedGallery) {
  return gallery.photographers?.studio_name || gallery.photographers?.display_name || "사진작가";
}

// 결제 결과 문구는 고정된 목록에서만 고른다 (URL로 임의 문구를 띄울 수 없게).
const PAYMENT_RESULT: Record<string, { tone: "ok" | "warn"; text: string }> = {
  done: { tone: "ok", text: "결제가 완료되어 셀렉이 확정됐어요." },
  canceled: { tone: "warn", text: "결제를 취소했어요. 준비되면 다시 결제해주세요." },
  error: { tone: "warn", text: "결제를 완료하지 못했어요. 다시 시도하거나 작가님께 문의해주세요." },
};

export default async function SharedGalleryPage({ params, searchParams }: PageProps<"/g/[token]">) {
  const { token } = await params;
  const { payment } = await searchParams;
  const paymentResult = typeof payment === "string" ? PAYMENT_RESULT[payment] : undefined;
  const access = await getGalleryAccess(token);

  switch (access.state) {
    case "not_found":
      return <Notice title="갤러리를 찾을 수 없어요" body="링크가 바뀌었거나 삭제되었어요. 작가님께 새 링크를 요청해주세요." />;
    case "not_open":
      return <Notice title="아직 준비 중인 갤러리예요" body="작가님이 사진을 정리하고 있어요. 공개되면 같은 링크로 볼 수 있어요." />;
    case "expired":
      return <Notice title="공유 기간이 끝났어요" body="사진을 다시 보려면 작가님께 문의해주세요." />;
    case "locked":
      return (
        <PasswordGate action={unlockGallery.bind(null, token)} photographerName={photographerName(access.gallery)} />
      );
  }

  const { gallery } = access;
  const admin = createAdminClient();
  const [{ data: rows }, { data: selections }, { data: pinRows }, paymentOptions] = await Promise.all([
    admin
      .from("photos")
      .select("id, filename, thumb_key, preview_key, width, height")
      .eq("gallery_id", gallery.id)
      .eq("processing_status", "ready")
      .order("sort_order")
      .order("filename"),
    admin.from("selections").select("photo_id").eq("gallery_id", gallery.id),
    admin
      .from("retouch_pins")
      .select("id, photo_id, x, y, body")
      .eq("gallery_id", gallery.id)
      .eq("author", "client")
      .order("created_at"),
    getPaymentOptions(gallery.photographer_id),
  ]);
  const awaitingPayment = gallery.status === "awaiting_payment";
  const extraDue = extraAmount(selections?.length ?? 0, gallery);
  const pins: SavedPin[] = (pinRows ?? []).map((p) => ({
    id: p.id,
    photoId: p.photo_id,
    x: Number(p.x),
    y: Number(p.y),
    body: p.body,
  }));

  // 고객에게는 워터마크 미리보기와 썸네일만 전달한다 (원본 키는 조회하지도 않는다).
  const photos: ClientPhoto[] = await Promise.all(
    (rows ?? []).map(async (p) => ({
      id: p.id,
      filename: p.filename,
      width: p.width,
      height: p.height,
      thumbUrl: await presignView(p.thumb_key!),
      previewUrl: await presignView(p.preview_key!),
    })),
  );

  return (
    <div className="flex flex-1 flex-col">
      <header className="px-4 pt-8 pb-5 sm:px-6">
        <p className="text-sm text-neutral-500">{photographerName(gallery)}</p>
        <h1 className="mt-1 text-2xl font-semibold">{gallery.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          사진 {photos.length}장
          {gallery.expires_at && ` · ${formatDateKst(gallery.expires_at)}까지 볼 수 있어요`}
        </p>
        {paymentResult && (
          <p
            role="status"
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              paymentResult.tone === "ok"
                ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300"
                : "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
            }`}
          >
            {paymentResult.text}
          </p>
        )}
        {awaitingPayment && (
          <div className="mt-4 space-y-2 rounded-xl border border-amber-300 px-4 py-3 text-sm dark:border-amber-800">
            <p className="font-medium">추가 보정 {formatKrw(extraDue)} 결제가 필요해요</p>
            {paymentOptions.toss && <p>아래 &lsquo;카드 결제&rsquo; 버튼으로 바로 결제할 수 있어요.</p>}
            {paymentOptions.bank && (
              <p>
                계좌이체: {paymentOptions.bank.bankName} <span className="font-mono">{paymentOptions.bank.account}</span> (
                {paymentOptions.bank.holder})
                <span className="block text-xs text-neutral-500">
                  입금하시면 작가님이 확인한 뒤 셀렉이 확정돼요. 입금자명은 예약자 이름으로 해주세요.
                </span>
              </p>
            )}
            {!paymentOptions.toss && !paymentOptions.bank && <p>결제 방법은 작가님께 문의해주세요.</p>}
          </div>
        )}
        {gallery.base_select_count > 0 && (
          <p className="mt-4 rounded-xl bg-black/[.04] px-4 py-3 text-sm dark:bg-white/[.06]">
            보정 {gallery.base_select_count}장이 포함되어 있어요.
            {gallery.extra_price_krw > 0 && ` 더 고르시면 장당 ${formatKrw(gallery.extra_price_krw)}이 추가돼요.`}
          </p>
        )}
      </header>

      <main className="flex-1 pb-12 sm:px-6">
        {photos.length ? (
          <GalleryView
            token={token}
            photos={photos}
            // 클라이언트로는 필요한 필드만 보낸다 (password_hash 등 노출 금지)
            gallery={{
              status: gallery.status,
              base_select_count: gallery.base_select_count,
              extra_price_krw: gallery.extra_price_krw,
            }}
            initialSelected={(selections ?? []).map((s) => s.photo_id)}
            initialPins={pins}
            canPayByCard={!!paymentOptions.toss}
          />
        ) : (
          <p className="px-4 text-sm text-neutral-500">아직 올라온 사진이 없어요.</p>
        )}
      </main>
    </div>
  );
}
