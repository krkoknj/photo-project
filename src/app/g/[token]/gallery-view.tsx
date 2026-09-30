"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type ClientPhoto = {
  id: string;
  filename: string;
  thumbUrl: string;
  previewUrl: string;
  width: number | null;
  height: number | null;
};

// 서명 URL은 1시간 뒤 만료되므로 그 전에 페이지 데이터를 새로 받는다.
const URL_REFRESH_MS = 50 * 60 * 1000;
const SWIPE_THRESHOLD = 50;

export function GalleryView({ photos }: { photos: ClientPhoto[] }) {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => router.refresh(), URL_REFRESH_MS);
    return () => clearTimeout(timer);
  }, [router, photos]);

  const open = (index: number) => {
    // 휴대폰 뒤로가기로 뷰어를 닫을 수 있도록 기록을 하나 쌓는다.
    history.pushState({ viewer: true }, "");
    setOpenIndex(index);
  };

  useEffect(() => {
    const onPop = () => setOpenIndex(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <>
      <ul className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2 lg:grid-cols-6">
        {photos.map((photo, i) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => open(i)}
              className="block aspect-square w-full overflow-hidden bg-black/5 dark:bg-white/5"
              aria-label={`${photo.filename} 크게 보기`}
            >
              {/* 짧게 만료되는 서명 URL이라 next/image 최적화를 거치지 않는다. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbUrl}
                alt={photo.filename}
                loading="lazy"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="h-full w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      {openIndex !== null && (
        <Viewer photos={photos} index={openIndex} onIndexChange={setOpenIndex} onClose={() => history.back()} />
      )}
    </>
  );
}

function Viewer({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: ClientPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const photo = photos[index];
  const touchStartX = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next >= 0 && next < photos.length) onIndexChange(next);
    },
    [index, photos.length, onIndexChange],
  );

  // 키보드 조작, 배경 스크롤 잠금
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [go, onClose]);

  // 앞뒤 사진을 미리 받아 넘길 때 기다리지 않게 한다.
  useEffect(() => {
    [photos[index - 1], photos[index + 1]].forEach((p) => {
      if (p) new Image().src = p.previewUrl;
    });
  }, [index, photos]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="사진 크게 보기"
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1);
        touchStartX.current = null;
      }}
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
        <span className="tabular-nums text-white/70">
          {index + 1} / {photos.length}
        </span>
        <span className="min-w-0 truncate text-white/70">{photo.filename}</span>
        <button type="button" onClick={onClose} aria-label="닫기" className="h-10 w-10 shrink-0 text-2xl leading-none">
          ✕
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.previewUrl}
          alt={photo.filename}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="max-h-full max-w-full select-none object-contain"
        />
        {index > 0 && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="이전 사진"
            className="absolute top-1/2 left-2 hidden h-12 w-12 -translate-y-1/2 rounded-full bg-white/10 text-2xl sm:block"
          >
            ‹
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="다음 사진"
            className="absolute top-1/2 right-2 hidden h-12 w-12 -translate-y-1/2 rounded-full bg-white/10 text-2xl sm:block"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
