import { GALLERY_STATUS_LABEL, type GalleryStatus } from "@/lib/gallery";

// 작은 대문자 라벨 + 점. 고객의 행동이 필요한 단계(진행 중, 결제 대기)만 오렌지로 강조한다.
const tone: Record<GalleryStatus, string> = {
  draft: "text-muted before:bg-muted",
  open: "text-accent before:bg-accent",
  awaiting_payment: "text-accent before:bg-accent before:animate-pulse",
  submitted: "text-fg before:bg-fg",
  delivered: "text-ok before:bg-ok",
  expired: "text-muted/70 before:bg-muted/50",
};

export function StatusBadge({ status }: { status: GalleryStatus }) {
  return (
    <span
      className={`eyebrow inline-flex items-center gap-1.5 whitespace-nowrap before:block before:h-1.5 before:w-1.5 before:rounded-full ${tone[status]}`}
    >
      {GALLERY_STATUS_LABEL[status]}
    </span>
  );
}
