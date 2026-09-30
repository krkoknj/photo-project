"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "갤러리", match: (p: string) => p === "/dashboard" || p.startsWith("/dashboard/galleries/") && !p.endsWith("/new") },
  { href: "/dashboard/galleries/new", label: "새 갤러리", match: (p: string) => p.endsWith("/galleries/new"), primary: true },
  { href: "/dashboard/settings", label: "설정", match: (p: string) => p.startsWith("/dashboard/settings") },
];

function Icon({ name }: { name: string }) {
  const common = { width: 22, height: 22, fill: "none", stroke: "currentColor", strokeWidth: 1.4, "aria-hidden": true } as const;
  if (name === "갤러리")
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <rect x="3.5" y="3.5" width="7" height="7" />
        <rect x="13.5" y="3.5" width="7" height="7" />
        <rect x="3.5" y="13.5" width="7" height="7" />
        <rect x="13.5" y="13.5" width="7" height="7" />
      </svg>
    );
  if (name === "설정")
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// 데스크톱: 상단 오른쪽 세로 메뉴 (참고 사이트처럼 작은 대문자)
export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="eyebrow hidden flex-col items-end gap-0.5 text-right sm:flex">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} className={tab.match(pathname) ? "text-accent" : "text-fg hover:text-accent"}>
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
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
      aria-label="주요 메뉴"
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 pt-2.5 pb-2 ${active ? "text-accent" : "text-muted"}`}
          >
            {tab.primary ? (
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${active ? "bg-fg text-ink" : "bg-accent text-ink"}`}>
                <Icon name={tab.label} />
              </span>
            ) : (
              <Icon name={tab.label} />
            )}
            {!tab.primary && <span className="text-[10px]">{tab.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
