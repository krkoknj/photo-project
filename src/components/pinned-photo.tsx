"use client";

import type { MouseEvent } from "react";

export type Pin = { id: string; x: number; y: number; body: string };

// 사진 위에 번호 핀을 겹쳐 그린다. 좌표는 사진 크기에 대한 0~1 비율이라 화면 크기와 무관하다.
// 크기는 부모가 정한다(너비 100%, 사진 비율 유지).
export function PinnedPhoto({
  src,
  alt,
  aspect,
  pins,
  draft,
  activePinId,
  onPlace,
}: {
  src: string;
  alt: string;
  aspect: number;
  pins: Pin[];
  draft?: { x: number; y: number } | null;
  activePinId?: string | null;
  onPlace?: (point: { x: number; y: number }) => void;
}) {
  function place(e: MouseEvent<HTMLDivElement>) {
    if (!onPlace) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    onPlace({ x: clamp((e.clientX - rect.left) / rect.width), y: clamp((e.clientY - rect.top) / rect.height) });
  }

  return (
    <div
      className={`relative w-full select-none ${onPlace ? "cursor-crosshair" : ""}`}
      style={{ aspectRatio: aspect }}
      onClick={place}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 짧게 만료되는 서명 URL이라 next/image 최적화를 거치지 않는다. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={false} className="absolute inset-0 h-full w-full object-contain" />
      {pins.map((pin, i) => (
        <PinMarker key={pin.id} x={pin.x} y={pin.y} label={String(i + 1)} active={pin.id === activePinId} />
      ))}
      {draft && <PinMarker x={draft.x} y={draft.y} label={String(pins.length + 1)} active draft />}
    </div>
  );
}

function PinMarker({ x, y, label, active, draft }: { x: number; y: number; label: string; active?: boolean; draft?: boolean }) {
  return (
    <span
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
      className={`pointer-events-none absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold shadow-md ${
        draft ? "animate-pulse bg-amber-500 text-white" : active ? "bg-amber-500 text-white" : "bg-black/70 text-white"
      }`}
    >
      {label}
    </span>
  );
}
