"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, type FormState } from "@/components/form";

export function PasswordForm({
  action,
  hasPassword,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  hasPassword: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <Field
            label={hasPassword ? "새 비밀번호" : "비밀번호"}
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={4}
            maxLength={64}
            required
            error={state.fieldErrors?.password}
          />
        </div>
        <SubmitButton pending={pending} variant="secondary" className="shrink-0 sm:mt-6">
          {hasPassword ? "변경" : "설정"}
        </SubmitButton>
      </div>
      <FormMessage error={state.error} message={state.message} />
    </form>
  );
}
