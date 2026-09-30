import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand";

// 로그인·가입: 왼쪽은 큰 세리프 제목, 오른쪽은 폼 (모바일에서는 위아래)
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="px-5 pt-6 sm:px-10">
        <Wordmark />
      </header>
      <main className="grid flex-1 items-center gap-12 px-5 py-14 sm:px-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="eyebrow mb-5 text-accent">For photographers</p>
          <h1 className="display text-[clamp(3.5rem,9vw,8rem)]">{title}</h1>
        </div>
        <div className="w-full max-w-sm border-t border-line pt-8 lg:justify-self-end">{children}</div>
      </main>
    </div>
  );
}
