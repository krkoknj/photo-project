"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthFormState } from "../actions";
import { Field, FormMessage, SubmitButton } from "@/components/form";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(login, {
    error: initialError,
  });

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field
        label="이메일"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.fields?.email}
      />
      <Field label="비밀번호" name="password" type="password" autoComplete="current-password" required />
      <FormMessage error={state.error} message={state.message} />
      <SubmitButton pending={pending}>로그인</SubmitButton>
      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium text-black underline dark:text-white">
          가입하기
        </Link>
      </p>
    </form>
  );
}
