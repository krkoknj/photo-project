import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_BASE_SELECT_COUNT, DEFAULT_EXPIRY_DAYS, dateInputFromToday } from "@/lib/gallery";
import { createGallery } from "../actions";
import { GalleryForm } from "../gallery-form";

export const metadata: Metadata = { title: "새 갤러리" };

export default function NewGalleryPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">
        ← 내 갤러리
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">새 갤러리</h1>
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
