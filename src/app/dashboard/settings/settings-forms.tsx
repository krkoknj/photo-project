"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, type FormState } from "@/components/form";
import { saveBankAccount, saveTossKeys } from "./actions";

export function TossKeyForm({ connected }: { connected: boolean }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveTossKeys, {});

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="클라이언트 키"
        name="clientKey"
        placeholder="test_ck_… 또는 live_ck_…"
        autoComplete="off"
        spellCheck={false}
        required
        defaultValue={state.values?.clientKey}
      />
      <Field
        label="시크릿 키"
        name="secretKey"
        type="password"
        placeholder="test_sk_… 또는 live_sk_…"
        autoComplete="off"
        required
        hint="암호화해서 저장하고, 저장한 뒤에는 다시 보여주지 않아요."
      />
      <FormMessage error={state.error} message={state.message} />
      <SubmitButton pending={pending} className="w-full sm:w-auto">
        {connected ? "키 교체" : "연결"}
      </SubmitButton>
    </form>
  );
}

export function BankAccountForm({ initial }: { initial: { bankName: string; account: string; holder: string } }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveBankAccount, {});
  const v = { ...initial, ...state.values };
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="은행" name="bankName" placeholder="예: 카카오뱅크" required defaultValue={v.bankName} error={e.bankName} />
        <Field
          label="계좌번호"
          name="account"
          inputMode="numeric"
          placeholder="3333-01-1234567"
          required
          defaultValue={v.account}
          error={e.account}
        />
        <Field label="예금주" name="holder" required defaultValue={v.holder} error={e.holder} />
      </div>
      <FormMessage error={state.error} message={state.message} />
      <SubmitButton pending={pending} variant="secondary" className="w-full sm:w-auto">
        저장
      </SubmitButton>
    </form>
  );
}
