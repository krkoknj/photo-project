import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_BASE_SELECT_COUNT, DEFAULT_EXPIRY_DAYS, dateInputFromToday } from "@/lib/gallery";
import { createGallery } from "../actions";
import { GalleryForm } from "../gallery-form";

export const metadata: Metadata = { title: "새 갤러리" };

export default function NewGalleryPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-fg">
        ‹ 내 갤러리
      </Link>
      <h1 className="display mt-4 mb-8 text-[1.75rem]">새 갤러리 만들기</h1>
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
