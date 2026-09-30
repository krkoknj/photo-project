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
      <header className="sticky top-0 z-30 flex items-start justify-between gap-6 border-b border-line bg-ink/85 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 backdrop-blur-md sm:px-10 sm:pt-6 sm:pb-5">
        <Wordmark href="/dashboard" />
        <div className="flex items-start gap-8">
          <TopNav />
          <div className="eyebrow flex flex-col items-end gap-0.5 text-right">
            <span className="max-w-[10rem] truncate text-muted">{photographer?.display_name || photographer?.email}</span>
            <form action={logout}>
              <button type="submit" className="text-fg hover:text-accent">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-10 pb-28 sm:px-10 sm:pb-16">{children}</main>
      <BottomTabs />
    </div>
  );
}
