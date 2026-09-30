"use client";

import { useState } from "react";
import { buttonClass } from "@/components/form";
import { PinnedPhoto, type Pin } from "@/components/pinned-photo";

export type SelectedPhoto = {
  id: string;
  filename: string;
  previewUrl: string | null;
  aspect: number;
  isExtra: boolean;
  pins: Pin[];
};

// 라이트룸 등에서 검색할 수 있도록 확장자를 뗀 파일명을 쉼표로 이어 복사한다.
function filenameList(photos: SelectedPhoto[]) {
  return photos.map((p) => p.filename.replace(/\.[^.]+$/, "")).join(", ");
}

export function CopyFilenamesButton({ photos }: { photos: SelectedPhoto[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const text = filenameList(photos);
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("파일명을 복사하세요", text);
        }
      }}
      className={buttonClass("secondary", "text-sm")}
    >
      {copied ? "복사됨" : "파일명 복사"}
    </button>
  );
}

export function SelectionResults({ photos }: { photos: SelectedPhoto[] }) {
  const [activePin, setActivePin] = useState<string | null>(null);

  return (
    <ul className="grid items-start gap-4 sm:grid-cols-2">
      {photos.map((photo) => (
        <li key={photo.id} className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
          <div className="bg-black">
            {photo.previewUrl ? (
              <PinnedPhoto
                src={photo.previewUrl}
                alt={photo.filename}
                aspect={photo.aspect}
                pins={photo.pins}
                activePinId={activePin}
              />
            ) : (
              <div className="aspect-[3/2]" />
            )}
          </div>
          <div className="space-y-2 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{photo.filename}</span>
              {photo.isExtra && (
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  추가
                </span>
              )}
            </div>
            {photo.pins.length > 0 ? (
              <ol className="space-y-1.5">
                {photo.pins.map((pin, i) => (
                  <li
                    key={pin.id}
                    onMouseEnter={() => setActivePin(pin.id)}
                    onMouseLeave={() => setActivePin(null)}
                    className="flex gap-2"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/80 text-[11px] font-bold text-white dark:bg-white/80 dark:text-black">
                      {i + 1}
                    </span>
                    <span className="min-w-0 break-words">{pin.body}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-neutral-500">보정 요청 없음</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
