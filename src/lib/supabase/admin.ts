import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// RLS를 우회하는 관리자 클라이언트. 서버에서만, 소유권·권한을 직접 확인한 뒤에 사용한다.
export function createAdminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
