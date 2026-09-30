import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "../(auth)/actions";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { supabase, userId } = await requireUser();
  const { data: photographer } = await supabase
    .from("photographers")
    .select("display_name, email")
    .eq("id", userId)
    .single();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10 sm:px-6">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          셀렉갤러리
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-neutral-600 dark:text-neutral-400 sm:inline">
            {photographer?.display_name || photographer?.email}
          </span>
          <Link href="/dashboard/settings" className="text-neutral-600 hover:underline dark:text-neutral-400">
            결제 설정
          </Link>
          <form action={logout}>
            <button type="submit" className="rounded-lg border border-black/15 px-3 py-1.5 dark:border-white/20">
              로그아웃
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
