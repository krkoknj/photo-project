import "server-only";
import { notifyExpiryWarning } from "@/lib/notifications";
import { moveToTrash } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";

// 만료 처리 (하루 한 번 cron으로 실행). 여러 번 실행돼도 결과가 같도록 만든다.
// 1) 만료 예고: 기한이 3일 안으로 남은 갤러리의 고객에게 한 번만 메일
// 2) 만료: 기한이 지난 갤러리를 expired로 바꿔 고객 링크를 닫는다
// 3) 원본 정리: 만료된 갤러리의 원본을 trash/로 옮긴다 (운영 R2는 수명 주기 규칙으로 7일 뒤 삭제).
//    사진이 많으면 한 번에 PURGE_BATCH장씩, 다음 실행에서 이어서 처리한다.
//    미리보기·썸네일·보정본은 남긴다 (작가가 만료일을 늘리면 링크를 다시 열 수 있게).

const WARNING_DAYS = 3;
const PURGE_BATCH = 300;
const PURGE_CONCURRENCY = 8;

export type ExpiryReport = { warned: number; expired: number; purged: number; purgeRemaining: boolean };

export async function runExpiryJobs(now = new Date()): Promise<ExpiryReport> {
  const admin = createAdminClient();
  const nowIso = now.toISOString();

  // 1) 만료 예고
  const warnBefore = new Date(now.getTime() + WARNING_DAYS * 86_400_000).toISOString();
  const { data: soon } = await admin
    .from("galleries")
    .select("id")
    .is("trashed_at", null)
    .not("client_email", "is", null)
    .not("status", "in", "(draft,expired)")
    .gt("expires_at", nowIso)
    .lte("expires_at", warnBefore);

  let warned = 0;
  if (soon?.length) {
    const { data: sent } = await admin
      .from("notifications")
      .select("gallery_id")
      .eq("type", "expiry_warning")
      .in(
        "gallery_id",
        soon.map((g) => g.id),
      );
    const already = new Set((sent ?? []).map((n) => n.gallery_id));
    for (const g of soon.filter((g) => !already.has(g.id))) {
      await notifyExpiryWarning(g.id);
      warned++;
    }
  }

  // 2) 만료
  const { data: expiredRows } = await admin
    .from("galleries")
    .update({ status: "expired" })
    .neq("status", "expired")
    .lte("expires_at", nowIso)
    .select("id");

  // 3) 원본 정리
  const { data: photos } = await admin
    .from("photos")
    .select("id, original_key, galleries!inner(status)")
    .eq("galleries.status", "expired")
    .is("original_purged_at", null)
    .limit(PURGE_BATCH + 1);

  const batch = (photos ?? []).slice(0, PURGE_BATCH);
  let purged = 0;
  for (let i = 0; i < batch.length; i += PURGE_CONCURRENCY) {
    const chunk = batch.slice(i, i + PURGE_CONCURRENCY);
    const results = await Promise.allSettled(chunk.map((p) => moveToTrash(p.original_key)));
    const done = chunk.filter((_, j) => results[j].status === "fulfilled").map((p) => p.id);
    if (done.length) {
      await admin.from("photos").update({ original_purged_at: nowIso }).in("id", done);
      purged += done.length;
    }
  }

  return {
    warned,
    expired: expiredRows?.length ?? 0,
    purged,
    purgeRemaining: (photos?.length ?? 0) > PURGE_BATCH,
  };
}
