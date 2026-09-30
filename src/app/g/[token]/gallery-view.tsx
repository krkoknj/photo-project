"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PinnedPhoto } from "@/components/pinned-photo";
import { formatKrw, type GalleryStatus } from "@/lib/gallery";
import { MAX_PIN_BODY, extraAmount, extraCount, selectionLimit } from "@/lib/selection";
import {
  addPin,
  reopenForPayment,
  removePin,
  startTossPayment,
  submitSelection,
  toggleSelection,
  type SavedPin,
} from "./actions";
import { loadTossPayments } from "./toss-sdk";

export type ClientPhoto = {
  id: string;
  filename: string;
  thumbUrl: string;
  previewUrl: string;
  width: number | null;
  height: number | null;
};

type GalleryRules = { status: GalleryStatus; base_select_count: number; extra_price_krw: number };

// 서명 URL은 1시간 뒤 만료되므로 그 전에 페이지 데이터를 새로 받는다.
const URL_REFRESH_MS = 50 * 60 * 1000;
const SWIPE_THRESHOLD = 50;
const TOAST_MS = 3000;

export function GalleryView({
  token,
  photos,
  gallery,
  initialSelected,
  initialPins,
  canPayByCard,
}: {
  token: string;
  canPayByCard: boolean;
  photos: ClientPhoto[];
  gallery: GalleryRules;
  initialSelected: string[];
  initialPins: SavedPin[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Set(initialSelected));
  const [pins, setPins] = useState(initialPins);
  const [filter, setFilter] = useState<"all" | "selected">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const editable = gallery.status === "open";
  const limit = selectionLimit(gallery);
  const visible = filter === "selected" ? photos.filter((p) => selected.has(p.id)) : photos;
  const openIndex = openId ? visible.findIndex((p) => p.id === openId) : -1;

  useEffect(() => {
    const timer = setTimeout(() => router.refresh(), URL_REFRESH_MS);
    return () => clearTimeout(timer);
  }, [router, photos]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // 휴대폰 뒤로가기로 뷰어를 닫을 수 있도록 기록을 하나 쌓는다.
  const open = (id: string) => {
    history.pushState({ viewer: true }, "");
    setOpenId(id);
  };
  useEffect(() => {
    const onPop = () => setOpenId(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // "고른 사진" 보기에서 보고 있던 사진의 선택을 빼면 목록에서 사라지므로 뷰어를 닫는다.
  const lostOpenPhoto = openId !== null && openIndex === -1;
  useEffect(() => {
    if (lostOpenPhoto) history.back();
  }, [lostOpenPhoto]);

  async function toggle(photoId: string) {
    if (!editable) return;
    const next = !selected.has(photoId);
    if (next && limit !== null && selected.size >= limit) {
      setToast(`최대 ${limit}장까지 고를 수 있어요.`);
      return;
    }
    const pinCount = pins.filter((p) => p.photoId === photoId).length;
    if (
      !next &&
      pinCount > 0 &&
      !window.confirm(`보정 요청 ${pinCount}개가 있어요. 선택을 빼면 요청은 작가님께 전달되지 않아요. 뺄까요?`)
    ) {
      return;
    }
    const apply = (on: boolean) =>
      setSelected((prev) => {
        const s = new Set(prev);
        if (on) s.add(photoId);
        else s.delete(photoId);
        return s;
      });

    apply(next); // 먼저 화면에 반영하고, 실패하면 되돌린다.
    const res = await toggleSelection(token, photoId, next);
    if (!res.ok) {
      apply(!next);
      setToast(res.error);
    }
  }

  async function submit() {
    const count = selected.size;
    const extra = extraCount(count, gallery);
    const message =
      extra > 0
        ? `${count}장을 제출할까요?\n기본 ${gallery.base_select_count}장을 넘긴 ${extra}장은 추가 결제(${formatKrw(extraAmount(count, gallery))})가 필요해요.`
        : `${count}장을 제출할까요?\n제출하면 고른 사진과 보정 요청을 바꿀 수 없어요.`;
    if (!window.confirm(message)) return;

    setBusy(true);
    const res = await submitSelection(token);
    setBusy(false);
    if (!res.ok) setToast(res.error);
    router.refresh();
  }

  async function reopen() {
    setBusy(true);
    const res = await reopenForPayment(token);
    setBusy(false);
    if (!res.ok) setToast(res.error);
    router.refresh();
  }

  // 서버가 주문(금액)을 만든 뒤 토스 결제창을 연다. 결제 결과는 successUrl/failUrl로 돌아온다.
  async function payWithCard() {
    setBusy(true);
    const res = await startTossPayment(token);
    if (!res.ok) {
      setBusy(false);
      setToast(res.error);
      return;
    }
    const { checkout } = res;
    try {
      const TossPayments = await loadTossPayments();
      await TossPayments(checkout.clientKey)
        .payment({ customerKey: crypto.randomUUID() })
        .requestPayment({
          method: "CARD",
          amount: { currency: "KRW", value: checkout.amount },
          orderId: checkout.orderId,
          orderName: checkout.orderName,
          customerName: checkout.customerName,
          successUrl: checkout.successUrl,
          failUrl: checkout.failUrl,
        });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== "USER_CANCEL") setToast("결제창을 열지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-3 flex gap-2 px-4 sm:px-0">
        {(["all", "selected"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm ${
              filter === f ? "bg-fg text-ink" : "border border-line-strong text-muted hover:text-fg"
            }`}
          >
            {f === "all" ? `전체 ${photos.length}` : `고른 사진 ${selected.size}`}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted">아직 고른 사진이 없어요.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2 lg:grid-cols-6">
          {visible.map((photo) => {
            const isSelected = selected.has(photo.id);
            const pinCount = pins.filter((p) => p.photoId === photo.id).length;
            return (
              <li key={photo.id} className="relative">
                <button
                  type="button"
                  onClick={() => open(photo.id)}
                  className="block aspect-square w-full overflow-hidden bg-panel"
                  aria-label={`${photo.filename} 크게 보기`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbUrl}
                    alt={photo.filename}
                    loading="lazy"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`h-full w-full object-cover transition ${isSelected ? "opacity-80" : ""}`}
                  />
                </button>
                {isSelected && <span className="pointer-events-none absolute inset-0 ring-4 ring-inset ring-accent" />}
                {pinCount > 0 && (
                  <span className="pointer-events-none absolute bottom-1 left-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[11px] text-white">
                    요청 {pinCount}
                  </span>
                )}
                {(editable || isSelected) && (
                  <button
                    type="button"
                    onClick={() => toggle(photo.id)}
                    disabled={!editable}
                    aria-pressed={isSelected}
                    aria-label={isSelected ? `${photo.filename} 선택 해제` : `${photo.filename} 선택`}
                    className={`absolute top-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold ${
                      isSelected ? "border-accent bg-accent text-ink" : "border-white bg-black/30 text-transparent"
                    }`}
                  >
                    ✓
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* 하단 고정 바가 마지막 줄을 가리지 않도록 여백 */}
      <div className="h-24" />

      <SelectionBar
        gallery={gallery}
        count={selected.size}
        limit={limit}
        busy={busy}
        onSubmit={submit}
        onReopen={reopen}
        onPay={canPayByCard ? payWithCard : undefined}
      />

      {openIndex >= 0 && (
        <Viewer
          photos={visible}
          index={openIndex}
          onIndexChange={(i) => setOpenId(visible[i].id)}
          onClose={() => history.back()}
          editable={editable}
          selected={selected}
          onToggle={toggle}
          pins={pins}
          onPinAdded={(pin) => setPins((prev) => [...prev, pin])}
          onPinRemoved={(id) => setPins((prev) => prev.filter((p) => p.id !== id))}
          onError={setToast}
          token={token}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-sm rounded-2xl bg-fg px-4 py-3.5 text-center text-sm font-medium text-ink shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}

function SelectionBar({
  gallery,
  count,
  limit,
  busy,
  onSubmit,
  onReopen,
  onPay,
}: {
  gallery: GalleryRules;
  count: number;
  limit: number | null;
  busy: boolean;
  onSubmit: () => void;
  onReopen: () => void;
  onPay?: () => void;
}) {
  const extra = extraCount(count, gallery);
  let summary: React.ReactNode;
  let action: React.ReactNode = null;

  if (gallery.status === "open") {
    summary = (
      <>
        <strong className="text-base tabular-nums">
          {count}
          {limit !== null ? ` / ${limit}` : ""}장
        </strong>{" "}
        골랐어요
        {gallery.base_select_count > 0 && limit === null && (
          <span className="block text-xs text-muted">
            {extra > 0
              ? `기본 ${gallery.base_select_count}장 + 추가 ${extra}장 (${formatKrw(extraAmount(count, gallery))})`
              : `기본 ${gallery.base_select_count}장 포함`}
          </span>
        )}
      </>
    );
    action = (
      <button
        type="button"
        onClick={onSubmit}
        disabled={busy || count === 0}
        className="rounded-xl bg-fg px-6 py-3 font-bold text-ink disabled:opacity-30"
      >
        {busy ? "제출 중…" : "제출하기"}
      </button>
    );
  } else if (gallery.status === "awaiting_payment") {
    summary = (
      <>
        <strong>추가 {extra}장 결제가 필요해요</strong>
        <span className="block text-xs text-muted">{formatKrw(extraAmount(count, gallery))}</span>
      </>
    );
    action = (
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onReopen}
          disabled={busy}
          className="rounded-xl bg-panel px-4 py-3 text-sm font-bold disabled:opacity-40"
        >
          다시 고르기
        </button>
        {onPay && (
          <button
            type="button"
            onClick={onPay}
            disabled={busy}
            className="rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? "여는 중…" : "카드 결제"}
          </button>
        )}
      </div>
    );
  } else if (gallery.status === "delivered") {
    summary = (
      <>
        <strong>보정본이 도착했어요</strong>
        <span className="block text-xs text-muted">위에서 한 장씩 또는 전체를 받을 수 있어요.</span>
      </>
    );
  } else {
    summary = (
      <>
        <strong>{count}장 셀렉을 제출했어요</strong>
        <span className="block text-xs text-muted">보정본이 준비되면 알려드릴게요.</span>
      </>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-sm sm:px-6">
        <p className="min-w-0">{summary}</p>
        {action}
      </div>
    </div>
  );
}

// 부모 영역에 들어가는 가장 큰 크기로 사진 비율을 유지한다.
function useFitSize(aspect: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize(width / height > aspect ? { width: height * aspect, height } : { width, height: width / aspect });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [aspect]);
  return { ref, size };
}

function Viewer({
  token,
  photos,
  index,
  onIndexChange,
  onClose,
  editable,
  selected,
  onToggle,
  pins,
  onPinAdded,
  onPinRemoved,
  onError,
}: {
  token: string;
  photos: ClientPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  editable: boolean;
  selected: Set<string>;
  onToggle: (photoId: string) => void;
  pins: SavedPin[];
  onPinAdded: (pin: SavedPin) => void;
  onPinRemoved: (pinId: string) => void;
  onError: (message: string) => void;
}) {
  const photo = photos[index];
  const isSelected = selected.has(photo.id);
  const photoPins = pins.filter((p) => p.photoId === photo.id);
  const aspect = photo.width && photo.height ? photo.width / photo.height : 3 / 2;
  const { ref: stageRef, size } = useFitSize(aspect);

  const [pinMode, setPinMode] = useState(false);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const composing = pinMode || draft !== null;

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next < 0 || next >= photos.length) return;
      // 사진을 넘기면 작성 중이던 핀은 버린다.
      setPinMode(false);
      setDraft(null);
      setBody("");
      onIndexChange(next);
    },
    [index, photos.length, onIndexChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;
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

  useEffect(() => {
    [photos[index - 1], photos[index + 1]].forEach((p) => {
      if (p) new Image().src = p.previewUrl;
    });
  }, [index, photos]);

  async function savePin() {
    if (!draft) return;
    setSaving(true);
    const res = await addPin(token, { photoId: photo.id, x: draft.x, y: draft.y, body });
    setSaving(false);
    if (!res.ok) return onError(res.error);
    onPinAdded(res.pin);
    setDraft(null);
    setPinMode(false);
    setBody("");
  }

  async function deletePin(pinId: string) {
    if (!window.confirm("이 보정 요청을 지울까요?")) return;
    const res = await removePin(token, pinId);
    if (!res.ok) return onError(res.error);
    onPinRemoved(pinId);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="사진 크게 보기"
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX.current === null || composing) return;
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

      <div ref={stageRef} className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        {size && (
          <div style={{ width: size.width }}>
            <PinnedPhoto
              key={photo.id}
              src={photo.previewUrl}
              alt={photo.filename}
              aspect={aspect}
              pins={photoPins}
              draft={draft}
              onPlace={pinMode ? (point) => setDraft(point) : undefined}
            />
          </div>
        )}
        {!composing && index > 0 && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="이전 사진"
            className="absolute top-1/2 left-2 hidden h-12 w-12 -translate-y-1/2 rounded-full bg-white/10 text-2xl sm:block"
          >
            ‹
          </button>
        )}
        {!composing && index < photos.length - 1 && (
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

      <div className="max-h-[40dvh] shrink-0 overflow-y-auto border-t border-white/10 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-sm">
        {draft ? (
          <div className="space-y-2">
            <label className="block text-white/70" htmlFor="pin-body">
              {photoPins.length + 1}번 위치에 어떻게 보정할지 적어주세요
            </label>
            <textarea
              id="pin-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={MAX_PIN_BODY}
              rows={2}
              autoFocus
              placeholder="예: 여기 턱선 정리해주세요"
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-base outline-none placeholder:text-white/40"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft(null);
                  setPinMode(false);
                  setBody("");
                }}
                className="rounded-xl px-4 py-2.5 text-white/70"
              >
                취소
              </button>
              <button
                type="button"
                onClick={savePin}
                disabled={saving || !body.trim()}
                className="rounded-xl bg-accent px-4 py-2.5 font-bold text-white disabled:opacity-40"
              >
                {saving ? "저장 중…" : "요청 남기기"}
              </button>
            </div>
          </div>
        ) : pinMode ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-accent">사진에서 보정할 부분을 눌러주세요</p>
            <button type="button" onClick={() => setPinMode(false)} className="shrink-0 px-3 py-2 text-white/70">
              취소
            </button>
          </div>
        ) : (
          <>
            {editable && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onToggle(photo.id)}
                  aria-pressed={isSelected}
                  className={`flex-1 rounded-xl px-4 py-3 font-bold ${
                    isSelected ? "bg-accent text-ink" : "bg-white/15"
                  }`}
                >
                  {isSelected ? "✓ 고른 사진" : "이 사진 고르기"}
                </button>
                {isSelected && (
                  <button type="button" onClick={() => setPinMode(true)} className="flex-1 rounded-xl bg-white/15 px-4 py-3 font-bold">
                    보정 요청 추가
                  </button>
                )}
              </div>
            )}
            {photoPins.length > 0 && (
              <ol className="mt-3 space-y-2">
                {photoPins.map((pin, i) => (
                  <li key={pin.id} className="flex items-start gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                      {i + 1}
                    </span>
                    <p className="min-w-0 flex-1 break-words pt-0.5">{pin.body}</p>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => deletePin(pin.id)}
                        aria-label={`${i + 1}번 요청 지우기`}
                        className="shrink-0 px-2 text-white/50"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {!editable && !photoPins.length && (
              <p className="text-white/50">{isSelected ? "고른 사진이에요." : "고르지 않은 사진이에요."}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
