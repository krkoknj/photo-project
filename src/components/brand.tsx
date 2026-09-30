import Link from "next/link";

// 워드마크: 오렌지 점(셔터) + 두 줄 대문자
export function Wordmark({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`group inline-flex items-center gap-3 ${className}`} aria-label="셀렉갤러리 홈">
      <span className="relative block h-7 w-7 shrink-0 rounded-full border border-fg/70">
        <span className="absolute inset-[7px] rounded-full bg-accent transition-transform group-hover:scale-125" />
      </span>
      <span className="eyebrow text-fg">
        Select
        <br />
        Gallery
      </span>
    </Link>
  );
}

// 상단에 흐르는 띠 문구
export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items, ...items, ...items];
  return (
    <div className="overflow-hidden border-b border-line py-1.5" aria-hidden>
      <div className="flex w-max animate-marquee gap-6 whitespace-nowrap">
        {[...row, ...row].map((text, i) => (
          <span key={i} className={`eyebrow ${i % 2 ? "text-muted" : "text-fg"}`}>
            {text}
            <span className="ml-6 text-accent">✳</span>
          </span>
        ))}
      </div>
    </div>
  );
}
