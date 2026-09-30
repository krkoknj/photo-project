import type { Metadata } from "next";
import { formatDateKst, formatKrw } from "@/lib/gallery";
import { getGalleryAccess, type SharedGallery } from "@/lib/gallery-access";
import { presignView } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { unlockGallery } from "./actions";
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

export default async function SharedGalleryPage({ params }: PageProps<"/g/[token]">) {
  const { token } = await params;
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
  const { data: rows } = await createAdminClient()
    .from("photos")
    .select("id, filename, thumb_key, preview_key, width, height")
    .eq("gallery_id", gallery.id)
    .eq("processing_status", "ready")
    .order("sort_order")
    .order("filename");

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
        {gallery.base_select_count > 0 && (
          <p className="mt-4 rounded-xl bg-black/[.04] px-4 py-3 text-sm dark:bg-white/[.06]">
            보정 {gallery.base_select_count}장이 포함되어 있어요.
            {gallery.extra_price_krw > 0 && ` 더 고르시면 장당 ${formatKrw(gallery.extra_price_krw)}이 추가돼요.`}
          </p>
        )}
      </header>

      <main className="flex-1 pb-12 sm:px-6">
        {photos.length ? (
          <GalleryView photos={photos} />
        ) : (
          <p className="px-4 text-sm text-neutral-500">아직 올라온 사진이 없어요.</p>
        )}
      </main>
    </div>
  );
}
