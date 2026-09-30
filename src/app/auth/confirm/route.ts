import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 가입 인증 메일 링크 처리 (운영 환경은 이메일 인증을 켠다)
// - token_hash: 메일 템플릿을 {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email 로 바꾼 경우.
//   다른 기기(휴대폰 메일 앱 등)에서 열어도 된다. 권장.
// - code: 기본 템플릿(PKCE). 가입한 같은 브라우저에서 열 때만 성공한다.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  if (ok) return NextResponse.redirect(new URL("/dashboard", request.url));

  const url = new URL("/login", request.url);
  url.searchParams.set("error", "confirm_failed");
  return NextResponse.redirect(url);
}
