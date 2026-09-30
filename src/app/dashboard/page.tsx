import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { formatDateKst, type GalleryStatus } from "@/lib/gallery";
import { presignView } from "@/lib/storage";
import { StatusBadge } from "./status-badge";

export const metadata: Metadata = { title: "내 갤러리" };

// 작가가 챙겨야 할 단계
const NEEDS_ACTION: GalleryStatus[] = ["awaiting_payment", "submitted"];

export default async function DashboardPage() {
  const { supabase, userId } = await requireUser();

  const [{ data: galleries }, { count: trashCount }, { data: me }] = await Promise.all([
    supabase
      .from("galleries")
      .select("id, title, client_name, status, expires_at, created_at, photos(count)")
      .is("trashed_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("galleries").select("id", { count: "exact", head: true }).not("trashed_at", "is", null),
    supabase.from("photographers").select("display_name").eq("id", userId).single(),
  ]);

  // 갤러리마다 첫 사진을 표지로
  const covers = new Map(
    await Promise.all(
      (galleries ?? []).map(async (g) => {
        const { data } = await supabase
          .from("photos")
          .select("thumb_key")
          .eq("gallery_id", g.id)
          .eq("processing_status", "ready")
          .order("sort_order")
          .order("filename")
          .limit(1)
          .maybeSingle();
        return [g.id, data?.thumb_key ? await presignView(data.thumb_key) : null] as const;
      }),
    ),
  );

  const todo = (galleries ?? []).filter((g) => NEEDS_ACTION.includes(g.status)).length;
  const open = (galleries ?? []).filter((g) => g.status === "open").length;

  return (
    <>
      <section className="mb-6">
        <p className="text-sm font-medium text-muted">{me?.display_name ? `${me.display_name} 작가님` : "작가님"}, 안녕하세요</p>
        <h1 className="display mt-1 text-[1.75rem]">
          {todo > 0 ? (
            <>
              확인할 갤러리가 <span className="text-accent">{todo}개</span> 있어요
            </>
          ) : (
            "오늘도 좋은 촬영 되세요"
          )}
        </h1>
      </section>

      <div className="mb-8 grid grid-cols-3 gap-2">
        {[
          { label: "전체", value: galleries?.length ?? 0 },
          { label: "셀렉 진행 중", value: open },
          { label: "확인 필요", value: todo, accent: true },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl px-4 py-3.5 ${s.accent && s.value ? "bg-accent-soft" : "bg-panel"}`}>
            <p className="text-xs font-medium text-muted">{s.label}</p>
            <p className={`mt-0.5 text-2xl font-extrabold ${s.accent && s.value ? "text-accent" : ""}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">내 갤러리</h2>
        <div className="hidden sm:block">
          <Link href="/dashboard/galleries/new" className={buttonClass("primary", "min-h-10 px-4 text-sm")}>
            + 새 갤러리
          </Link>
        </div>
      </div>

      {!galleries?.length ? (
        <Link
          href="/dashboard/galleries/new"
          className="flex flex-col items-center rounded-3xl bg-panel px-6 py-14 text-center transition-colors hover:bg-panel-2"
        >
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-2xl text-white">+</span>
          <p className="font-extrabold">첫 갤러리를 만들어볼까요?</p>
          <p className="mt-1 text-sm text-muted">원본을 올리고 고객에게 링크를 보내면 돼요.</p>
        </Link>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {galleries.map((g) => {
            const cover = covers.get(g.id);
            return (
              <li key={g.id}>
                <Link
                  href={`/dashboard/galleries/${g.id}`}
                  className="flex gap-4 rounded-3xl border border-line bg-ink p-3 transition-all hover:border-line-strong hover:shadow-[0_8px_24px_-12px_rgb(0_0_0/0.18)] active:scale-[0.99]"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-panel">
                    {cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 pr-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-extrabold">{g.title}</p>
                      <StatusBadge status={g.status} />
                    </div>
                    <p className="truncate text-[0.8125rem] text-muted">
                      {g.client_name ?? "고객 미지정"} · 사진 {g.photos[0]?.count ?? 0}장
                    </p>
                    <p className="text-xs text-muted/80">
                      {g.expires_at ? `${formatDateKst(g.expires_at)}까지` : "만료 없음"}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {!!trashCount && (
        <Link href="/dashboard/trash" className="mt-6 flex items-center justify-between rounded-2xl bg-panel px-4 py-3.5 text-sm font-bold text-fg/70">
          휴지통 <span className="text-muted">{trashCount} ›</span>
        </Link>
      )}
    </>
  );
}
