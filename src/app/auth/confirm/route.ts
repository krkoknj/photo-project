import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 가입 인증 메일 링크 처리 (운영 환경에서 이메일 인증을 켰을 때 사용)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  const url = new URL("/login", request.url);
  url.searchParams.set("error", "confirm_failed");
  return NextResponse.redirect(url);
}
