import type { Enums } from "@/lib/supabase/database.types";

export type GalleryStatus = Enums<"gallery_status">;

export const GALLERY_STATUS_LABEL: Record<GalleryStatus, string> = {
  draft: "비공개",
  open: "셀렉 진행 중",
  awaiting_payment: "결제 대기",
  submitted: "셀렉 완료",
  delivered: "전달 완료",
  expired: "만료",
};

// 고객이 셀렉을 제출하기 전까지만 셀렉 장수·가격을 바꿀 수 있다.
export function isSelectionLocked(status: GalleryStatus) {
  return status !== "draft" && status !== "open";
}

export const DEFAULT_BASE_SELECT_COUNT = 30;
export const DEFAULT_EXPIRY_DAYS = 30;

// 날짜는 한국 시간 기준으로 다룬다.
const TIME_ZONE = "Asia/Seoul";

/** "YYYY-MM-DD" → 한국 시간 그날 23:59:59 (ISO) */
export function endOfDayKst(date: string) {
  return new Date(`${date}T23:59:59.999+09:00`).toISOString();
}

/** ISO → "YYYY-MM-DD" (한국 시간, <input type="date"> 값) */
export function toDateInputKst(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(iso));
}

/** 오늘부터 days일 뒤 "YYYY-MM-DD" (한국 시간) */
export function dateInputFromToday(days: number) {
  return toDateInputKst(new Date(Date.now() + days * 86_400_000).toISOString());
}

export function formatDateKst(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: TIME_ZONE, dateStyle: "medium" }).format(new Date(iso));
}

export function formatKrw(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function shareUrl(origin: string, shareToken: string) {
  return `${origin}/g/${shareToken}`;
}
