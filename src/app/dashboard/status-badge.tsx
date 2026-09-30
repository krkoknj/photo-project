import { GALLERY_STATUS_LABEL, type GalleryStatus } from "@/lib/gallery";

// 둥근 칩. 고객의 행동을 기다리는 단계(진행 중, 결제 대기)만 오렌지로 강조한다.
const tone: Record<GalleryStatus, string> = {
  draft: "bg-panel text-muted",
  open: "bg-accent-soft text-accent",
  awaiting_payment: "bg-accent text-white",
  submitted: "bg-fg text-ink",
  delivered: "bg-ok/10 text-ok",
  expired: "bg-panel text-muted/70",
};

export function StatusBadge({ status }: { status: GalleryStatus }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${tone[status]}`}>
      {GALLERY_STATUS_LABEL[status]}
    </span>
  );
}
