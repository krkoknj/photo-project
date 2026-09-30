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
    <main className="flex flex-1 flex-col justify-between gap-12 px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10 sm:pt-8">
      <p className="eyebrow text-fg">
        {photographerName}
        <br />
        <span className="text-muted">Private gallery</span>
      </p>
      <form action={formAction} className="w-full max-w-md space-y-8">
        <div>
          <h1 className="display text-[clamp(3rem,11vw,6.5rem)]">
            <span className="italic text-accent">Private</span>
            <br />
            갤러리
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-muted">작가님께 전달받은 비밀번호를 입력하면 사진을 볼 수 있어요.</p>
        </div>
        <Field label="비밀번호" name="password" type="password" autoComplete="off" required autoFocus />
        <FormMessage error={state.error} />
        <SubmitButton pending={pending}>사진 보기</SubmitButton>
      </form>
    </main>
  );
}
