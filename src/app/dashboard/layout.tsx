import { Wordmark } from "@/components/brand";
import { requireUser } from "@/lib/auth";
import { logout } from "../(auth)/actions";
import { BottomTabs, TopNav } from "./app-nav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { supabase, userId } = await requireUser();
  const { data: photographer } = await supabase
    .from("photographers")
    .select("display_name, email")
    .eq("id", userId)
    .single();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-5">
          <Wordmark href="/dashboard" />
          <TopNav />
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden max-w-[9rem] truncate font-medium text-muted md:inline">
              {photographer?.display_name || photographer?.email}
            </span>
            <form action={logout}>
              <button type="submit" className="rounded-full bg-panel px-3 py-1.5 text-xs font-bold text-fg/70 hover:text-fg">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 pt-6 pb-28 sm:pb-16">{children}</main>
      <BottomTabs />
    </div>
  );
}
