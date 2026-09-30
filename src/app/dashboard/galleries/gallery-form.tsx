"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, type FormState } from "@/components/form";

export type GalleryFormValues = {
  title: string;
  clientName: string;
  clientEmail: string;
  baseSelectCount: number;
  extraPriceKrw: number;
  expiresOn: string;
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: GalleryFormValues;
  mode: "create" | "edit";
  selectionLocked?: boolean;
};

export function GalleryForm({ action, defaults: initial, mode, selectionLocked = false }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const e = state.fieldErrors ?? {};
  const defaults = { ...initial, ...state.values };

  return (
    <form action={formAction} className="space-y-5">
      <Field label="갤러리 이름" name="title" required maxLength={100} defaultValue={defaults.title}
        placeholder="예: 김OO님 도쿄 스냅 (10/12)" error={e.title} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="고객 이름 (선택)" name="clientName" maxLength={50} defaultValue={defaults.clientName}
          error={e.clientName} />
        <Field label="고객 이메일 (선택)" name="clientEmail" type="email" defaultValue={defaults.clientEmail}
          hint="셀렉·보정본 알림을 받을 주소" error={e.clientEmail} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="기본 셀렉 장수" name="baseSelectCount" type="number" inputMode="numeric" min={0} max={1000}
          required defaultValue={defaults.baseSelectCount} disabled={selectionLocked}
          hint="촬영 상품에 포함된 보정 장수" error={e.baseSelectCount} />
        <Field label="추가 보정 가격 (장당, 원)" name="extraPriceKrw" type="number" inputMode="numeric" min={0}
          step={1000} required defaultValue={defaults.extraPriceKrw} disabled={selectionLocked}
          hint="기본 장수를 넘겨 고르면 장당 결제" error={e.extraPriceKrw} />
      </div>
      {selectionLocked && (
        <>
          {/* disabled 입력은 전송되지 않으므로 기존 값을 그대로 보낸다 */}
          <input type="hidden" name="baseSelectCount" value={defaults.baseSelectCount} />
          <input type="hidden" name="extraPriceKrw" value={defaults.extraPriceKrw} />
          <p className="text-xs text-neutral-500">고객이 셀렉을 제출해서 셀렉 장수와 가격은 바꿀 수 없어요.</p>
        </>
      )}

      <Field label="만료일 (선택)" name="expiresOn" type="date" defaultValue={defaults.expiresOn}
        hint="만료일이 지나면 고객 링크가 닫히고 원본이 정리돼요. 비워두면 만료되지 않아요." error={e.expiresOn} />

      {mode === "create" && (
        <Field label="공유 비밀번호 (선택)" name="password" type="password" autoComplete="new-password"
          minLength={4} maxLength={64} hint="설정하면 고객이 링크를 열 때 비밀번호를 입력해요." error={e.password} />
      )}

      <FormMessage error={state.error} message={state.message} />
      <SubmitButton pending={pending} className="w-full sm:w-auto">
        {mode === "create" ? "갤러리 만들기" : "저장"}
      </SubmitButton>
    </form>
  );
}
