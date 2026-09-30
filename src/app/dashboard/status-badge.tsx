import { GALLERY_STATUS_LABEL, type GalleryStatus } from "@/lib/gallery";

const tone: Record<GalleryStatus, string> = {
  draft: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  open: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  awaiting_payment: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  submitted: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  delivered: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  expired: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500",
};

export function StatusBadge({ status }: { status: GalleryStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tone[status]}`}>
      {GALLERY_STATUS_LABEL[status]}
    </span>
  );
}
