import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { formatDateKst } from "@/lib/gallery";
import { restoreGallery } from "../galleries/actions";

export const metadata: Metadata = { title: "휴지통" };

export default async function TrashPage() {
  const { supabase } = await requireUser();
  const { data: galleries } = await supabase
    .from("galleries")
    .select("id, title, client_name, trashed_at")
    .not("trashed_at", "is", null)
    .order("trashed_at", { ascending: false });

  return (
    <>
      <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">
        ← 내 갤러리
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">휴지통</h1>

      {!galleries?.length ? (
        <p className="text-neutral-500">휴지통이 비어 있어요.</p>
      ) : (
        <ul className="divide-y divide-black/10 rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/10">
          {galleries.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-4 px-4 py-4">
              <div className="min-w-0">
                <Link href={`/dashboard/galleries/${g.id}`} className="block truncate font-medium hover:underline">
                  {g.title}
                </Link>
                <p className="text-sm text-neutral-500">
                  {g.client_name ?? "고객 미지정"} · {formatDateKst(g.trashed_at!)} 이동
                </p>
              </div>
              <form action={restoreGallery.bind(null, g.id)}>
                <button type="submit" className={buttonClass("secondary", "text-sm")}>
                  복원
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
