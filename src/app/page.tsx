import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { buttonClass } from "@/components/form";

const FEATURES = [
  {
    title: "워터마크 미리보기",
    body: "원본을 올리면 워터마크가 들어간 미리보기가 자동으로 만들어져요.",
    tone: "bg-accent-soft",
    dot: "bg-accent",
  },
  {
    title: "사진 위 핀 요청",
    body: "고객이 사진을 탭해 “여기 턱선 정리해주세요”처럼 남겨요.",
    tone: "bg-[#151a26]",
    dot: "bg-[#6f8cff]",
  },
  {
    title: "추가 보정 결제",
    body: "기본 장수를 넘기면 장당 비용을 카드나 계좌이체로 받아요.",
    tone: "bg-[#131f17]",
    dot: "bg-ok",
  },
  {
    title: "보정본 자동 매칭",
    body: "파일명으로 원본과 연결하고, 고객에게 도착 알림을 보내요.",
    tone: "bg-panel",
    dot: "bg-fg",
  },
];

// 휴대폰 화면처럼 보이는 미리보기 카드 (셀렉 + 핀 요청)
function PhonePreview() {
  const tiles = ["#ffd9c7", "#ffc2a6", "#ffe8dc", "#ffb48f", "#ffd3bd", "#fff1ea"];
  return (
    <div className="relative mx-auto w-full max-w-[20rem] rounded-[2.25rem] border-[6px] border-fg bg-ink p-3 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.35)]">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-sm font-extrabold">
          도쿄 스냅<span className="text-accent">.</span>
        </span>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">12 / 30장</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {tiles.map((color, i) => (
          <div key={i} className="relative aspect-square rounded-md" style={{ background: color }}>
            {(i === 1 || i === 3) && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
                ✓
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="relative mt-3 overflow-hidden rounded-xl" style={{ background: "#ffb48f", aspectRatio: "4 / 3" }}>
        <span className="absolute top-[38%] left-[46%] flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-accent text-[10px] font-bold text-white">
          1
        </span>
      </div>
      <div className="absolute -right-4 bottom-10 max-w-[11rem] rounded-2xl rounded-br-sm bg-fg px-3.5 py-2.5 text-[12px] font-medium text-ink shadow-lg sm:-right-10">
        여기 턱선 정리해주세요 🙏
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-ink/95 px-5 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:px-8">
        <Wordmark />
        <nav className="flex items-center gap-4 text-sm font-bold">
          <Link href="/login" className="text-muted hover:text-fg">
            로그인
          </Link>
          <Link href="/signup" className="rounded-full bg-fg px-4 py-2 text-ink">
            시작하기
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* 히어로 */}
        <section className="mx-auto grid max-w-5xl items-center gap-14 px-5 pt-12 pb-16 sm:px-8 lg:grid-cols-2 lg:pt-20">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
              해외 스냅 작가를 위한 셀렉 갤러리
            </p>
            <h1 className="display text-[2.5rem] sm:text-[3.5rem]">
              사진 셀렉,
              <br />
              <span className="text-accent">링크 하나</span>로
              <br />
              끝내세요.
            </h1>
            <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-muted">
              원본 공유부터 고객 셀렉, 사진 위 보정 요청, 추가 결제, 보정본 전달까지. 고객은 로그인 없이 휴대폰으로 골라요.
            </p>
            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
              <Link href="/signup" className={buttonClass("primary", "sm:px-8")}>
                작가로 시작하기
              </Link>
              <Link href="/login" className={buttonClass("secondary", "sm:px-8")}>
                로그인
              </Link>
            </div>
          </div>
          <div className="pb-4">
            <PhonePreview />
          </div>
        </section>

        {/* 기능 카드 */}
        <section className="band">
          <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
            <h2 className="display mb-2 text-2xl">셀렉부터 전달까지</h2>
            <p className="mb-8 text-sm text-muted">작가님은 보정에만 집중하세요.</p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <li key={f.title} className={`rounded-3xl p-6 ${f.tone}`}>
                  <span className={`mb-5 block h-9 w-9 rounded-full ${f.dot}`} />
                  <h3 className="text-lg font-extrabold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg/70">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 흐름 */}
        <section className="band">
          <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
            <h2 className="display mb-8 text-2xl">이렇게 진행돼요</h2>
            <ol className="space-y-5">
              {["갤러리를 만들고 원본을 올려요", "고객에게 링크를 보내요", "고객이 고르고 보정 요청을 남겨요", "보정본을 올리면 고객에게 알림이 가요"].map(
                (step, i) => (
                  <li key={step} className="flex items-center gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fg text-sm font-bold text-ink">
                      {i + 1}
                    </span>
                    <span className="font-bold">{step}</span>
                  </li>
                ),
              )}
            </ol>
            <Link href="/signup" className={buttonClass("accent", "mt-10 w-full sm:w-auto sm:px-10")}>
              무료로 첫 갤러리 만들기
            </Link>
          </div>
        </section>
      </main>

      <footer className="band px-5 py-6 text-xs text-muted sm:px-8">© 2026 셀렉갤러리 · 사진작가용 셀렉·보정 전달 갤러리</footer>
    </div>
  );
}
