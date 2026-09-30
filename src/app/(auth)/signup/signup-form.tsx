"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type AuthFormState } from "../actions";
import { Field, FormMessage, SubmitButton } from "@/components/form";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signup, {});

  return (
    <form action={formAction} className="space-y-6">
      <Field
        label="이름 (고객에게 표시)"
        name="displayName"
        autoComplete="name"
        required
        defaultValue={state.fields?.displayName}
      />
      <Field
        label="이메일"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.fields?.email}
      />
      <Field
        label="비밀번호 (8자 이상)"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <FormMessage error={state.error} message={state.message} />
      <SubmitButton pending={pending}>가입하기</SubmitButton>
      <p className="pt-2 text-sm text-muted">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-fg underline decoration-accent underline-offset-4">
          로그인
        </Link>
      </p>
    </form>
  );
}
