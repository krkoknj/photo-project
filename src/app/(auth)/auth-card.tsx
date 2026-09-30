import type { ReactNode } from "react";
import { AppBar } from "@/components/brand";

// 로그인·가입: 앱 상단 바 + 큰 제목 + 폼 (가운데 좁은 폭, 모바일 앱처럼)
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <AppBar back="/" />
      <main className="mx-auto w-full max-w-md flex-1 px-6 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <p className="mb-2 text-[1.75rem] font-extrabold tracking-[-0.04em]">
          Select<span className="text-accent">.</span>
        </p>
        <h1 className="display mb-10 text-2xl whitespace-pre-line">{title}</h1>
        {children}
      </main>
    </div>
  );
}
