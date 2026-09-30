"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Enums } from "@/lib/supabase/database.types";
import { removePhoto, retryProcessing } from "../photo-actions";

export type GridPhoto = {
  id: string;
  filename: string;
  status: Enums<"photo_processing_status">;
  thumbUrl: string | null;
  selected: boolean;
  pinCount: number;
};

const POLL_MS = 3000;

export function PhotoGrid({ galleryId, photos, editable }: { galleryId: string; photos: GridPhoto[]; editable: boolean }) {
  const router = useRouter();
  const processing = photos.filter((p) => p.status === "pending" || p.status === "processing").length;

  // 미리보기 생성 중인 사진이 있으면 주기적으로 새로고침
  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [processing, router]);

  if (!photos.length) return null;

  return (
    <div className="space-y-2">
      {processing > 0 && <p className="text-sm text-muted">미리보기 만드는 중… {processing}장 남음</p>}
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {photos.map((photo) => (
          <li key={photo.id} className="group relative aspect-square overflow-hidden rounded-sm bg-panel">
            {photo.thumbUrl ? (
              // 짧게 만료되는 서명 URL이라 next/image 최적화를 거치지 않는다.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.thumbUrl} alt={photo.filename} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted">
                {photo.status === "failed" ? (
                  <form action={retryProcessing.bind(null, galleryId, photo.id)}>
                    <p className="mb-1 text-danger">처리 실패</p>
                    <button type="submit" className="underline">
                      다시 시도
                    </button>
                  </form>
                ) : (
                  "처리 중…"
                )}
              </div>
            )}
            {photo.selected && (
              <span className="pointer-events-none absolute top-1 left-1 rounded-full bg-accent px-1.5 py-0.5 font-mono text-[10px] text-ink">
                ✓{photo.pinCount > 0 && ` 요청 ${photo.pinCount}`}
              </span>
            )}
            <p className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-[11px] text-white">
              {photo.filename}
            </p>
            {editable && (
              <form
                action={removePhoto.bind(null, galleryId, photo.id)}
                className="absolute top-1 right-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <button
                  type="submit"
                  aria-label={`${photo.filename} 빼기`}
                  onClick={(e) => {
                    if (!window.confirm(`${photo.filename}을(를) 갤러리에서 뺄까요?`)) e.preventDefault();
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white"
                >
                  ✕
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
