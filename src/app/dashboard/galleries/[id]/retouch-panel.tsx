"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/form";
import type { Enums } from "@/lib/supabase/database.types";
import { assignRetouched, deliverGallery, removeRetouched, retryRetouched } from "../retouch-actions";

export type RetouchedItem = {
  id: string;
  filename: string;
  photoId: string | null;
  status: Enums<"photo_processing_status">;
  thumbUrl: string | null;
};

type PhotoOption = { id: string; filename: string; selected: boolean };

const POLL_MS = 3000;

export function RetouchPanel({
  galleryId,
  delivered,
  files,
  photos,
}: {
  galleryId: string;
  delivered: boolean;
  files: RetouchedItem[];
  photos: PhotoOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const processing = files.filter((f) => f.status === "pending" || f.status === "processing").length;
  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [processing, router]);

  const photoById = new Map(photos.map((p) => [p.id, p]));
  // 원본 파일명 순으로 보여준다 (보정본 파일명은 제각각이라).
  const matched = files
    .filter((f) => f.photoId)
    .sort((a, b) => (photoById.get(a.photoId!)?.filename ?? "").localeCompare(photoById.get(b.photoId!)?.filename ?? ""));
  const unmatched = files.filter((f) => !f.photoId);
  const selected = photos.filter((p) => p.selected);
  const covered = new Set(matched.map((f) => f.photoId));
  const missing = selected.filter((p) => !covered.has(p.id));

  async function deliver() {
    const warning = missing.length ? `\n고른 사진 중 ${missing.length}장은 아직 보정본이 없어요.` : "";
    if (!window.confirm(`보정본 ${matched.length}장을 고객에게 전달할까요?${warning}`)) return;
    setBusy(true);
    const res = await deliverGallery(galleryId);
    setBusy(false);
    setMessage("error" in res ? { tone: "error", text: res.error } : { tone: "ok", text: "고객에게 전달했어요." });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 bg-panel p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">
            고른 사진 {selected.length}장 중 {selected.length - missing.length}장 보정본 준비
            {matched.length > selected.length - missing.length &&
              ` (+ 고르지 않은 사진 ${matched.length - (selected.length - missing.length)}장)`}
          </p>
          {processing > 0 && <p className="text-muted">미리보기 만드는 중… {processing}장</p>}
          {delivered && <p className="text-ok">전달됨 · 새로 올린 보정본도 바로 고객에게 보여요.</p>}
        </div>
        {!delivered && (
          <button type="button" onClick={deliver} disabled={busy || matched.length === 0} className={buttonClass("primary", "shrink-0 text-sm")}>
            {busy ? "전달 중…" : "고객에게 전달"}
          </button>
        )}
      </div>
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`rounded-xl px-4 py-3 text-sm ${
            message.tone === "error"
              ? "border border-danger/40 bg-danger/10 text-danger"
              : "border border-ok/40 bg-ok/10 text-ok"
          }`}
        >
          {message.text}
        </p>
      )}

      {missing.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">
            아직 보정본이 없는 사진 {missing.length}장
          </summary>
          <p className="mt-2 break-words text-muted">
            {missing.map((p) => p.filename.replace(/\.[^.]+$/, "")).join(", ")}
          </p>
        </details>
      )}

      {unmatched.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-accent">
            원본을 찾지 못한 보정본 {unmatched.length}장 · 어느 사진인지 골라주세요
          </h3>
          <ul className="space-y-2">
            {unmatched.map((file) => (
              <UnmatchedRow key={file.id} galleryId={galleryId} file={file} photos={photos} />
            ))}
          </ul>
        </div>
      )}

      {matched.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {matched.map((file) => (
            <li key={file.id} className="group relative aspect-square overflow-hidden rounded-xl bg-panel">
              <Thumb file={file} galleryId={galleryId} />
              <p className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
                {photoById.get(file.photoId!)?.filename ?? file.filename}
              </p>
              <form
                action={removeRetouched.bind(null, galleryId, file.id)}
                className="absolute top-1 right-1 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <button
                  type="submit"
                  aria-label={`${file.filename} 빼기`}
                  onClick={(e) => {
                    if (!window.confirm(`보정본 ${file.filename}을(를) 뺄까요?`)) e.preventDefault();
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white"
                >
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Thumb({ file, galleryId }: { file: RetouchedItem; galleryId: string }) {
  if (file.thumbUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={file.thumbUrl} alt={file.filename} loading="lazy" className="h-full w-full object-cover" />;
  }
  return (
    <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted">
      {file.status === "failed" ? (
        <form action={retryRetouched.bind(null, galleryId, file.id)}>
          <p className="mb-1 text-danger">처리 실패</p>
          <button type="submit" className="underline">
            다시 시도
          </button>
        </form>
      ) : (
        "처리 중…"
      )}
    </div>
  );
}

function UnmatchedRow({ galleryId, file, photos }: { galleryId: string; file: RetouchedItem; photos: PhotoOption[] }) {
  const [photoId, setPhotoId] = useState("");
  // 고른 사진을 먼저 보여준다.
  const ordered = [...photos].sort((a, b) => Number(b.selected) - Number(a.selected));

  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-accent-soft p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-panel">
          <Thumb file={file} galleryId={galleryId} />
        </div>
        <span className="truncate text-sm">{file.filename}</span>
      </div>
      <div className="flex gap-2">
        <select
          value={photoId}
          onChange={(e) => setPhotoId(e.target.value)}
          aria-label={`${file.filename}의 원본`}
          className="min-w-0 flex-1 rounded-xl border border-line-strong bg-ink px-3 py-2.5 text-sm sm:w-48"
        >
          <option value="">원본 선택…</option>
          {ordered.map((p) => (
            <option key={p.id} value={p.id}>
              {p.selected ? "✓ " : ""}
              {p.filename}
            </option>
          ))}
        </select>
        <form action={assignRetouched.bind(null, galleryId, file.id, photoId || null)}>
          <button type="submit" disabled={!photoId} className={buttonClass("secondary", "text-sm")}>
            연결
          </button>
        </form>
        <form action={removeRetouched.bind(null, galleryId, file.id)}>
          <button type="submit" aria-label={`${file.filename} 빼기`} className={buttonClass("secondary", "text-sm")}>
            빼기
          </button>
        </form>
      </div>
    </li>
  );
}
