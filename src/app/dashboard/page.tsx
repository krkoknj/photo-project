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
      <div className="mb-12 flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-3 text-muted">Galleries — {String(galleries?.length ?? 0).padStart(2, "0")}</p>
          <h1 className="display text-[clamp(3rem,8vw,6.5rem)]">
            내 <span className="text-accent">갤러리</span>
          </h1>
        </div>
        {/* 모바일은 하단 탭의 + 버튼을 쓴다 */}
        <div className="hidden sm:block">
          <Link href="/dashboard/galleries/new" className={buttonClass("primary")}>
            새 갤러리 <span aria-hidden>↘</span>
          </Link>
        </div>
      </div>

      {!galleries?.length ? (
        <Link href="/dashboard/galleries/new" className="group block border-y border-line py-16">
          <p className="eyebrow mb-4 text-muted">아직 갤러리가 없어요</p>
          <p className="display text-5xl transition-colors group-hover:text-accent">첫 갤러리 만들기 ↗</p>
        </Link>
      ) : (
        <ul className="border-t border-line">
          {galleries.map((g, i) => (
            <li key={g.id} className="border-b border-line">
              <Link
                href={`/dashboard/galleries/${g.id}`}
                className="group grid grid-cols-[2.5rem_1fr] gap-x-4 gap-y-2 py-6 transition-colors sm:grid-cols-[4rem_1fr_auto] sm:items-center sm:gap-x-8"
              >
                <span className="eyebrow pt-2 text-muted sm:pt-0">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <p className="display truncate text-3xl transition-colors group-hover:text-accent sm:text-4xl">{g.title}</p>
                  <p className="eyebrow mt-2 text-muted">
                    {g.client_name ?? "고객 미지정"} · 사진 {g.photos[0]?.count ?? 0}장 ·{" "}
                    {g.expires_at ? `${formatDateKst(g.expires_at)} 만료` : "만료 없음"}
                  </p>
                </div>
                <div className="col-start-2 flex items-center gap-4 sm:col-start-3">
                  <StatusBadge status={g.status} />
                  <span className="hidden text-xl text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent sm:inline" aria-hidden>
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!!trashCount && (
        <p className="mt-8 text-right">
          <Link href="/dashboard/trash" className="eyebrow text-muted hover:text-accent">
            휴지통 ({trashCount}) →
          </Link>
        </p>
      )}
    </>
  );
}
