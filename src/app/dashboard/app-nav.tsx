"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/dashboard",
    label: "갤러리",
    match: (p: string) => p === "/dashboard" || (p.startsWith("/dashboard/galleries/") && !p.endsWith("/new")),
  },
  { href: "/dashboard/galleries/new", label: "새 갤러리", match: (p: string) => p.endsWith("/galleries/new"), primary: true },
  { href: "/dashboard/settings", label: "설정", match: (p: string) => p.startsWith("/dashboard/settings") },
];

function Icon({ name, active }: { name: string; active: boolean }) {
  const common = { width: 24, height: 24, fill: "none", stroke: "currentColor", strokeWidth: active ? 2 : 1.6, "aria-hidden": true } as const;
  if (name === "갤러리")
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="2" fill={active ? "currentColor" : "none"} />
        <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="2" fill={active ? "currentColor" : "none"} />
      </svg>
    );
  if (name === "설정")
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <circle cx="12" cy="8" r="4" fill={active ? "currentColor" : "none"} />
        <path d="M4 20.5c1.5-3.6 4.4-5.5 8-5.5s6.5 1.9 8 5.5" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" {...common} strokeWidth={2.4}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// 데스크톱: 상단 가운데 알약형 메뉴
export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 rounded-full bg-panel p-1 sm:flex">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
            tab.match(pathname) ? "bg-ink text-fg shadow-sm" : "text-muted hover:text-fg"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

// 모바일: 하단 고정 탭 바 (앱처럼)
export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
      aria-label="주요 메뉴"
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 ${active ? "text-fg" : "text-muted"}`}
          >
            {tab.primary ? (
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-[0_6px_16px_-6px_var(--color-accent)]">
                <Icon name={tab.label} active />
              </span>
            ) : (
              <>
                <Icon name={tab.label} active={active} />
                <span className="text-[10px] font-bold">{tab.label}</span>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
