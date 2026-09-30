import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="mb-3 text-sm font-medium text-neutral-500">사진작가용 셀렉·보정 전달 갤러리</p>
      <h1 className="mb-4 max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        원본 공유부터 셀렉, 보정 요청, 보정본 전달까지 한 링크로
      </h1>
      <p className="mb-8 max-w-md text-neutral-600 dark:text-neutral-400">
        고객은 로그인 없이 휴대폰으로 사진을 고르고, 사진 위에 핀을 찍어 보정을 요청해요.
      </p>
      <div className="flex gap-3">
        <Link href="/signup" className="rounded-lg bg-black px-5 py-2.5 font-medium text-white dark:bg-white dark:text-black">
          작가로 시작하기
        </Link>
        <Link href="/login" className="rounded-lg border border-black/15 px-5 py-2.5 font-medium dark:border-white/20">
          로그인
        </Link>
      </div>
    </main>
  );
}
