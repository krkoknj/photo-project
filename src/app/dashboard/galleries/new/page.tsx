import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_BASE_SELECT_COUNT, DEFAULT_EXPIRY_DAYS, dateInputFromToday } from "@/lib/gallery";
import { createGallery } from "../actions";
import { GalleryForm } from "../gallery-form";

export const metadata: Metadata = { title: "새 갤러리" };

export default function NewGalleryPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/dashboard" className="eyebrow text-muted hover:text-accent">
        ← 내 갤러리
      </Link>
      <h1 className="display mt-6 mb-12 text-[clamp(3rem,8vw,6rem)]">새 <span className="text-accent">갤러리</span></h1>
      <GalleryForm
        mode="create"
        action={createGallery}
        defaults={{
          title: "",
          clientName: "",
          clientEmail: "",
          baseSelectCount: DEFAULT_BASE_SELECT_COUNT,
          extraPriceKrw: 0,
          expiresOn: dateInputFromToday(DEFAULT_EXPIRY_DAYS),
        }}
      />
    </div>
  );
}
