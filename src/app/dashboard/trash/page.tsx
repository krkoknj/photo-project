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
      <Link href="/dashboard" className="eyebrow text-muted hover:text-accent">
        ← 내 갤러리
      </Link>
      <h1 className="display mt-6 mb-12 text-[clamp(3rem,8vw,6rem)]">휴지통</h1>

      {!galleries?.length ? (
        <p className="text-muted">휴지통이 비어 있어요.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {galleries.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-4 py-5">
              <div className="min-w-0">
                <Link href={`/dashboard/galleries/${g.id}`} className="display block truncate text-2xl hover:text-accent">
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
