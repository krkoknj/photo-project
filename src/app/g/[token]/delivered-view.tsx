"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { downloadZip } from "client-zip";

export type DeliveredPhoto = {
  id: string;
  filename: string;
  thumbUrl: string;
  previewUrl: string;
  downloadUrl: string;
};

const SWIPE_THRESHOLD = 50;

type SaveFilePicker = (options: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<{ createWritable: () => Promise<WritableStream> }>;

// 같은 이름이 겹치면 ZIP 안에서 덮어쓰이지 않도록 번호를 붙인다.
function uniqueNames(names: string[]) {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const n = seen.get(name) ?? 0;
    seen.set(name, n + 1);
    return n === 0 ? name : name.replace(/(\.[^.]+)?$/, ` (${n})$1`);
  });
}

export function DeliveredView({ photos, zipName }: { photos: DeliveredPhoto[]; zipName: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [zipState, setZipState] = useState<{ done: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = (index: number) => {
    history.pushState({ viewer: true }, "");
    setOpenIndex(index);
  };
  useEffect(() => {
    const onPop = () => setOpenIndex(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 브라우저에서 파일을 받아 ZIP으로 묶는다. 크롬·엣지(PC)는 파일로 바로 흘려 저장해 용량 제한이 없다.
  async function downloadAll() {
    setError(null);
    setZipState({ done: 0 });
    const names = uniqueNames(photos.map((p) => p.filename));
    async function* entries() {
      for (const [i, photo] of photos.entries()) {
        const res = await fetch(photo.downloadUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        yield { name: names[i], input: res };
        setZipState({ done: i + 1 });
      }
    }

    try {
      const zip = downloadZip(entries());
      const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
      if (picker) {
        const handle = await picker({
          suggestedName: zipName,
          types: [{ description: "ZIP 파일", accept: { "application/zip": [".zip"] } }],
        });
        await zip.body!.pipeTo(await handle.createWritable());
      } else {
        const url = URL.createObjectURL(await zip.blob());
        const a = Object.assign(document.createElement("a"), { href: url, download: zipName });
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch (e) {
      // 저장 위치 선택을 취소한 경우는 오류가 아니다.
      if ((e as Error).name !== "AbortError") {
        setError("전체 다운로드 중 문제가 생겼어요. 페이지를 새로고침한 뒤 다시 시도하거나 한 장씩 받아주세요.");
      }
    } finally {
      setZipState(null);
    }
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 px-4 sm:px-0">
        <button
          type="button"
          onClick={downloadAll}
          disabled={zipState !== null}
          className="rounded-sm bg-accent px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
        >
          {zipState ? `묶는 중… ${zipState.done}/${photos.length}` : `전체 다운로드 (ZIP)`}
        </button>
        <span className="text-xs text-muted">사진을 누르면 크게 보고 한 장씩 저장할 수 있어요.</span>
      </div>
      {error && (
        <p role="alert" className="mx-4 mb-3 rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger sm:mx-0">
          {error}
        </p>
      )}

      <ul className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2 lg:grid-cols-6">
        {photos.map((photo, i) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => open(i)}
              aria-label={`${photo.filename} 크게 보기`}
              className="block aspect-square w-full overflow-hidden bg-panel"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.thumbUrl} alt={photo.filename} loading="lazy" className="h-full w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      {openIndex !== null && (
        <DeliveredViewer photos={photos} index={openIndex} onIndexChange={setOpenIndex} onClose={() => history.back()} />
      )}
    </>
  );
}

function DeliveredViewer({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: DeliveredPhoto[];
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="보정본 크게 보기"
      className="fixed inset-0 z-50 flex flex-col bg-ink text-fg"
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
        <img key={photo.id} src={photo.previewUrl} alt={photo.filename} className="max-h-full max-w-full object-contain" />
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
      <div className="border-t border-white/10 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <a
          href={photo.downloadUrl}
          download={photo.filename}
          className="block rounded-sm bg-accent px-4 py-2.5 text-center font-medium text-ink"
        >
          원본 화질로 저장
        </a>
      </div>
    </div>
  );
}
