import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 작가 전용 페이지·액션에서 사용. 로그인하지 않았으면 로그인 페이지로 보낸다.
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login");
  return { supabase, userId };
}
