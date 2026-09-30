"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, type FormState } from "@/components/form";

export function PasswordGate({
  action,
  photographerName,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  photographerName: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <form action={formAction} className="flex flex-1 flex-col">
        <div className="mb-10">
          <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-lg font-extrabold text-white">
            {photographerName.slice(0, 1)}
          </span>
          <p className="text-sm font-bold text-muted">{photographerName}</p>
          <h1 className="display mt-1 text-2xl">
            비밀번호를
            <br />
            입력해주세요
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">작가님께 전달받은 비밀번호를 입력하면 사진을 볼 수 있어요.</p>
        </div>
        <Field label="비밀번호" name="password" type="password" autoComplete="off" required autoFocus />
        <div className="mt-4">
          <FormMessage error={state.error} />
        </div>
        {/* 앱처럼 주요 버튼은 화면 아래에 */}
        <div className="mt-auto pt-10">
          <SubmitButton pending={pending}>사진 보기</SubmitButton>
        </div>
      </form>
    </main>
  );
}
