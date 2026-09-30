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
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-fg">
        ‹ 내 갤러리
      </Link>
      <h1 className="display mt-4 mb-6 text-[1.75rem]">휴지통</h1>

      {!galleries?.length ? (
        <p className="text-muted">휴지통이 비어 있어요.</p>
      ) : (
        <ul className="divide-y divide-line">
          {galleries.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-4 py-5">
              <div className="min-w-0">
                <Link href={`/dashboard/galleries/${g.id}`} className="block truncate font-extrabold hover:text-accent">
                  {g.title}
                </Link>
                <p className="text-sm text-muted">
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
