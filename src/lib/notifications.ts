import "server-only";
import { sendEmail } from "@/lib/email";
import {
  expiryWarningEmail,
  paymentCompletedEmail,
  retouchDeliveredEmail,
  selectionSubmittedEmail,
} from "@/lib/email-templates";
import { formatDateKst, formatKrw, shareUrl } from "@/lib/gallery";
import { extraAmount, extraCount } from "@/lib/selection";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enums } from "@/lib/supabase/database.types";

// 알림 메일. 요청 응답을 늦추지 않도록 호출하는 쪽에서 after()로 실행한다.
// 모든 발송은 notifications 테이블에 기록한다 (queued → sent / failed).

async function loadGallery(galleryId: string) {
  const { data } = await createAdminClient()
    .from("galleries")
    .select(
      "id, title, client_name, client_email, share_token, base_select_count, extra_price_krw, expires_at, photographers(email, display_name, studio_name)",
    )
    .eq("id", galleryId)
    .maybeSingle();
  return data;
}

async function deliver(
  galleryId: string,
  type: Enums<"notification_type">,
  to: string,
  email: { subject: string; html: string; text: string },
) {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("notifications")
    .insert({ gallery_id: galleryId, type, recipient: to })
    .select("id")
    .single();

  const result = await sendEmail({ to, ...email });
  if (row) {
    await admin
      .from("notifications")
      .update(
        result.ok
          ? { status: "sent", sent_at: new Date().toISOString() }
          : { status: "failed", error: result.error },
      )
      .eq("id", row.id);
  }
  if (!result.ok) console.warn(`[notify] ${type} 발송 실패 (${galleryId}): ${result.error}`);
}

const dashboardUrl = (galleryId: string) => `${siteUrl()}/dashboard/galleries/${galleryId}`;

/** 작가에게: 고객이 셀렉을 제출함 (결제 대기 포함) */
export async function notifySelectionSubmitted(galleryId: string, awaitingPayment: boolean) {
  const gallery = await loadGallery(galleryId);
  const to = gallery?.photographers?.email;
  if (!gallery || !to) return;

  const admin = createAdminClient();
  const [{ count: selected }, { data: selections }, { data: pins }] = await Promise.all([
    admin.from("selections").select("id", { count: "exact", head: true }).eq("gallery_id", galleryId),
    admin.from("selections").select("photo_id").eq("gallery_id", galleryId),
    admin.from("retouch_pins").select("photo_id").eq("gallery_id", galleryId).eq("author", "client"),
  ]);
  // 선택을 뺀 사진에 남은 핀은 세지 않는다.
  const selectedIds = new Set((selections ?? []).map((s) => s.photo_id));
  const pinCount = (pins ?? []).filter((p) => selectedIds.has(p.photo_id)).length;
  const count = selected ?? 0;

  await deliver(
    galleryId,
    "selection_submitted",
    to,
    selectionSubmittedEmail({
      galleryTitle: gallery.title,
      clientName: gallery.client_name,
      selectedCount: count,
      pinCount,
      awaitingPayment: awaitingPayment
        ? { extraCount: extraCount(count, gallery), amountText: formatKrw(extraAmount(count, gallery)) }
        : null,
      dashboardUrl: dashboardUrl(galleryId),
    }),
  );
}

/** 작가에게: 카드 추가 결제 완료 → 셀렉 확정 */
export async function notifyPaymentCompleted(galleryId: string, amountKrw: number) {
  const gallery = await loadGallery(galleryId);
  const to = gallery?.photographers?.email;
  if (!gallery || !to) return;

  await deliver(
    galleryId,
    "selection_submitted",
    to,
    paymentCompletedEmail({
      galleryTitle: gallery.title,
      clientName: gallery.client_name,
      amountText: formatKrw(amountKrw),
      dashboardUrl: dashboardUrl(galleryId),
    }),
  );
}

function photographerName(gallery: NonNullable<Awaited<ReturnType<typeof loadGallery>>>) {
  return gallery.photographers?.studio_name || gallery.photographers?.display_name || "사진작가";
}

/** 고객에게: 보정본 도착. 고객 이메일이 없으면 보내지 않는다. */
export async function notifyRetouchDelivered(galleryId: string) {
  const gallery = await loadGallery(galleryId);
  if (!gallery?.client_email) return;

  const { count } = await createAdminClient()
    .from("retouched_files")
    .select("id", { count: "exact", head: true })
    .eq("gallery_id", galleryId)
    .eq("match_status", "matched");

  await deliver(
    galleryId,
    "retouch_delivered",
    gallery.client_email,
    retouchDeliveredEmail({
      galleryTitle: gallery.title,
      photographerName: photographerName(gallery),
      count: count ?? 0,
      expiresText: gallery.expires_at ? formatDateKst(gallery.expires_at) : null,
      shareUrl: shareUrl(siteUrl(), gallery.share_token),
    }),
  );
}

/** 고객에게: 곧 만료 (9단계 만료 처리에서 호출) */
export async function notifyExpiryWarning(galleryId: string) {
  const gallery = await loadGallery(galleryId);
  if (!gallery?.client_email || !gallery.expires_at) return;

  await deliver(
    galleryId,
    "expiry_warning",
    gallery.client_email,
    expiryWarningEmail({
      galleryTitle: gallery.title,
      photographerName: photographerName(gallery),
      expiresText: formatDateKst(gallery.expires_at),
      shareUrl: shareUrl(siteUrl(), gallery.share_token),
    }),
  );
}
