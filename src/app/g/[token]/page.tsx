import type { Metadata } from "next";
import { formatDateKst, formatKrw } from "@/lib/gallery";
import { getGalleryAccess, type SharedGallery } from "@/lib/gallery-access";
import { getPaymentOptions } from "@/lib/payments";
import { extraAmount } from "@/lib/selection";
import { presignDownload, presignView } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { unlockGallery, type SavedPin } from "./actions";
import { DeliveredView, type DeliveredPhoto } from "./delivered-view";
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
    <main className="flex flex-1 flex-col justify-end px-5 pt-16 pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-10">
      <p className="eyebrow mb-5 text-accent">Select Gallery</p>
      <h1 className="display text-[clamp(3rem,11vw,8rem)]">{title}</h1>
      <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">{body}</p>
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

  // 전달된 보정본: 원본과 연결되고 처리가 끝난 것만. 다운로드는 원래 파일명으로 저장되게 한다.
  let delivered: DeliveredPhoto[] = [];
  if (gallery.status === "delivered") {
    const { data: files } = await admin
      .from("retouched_files")
      .select("id, filename, photo_id, file_key, thumb_key, preview_key")
      .eq("gallery_id", gallery.id)
      .eq("match_status", "matched")
      .eq("processing_status", "ready");
    // 원본 순서(파일명)대로 보여준다.
    const order = new Map((rows ?? []).map((p, i) => [p.id, i]));
    const sorted = (files ?? []).sort((a, b) => (order.get(a.photo_id!) ?? 0) - (order.get(b.photo_id!) ?? 0));
    delivered = await Promise.all(
      sorted.map(async (f) => ({
        id: f.id,
        filename: f.filename,
        thumbUrl: await presignView(f.thumb_key!),
        previewUrl: await presignView(f.preview_key!),
        downloadUrl: await presignDownload(f.file_key, f.filename),
      })),
    );
  }
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
      <header className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 sm:px-10 sm:pt-8">
        <div className="flex items-start justify-between gap-6">
          <p className="eyebrow text-fg">
            {photographerName(gallery)}
            <br />
            <span className="text-muted">Photo gallery</span>
          </p>
          <p className="eyebrow text-right text-muted">
            {String(photos.length).padStart(2, "0")} photos
            {gallery.expires_at && (
              <>
                <br />~ {formatDateKst(gallery.expires_at)}
              </>
            )}
          </p>
        </div>
        <h1 className="display mt-14 text-[clamp(3rem,11vw,9rem)] break-words">{gallery.title}</h1>
        {paymentResult && (
          <p
            role="status"
            className={`mt-4 px-4 py-3 text-sm ${
              paymentResult.tone === "ok"
                ? "border border-ok/40 bg-ok/10 text-ok"
                : "border border-accent/40 bg-accent/10 text-fg"
            }`}
          >
            {paymentResult.text}
          </p>
        )}
        {awaitingPayment && (
          <div className="mt-4 space-y-2 border border-accent/40 px-4 py-3 text-sm">
            <p className="font-medium">추가 보정 {formatKrw(extraDue)} 결제가 필요해요</p>
            {paymentOptions.toss && <p>아래 &lsquo;카드 결제&rsquo; 버튼으로 바로 결제할 수 있어요.</p>}
            {paymentOptions.bank && (
              <p>
                계좌이체: {paymentOptions.bank.bankName} <span className="font-mono">{paymentOptions.bank.account}</span> (
                {paymentOptions.bank.holder})
                <span className="block text-xs text-muted">
                  입금하시면 작가님이 확인한 뒤 셀렉이 확정돼요. 입금자명은 예약자 이름으로 해주세요.
                </span>
              </p>
            )}
            {!paymentOptions.toss && !paymentOptions.bank && <p>결제 방법은 작가님께 문의해주세요.</p>}
          </div>
        )}
        {gallery.base_select_count > 0 && (gallery.status === "open" || awaitingPayment) && (
          <p className="mt-4 bg-panel px-4 py-3 text-sm">
            보정 {gallery.base_select_count}장이 포함되어 있어요.
            {gallery.extra_price_krw > 0 && ` 더 고르시면 장당 ${formatKrw(gallery.extra_price_krw)}이 추가돼요.`}
          </p>
        )}
      </header>

      <main className="flex-1 pb-12 sm:px-10">
        {delivered.length > 0 && (
          <section className="mb-10">
            <h2 className="display mb-2 px-5 text-4xl sm:px-0">
              보정본 <span className="text-accent">{delivered.length}장</span>이 도착했어요
            </h2>
            {gallery.delivered_at && (
              <p className="mb-3 px-4 text-sm text-muted sm:px-0">
                {formatDateKst(gallery.delivered_at)} 전달
                {gallery.expires_at && ` · ${formatDateKst(gallery.expires_at)}까지 받을 수 있어요`}
              </p>
            )}
            <DeliveredView photos={delivered} zipName={`${gallery.title} 보정본.zip`} />
            <h2 className="eyebrow mt-14 mb-4 px-5 text-muted sm:px-0">고른 사진 — 원본 미리보기</h2>
          </section>
        )}
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
          <p className="px-4 text-sm text-muted">아직 올라온 사진이 없어요.</p>
        )}
      </main>
    </div>
  );
}
