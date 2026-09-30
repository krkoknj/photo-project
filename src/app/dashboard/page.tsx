import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../(auth)/actions";

export const metadata: Metadata = { title: "대시보드" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect("/login");

  const { data: photographer } = await supabase
    .from("photographers")
    .select("display_name, email")
    .eq("id", userId)
    .single();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10 sm:px-6">
        <span className="font-semibold tracking-tight">셀렉갤러리</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">
            {photographer?.display_name || photographer?.email}
          </span>
          <form action={logout}>
            <button type="submit" className="rounded-lg border border-black/15 px-3 py-1.5 dark:border-white/20">
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-semibold">내 갤러리</h1>
        <div className="rounded-2xl border border-dashed border-black/20 px-6 py-16 text-center text-neutral-600 dark:border-white/20 dark:text-neutral-400">
          아직 갤러리가 없어요. 갤러리 만들기는 2단계에서 추가됩니다.
        </div>
      </main>
    </div>
  );
}
