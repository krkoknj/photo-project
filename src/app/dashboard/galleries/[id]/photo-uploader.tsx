"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/form";
import { completeUpload, requestUploads } from "../photo-actions";
import { completeRetouchUpload, requestRetouchUploads } from "../retouch-actions";
import { ALLOWED_PHOTO_TYPES, MAX_UPLOAD_BATCH, UPLOAD_CONCURRENCY } from "../photo-upload-rules";

type Failure = { name: string; reason: string };
type Progress = { total: number; done: number; bytesTotal: number; bytesSent: number };

// XHR을 쓰는 이유: fetch는 업로드 진행률을 알려주지 않는다.
function putWithProgress(url: string, file: File, onProgress: (sent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await worker(items[next++]);
    }),
  );
}

// 원본과 보정본은 같은 업로드 흐름을 쓰고 서버 액션만 다르다.
const ACTIONS = {
  original: { request: requestUploads, complete: completeUpload, label: "원본 사진" },
  retouched: { request: requestRetouchUploads, complete: completeRetouchUpload, label: "보정본" },
};

export function PhotoUploader({
  galleryId,
  disabledReason,
  kind = "original",
}: {
  galleryId: string;
  disabledReason?: string;
  kind?: keyof typeof ACTIONS;
}) {
  const actions = ACTIONS[kind];
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [dragging, setDragging] = useState(false);
  const uploading = progress !== null;

  // 업로드 중 페이지를 떠나지 않도록 경고
  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  async function upload(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length || uploading) return;

    const failed: Failure[] = [];
    const sentByFile = new Map<File, number>();
    const state: Progress = { total: files.length, done: 0, bytesTotal: files.reduce((s, f) => s + f.size, 0), bytesSent: 0 };
    const publish = () => setProgress({ ...state });
    setFailures([]);
    publish();

    for (let i = 0; i < files.length; i += MAX_UPLOAD_BATCH) {
      const batch = files.slice(i, i + MAX_UPLOAD_BATCH);
      const res = await actions.request(
        galleryId,
        batch.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      );

      if ("error" in res) {
        batch.forEach((f) => failed.push({ name: f.name, reason: res.error }));
        state.done += batch.length;
        publish();
        continue;
      }

      const jobs = res.tickets.map((ticket, j) => ({ ticket, file: batch[j] }));
      await runPool(jobs, UPLOAD_CONCURRENCY, async ({ ticket, file }) => {
        try {
          if ("error" in ticket) throw new Error(ticket.error);
          await putWithProgress(ticket.url, file, (sent) => {
            state.bytesSent += sent - (sentByFile.get(file) ?? 0);
            sentByFile.set(file, sent);
            publish();
          });
          const done = await actions.complete(galleryId, ticket.id, file.name);
          if ("error" in done) throw new Error(done.error);
        } catch (e) {
          const message = e instanceof Error ? e.message : "";
          failed.push({
            name: file.name,
            reason: message === "network" || message.startsWith("HTTP") ? "업로드 중 연결이 끊겼어요." : message,
          });
        } finally {
          state.done += 1;
          publish();
        }
      });
    }

    setProgress(null);
    setFailures(failed);
    router.refresh();
  }

  if (disabledReason) {
    return <p className="text-sm text-muted">{disabledReason}</p>;
  }

  const percent = progress ? Math.round((progress.bytesSent / Math.max(progress.bytesTotal, 1)) * 100) : 0;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragging ? "border-accent bg-accent/5" : "border-line-strong"
        }`}
      >
        {progress ? (
          <div className="w-full max-w-sm space-y-2">
            <p className="text-sm font-medium">
              업로드 중… {progress.done}/{progress.total}장 ({percent}%)
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-xs text-muted">업로드가 끝날 때까지 이 페이지를 닫지 마세요.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted">
              {actions.label}을 여기로 끌어다 놓거나
            </p>
            <button type="button" onClick={() => inputRef.current?.click()} className={buttonClass("primary", "text-sm")}>
              파일 선택
            </button>
            <p className="text-xs text-muted">JPG, PNG, WebP · 장당 50MB 이하</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={Object.keys(ALLOWED_PHOTO_TYPES).join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {failures.length > 0 && (
        <div role="alert" className="rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          <p className="font-medium">{failures.length}장을 올리지 못했어요.</p>
          <ul className="mt-1 max-h-40 list-inside list-disc overflow-auto">
            {failures.map((f, i) => (
              <li key={i}>
                {f.name}: {f.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
