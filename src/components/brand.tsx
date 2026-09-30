import Link from "next/link";

// 워드마크: 굵은 "Select" + 오렌지 마침표
export function Wordmark({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`text-[1.375rem] font-extrabold tracking-[-0.04em] ${className}`} aria-label="셀렉갤러리 홈">
      Select<span className="text-accent">.</span>
    </Link>
  );
}

// 앱 상단 바: 뒤로가기 · 가운데 제목 · 오른쪽 액션
export function AppBar({
  back,
  title,
  right,
}: {
  back?: string;
  title?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 grid h-14 grid-cols-[3rem_1fr_3rem] items-center border-b border-line bg-ink/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      {back ? (
        <Link href={back} aria-label="뒤로" className="flex h-11 w-11 items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
      ) : (
        <span />
      )}
      <h1 className="truncate text-center text-[1.0625rem] font-bold">{title}</h1>
      <div className="flex justify-end">{right}</div>
    </header>
  );
}
