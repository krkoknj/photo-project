"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  message?: string;
  fields?: { email?: string; displayName?: string };
};

const MIN_PASSWORD_LENGTH = 8;

// 오픈 리다이렉트 방지: 같은 사이트 내부 경로만 허용
function safeNextPath(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해주세요.", fields: { email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const message =
      error.code === "email_not_confirmed"
        ? "이메일 인증을 먼저 완료해주세요."
        : "이메일 또는 비밀번호가 올바르지 않습니다.";
    return { error: message, fields: { email } };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fields = { email, displayName };

  if (!displayName || !email || !password) {
    return { error: "모든 항목을 입력해주세요.", fields };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`, fields };
  }

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    // 원인 파악용 (이메일 등 개인정보는 남기지 않는다)
    console.warn(`[signup] 실패: ${error.code ?? "unknown"} (${error.status ?? "-"}) ${error.message}`);
    const message =
      error.code === "user_already_exists" || error.code === "email_exists"
        ? "이미 가입된 이메일입니다."
        : error.code === "weak_password"
          ? "더 안전한 비밀번호를 사용해주세요."
          : error.code === "email_address_invalid"
            ? "사용할 수 없는 이메일 주소예요. 실제로 받을 수 있는 주소를 입력해주세요."
            : error.code === "over_email_send_rate_limit"
              ? "인증 메일을 너무 많이 보냈어요. 잠시 후 다시 시도해주세요."
              : "가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    return { error: message, fields };
  }

  // 이메일 인증이 켜져 있으면 세션 없이 반환된다.
  if (!data.session) {
    return { message: "인증 메일을 보냈어요. 메일의 링크를 눌러 가입을 완료해주세요.", fields };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
