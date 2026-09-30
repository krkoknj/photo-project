import Link from "next/link";
import { Marquee, Wordmark } from "@/components/brand";

const STEPS = [
  {
    title: "원본 공유",
    en: "Share",
    body: "원본을 올리면 워터마크가 들어간 미리보기가 자동으로 만들어져요. 고객은 로그인 없이 링크 하나로 봐요.",
  },
  {
    title: "셀렉과 보정 요청",
    en: "Select",
    body: "고객은 휴대폰으로 사진을 고르고, 사진 위에 핀을 찍어 “여기 턱선 정리해주세요”처럼 요청을 남겨요.",
  },
  {
    title: "추가 보정 결제",
    en: "Upsell",
    body: "기본 장수를 넘겨 고르면 장당 추가 비용을 바로 결제받아요. 카드 결제와 계좌이체 확인 모두 가능해요.",
  },
  {
    title: "보정본 전달",
    en: "Deliver",
    body: "보정본을 올리면 파일명으로 원본과 자동 연결되고, 고객에게 도착 알림이 가요. 원본 화질로 한 번에 받아요.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Marquee items={["Select Gallery", "셀렉 · 보정 요청 · 보정본 전달", "For snap photographers", "Tokyo · Paris · Bali"]} />

      <header className="flex items-start justify-between px-5 pt-6 sm:px-10">
        <Wordmark />
        <nav className="eyebrow flex flex-col items-end gap-0.5 text-right">
          <Link href="/login" className="hover:text-accent">
            로그인
          </Link>
          <Link href="/signup" className="hover:text-accent">
            작가 가입 ↘
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* 히어로 */}
        <section className="relative px-5 pt-16 pb-20 sm:px-10 sm:pt-24">
          <h1 className="display text-[clamp(4.25rem,15vw,14rem)] text-fg">
            <span className="block">Select,</span>
            <span className="block pl-[8vw] italic text-accent">retouch,</span>
            <span className="block">deliver.</span>
          </h1>

          <div className="mt-12 grid gap-10 sm:mt-0 sm:absolute sm:right-10 sm:bottom-24 sm:w-[22rem]">
            <p className="eyebrow leading-relaxed text-fg">
              해외 스냅 작가를 위한
              <br />
              셀렉 · 보정 요청 · 보정본 전달
              <br />
              갤러리
            </p>
            <p className="text-sm leading-relaxed text-muted">
              원본 공유부터 고객 셀렉, 사진 위 보정 요청, 추가 보정 결제, 보정본 전달까지. 시차가 있어도 링크 하나로
              끝나요.
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-accent px-6 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-accent-hover"
              >
                작가로 시작하기 <span aria-hidden>↘</span>
              </Link>
              <Link href="/login" className="eyebrow underline decoration-accent underline-offset-4 hover:text-accent">
                로그인
              </Link>
            </div>
          </div>

          {/* 장식 선 */}
          <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden>
            <path d="M0 80 L420 20 L1000 95" fill="none" stroke="var(--color-accent)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          </svg>
        </section>

        {/* 흐름 */}
        <section className="border-t border-line px-5 py-20 sm:px-10">
          <div className="mb-14 flex items-end justify-between gap-6">
            <h2 className="display text-[clamp(3rem,8vw,7rem)]">
              How it <span className="italic text-accent">works</span>
            </h2>
            <p className="eyebrow hidden text-muted sm:block">
              04 steps
              <br />
              one link
            </p>
          </div>

          <ol className="divide-y divide-line border-y border-line">
            {STEPS.map((step, i) => (
              <li key={step.en} className="group grid gap-4 py-8 sm:grid-cols-[6rem_1fr_1.2fr] sm:items-baseline sm:gap-10">
                <span className="display text-5xl text-muted transition-colors group-hover:text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="eyebrow mb-2 text-accent">{step.en}</p>
                  <h3 className="display text-3xl sm:text-4xl">{step.title}</h3>
                </div>
                <p className="max-w-md text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 마무리 CTA */}
        <section className="px-5 pb-24 sm:px-10">
          <Link href="/signup" className="group block border-b border-line pb-6">
            <p className="eyebrow mb-4 text-muted">Start now — 무료로 시작</p>
            <p className="display text-[clamp(3rem,10vw,9rem)] transition-colors group-hover:text-accent">
              첫 갤러리 <span className="text-accent">만들기</span> ↗
            </p>
          </Link>
        </section>
      </main>

      <footer className="eyebrow flex justify-between border-t border-line px-5 py-5 text-muted sm:px-10">
        <span>© 2026 Select Gallery</span>
        <span>For photographers</span>
      </footer>
    </div>
  );
}
