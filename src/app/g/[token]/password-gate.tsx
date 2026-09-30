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
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <form action={formAction} className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <p className="text-sm text-neutral-500">{photographerName}</p>
          <h1 className="mt-1 text-xl font-semibold">비밀번호를 입력해주세요</h1>
          <p className="mt-2 text-sm text-neutral-500">작가님께 전달받은 비밀번호를 입력하면 사진을 볼 수 있어요.</p>
        </div>
        <Field label="비밀번호" name="password" type="password" autoComplete="off" required autoFocus />
        <FormMessage error={state.error} />
        <SubmitButton pending={pending}>사진 보기</SubmitButton>
      </form>
    </main>
  );
}
