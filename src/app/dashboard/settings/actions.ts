"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/secret-box";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkKeyFormat, verifySecretKey } from "@/lib/toss";

// payment_settings는 RLS 정책이 없어(시크릿 보호) 관리자 클라이언트로 쓴다.
// 대상 행은 항상 로그인한 작가 본인(userId)으로 고정한다.

async function upsertSettings(userId: string, values: Record<string, string | null>) {
  return createAdminClient()
    .from("payment_settings")
    .upsert({ photographer_id: userId, ...values }, { onConflict: "photographer_id" });
}

export async function saveTossKeys(_prev: FormState, formData: FormData): Promise<FormState> {
  const { userId } = await requireUser();
  const clientKey = String(formData.get("clientKey") ?? "").trim();
  const secretKey = String(formData.get("secretKey") ?? "").trim();
  const values = { clientKey };

  const formatError = checkKeyFormat(clientKey, secretKey);
  if (formatError) return { error: formatError, values };

  const verified = await verifySecretKey(secretKey);
  if (!verified.ok) return { error: verified.message, values };

  const { error } = await upsertSettings(userId, {
    toss_client_key: clientKey,
    toss_secret_key_encrypted: encryptSecret(secretKey),
  });
  if (error) return { error: "저장하지 못했어요. 다시 시도해주세요.", values };

  revalidatePath("/dashboard/settings");
  return { message: "토스페이먼츠 키를 연결했어요." };
}

export async function removeTossKeys() {
  const { userId } = await requireUser();
  await upsertSettings(userId, { toss_client_key: null, toss_secret_key_encrypted: null });
  revalidatePath("/dashboard/settings");
}

const bankSchema = z.object({
  bankName: z.string().trim().min(1, "은행을 입력해주세요.").max(30),
  account: z
    .string()
    .trim()
    .regex(/^[0-9-]{6,30}$/, "계좌번호는 숫자와 - 만 입력해주세요."),
  holder: z.string().trim().min(1, "예금주를 입력해주세요.").max(30),
});

export async function saveBankAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const { userId } = await requireUser();
  const values = {
    bankName: String(formData.get("bankName") ?? ""),
    account: String(formData.get("account") ?? ""),
    holder: String(formData.get("holder") ?? ""),
  };
  const parsed = bankSchema.safeParse(values);
  if (!parsed.success) {
    return {
      fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])),
      values,
    };
  }

  const { error } = await upsertSettings(userId, {
    bank_name: parsed.data.bankName,
    bank_account: parsed.data.account,
    bank_holder: parsed.data.holder,
  });
  if (error) return { error: "저장하지 못했어요. 다시 시도해주세요.", values };

  revalidatePath("/dashboard/settings");
  return { message: "계좌를 저장했어요.", values };
}

export async function removeBankAccount() {
  const { userId } = await requireUser();
  await upsertSettings(userId, { bank_name: null, bank_account: null, bank_holder: null });
  revalidatePath("/dashboard/settings");
}
