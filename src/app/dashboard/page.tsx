import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { formatDateKst } from "@/lib/gallery";
import { StatusBadge } from "./status-badge";

export const metadata: Metadata = { title: "내 갤러리" };

export default async function DashboardPage() {
  const { supabase } = await requireUser();

  const [{ data: galleries }, { count: trashCount }] = await Promise.all([
    supabase
      .from("galleries")
      .select("id, title, client_name, status, expires_at, created_at, photos(count)")
      .is("trashed_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("galleries").select("id", { count: "exact", head: true }).not("trashed_at", "is", null),
  ]);

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">내 갤러리</h1>
        <Link href="/dashboard/galleries/new" className={buttonClass("primary", "text-sm")}>
          + 새 갤러리
        </Link>
      </div>

      {!galleries?.length ? (
        <div className="rounded-2xl border border-dashed border-black/20 px-6 py-16 text-center text-neutral-600 dark:border-white/20 dark:text-neutral-400">
          <p className="mb-4">아직 갤러리가 없어요.</p>
          <Link href="/dashboard/galleries/new" className="font-medium underline">
            첫 갤러리 만들기
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-black/10 rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/10">
          {galleries.map((g) => (
            <li key={g.id}>
              <Link
                href={`/dashboard/galleries/${g.id}`}
                className="flex flex-col gap-1 px-4 py-4 hover:bg-black/[.03] sm:flex-row sm:items-center sm:justify-between dark:hover:bg-white/[.04]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{g.title}</span>
                    <StatusBadge status={g.status} />
                  </div>
                  <p className="text-sm text-neutral-500">
                    {g.client_name ?? "고객 미지정"} · 사진 {g.photos[0]?.count ?? 0}장
                  </p>
                </div>
                <p className="shrink-0 text-sm text-neutral-500">
                  {g.expires_at ? `${formatDateKst(g.expires_at)} 만료` : "만료 없음"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!!trashCount && (
        <p className="mt-6 text-right text-sm">
          <Link href="/dashboard/trash" className="text-neutral-500 hover:underline">
            휴지통 ({trashCount})
          </Link>
        </p>
      )}
    </>
  );
}
