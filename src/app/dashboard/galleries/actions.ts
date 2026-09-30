"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { endOfDayKst, isSelectionLocked } from "@/lib/gallery";
import { hashPassword } from "@/lib/password";
import { cancelPendingOrders, expectedExtra } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrorsOf, galleryFormSchema, galleryPasswordSchema, readForm } from "./schema";

// 모든 쿼리는 로그인한 작가의 세션으로 실행되므로 RLS가 소유권을 보장한다.
// 다른 작가의 갤러리 id를 넘기면 0건이 갱신되고 "찾을 수 없음"으로 처리된다.

const NOT_FOUND = "갤러리를 찾을 수 없습니다.";
const SAVE_FAILED = "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";

function refresh(galleryId?: string) {
  revalidatePath("/dashboard");
  if (galleryId) revalidatePath(`/dashboard/galleries/${galleryId}`);
}

export async function createGallery(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUser();

  const values = readForm(formData);
  const parsed = galleryFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const password = String(formData.get("password") ?? "");
  if (password) {
    const checked = galleryPasswordSchema.safeParse(password);
    if (!checked.success) return { fieldErrors: { password: checked.error.issues[0].message }, values };
  }

  const v = parsed.data;
  const { data, error } = await supabase
    .from("galleries")
    .insert({
      photographer_id: userId,
      title: v.title,
      client_name: v.clientName,
      client_email: v.clientEmail,
      base_select_count: v.baseSelectCount,
      extra_price_krw: v.extraPriceKrw,
      expires_at: v.expiresOn ? endOfDayKst(v.expiresOn) : null,
      password_hash: password ? await hashPassword(password) : null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: SAVE_FAILED, values };

  refresh();
  redirect(`/dashboard/galleries/${data.id}`);
}

export async function updateGallery(galleryId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();

  const values = readForm(formData);
  const parsed = galleryFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const { data: current } = await supabase
    .from("galleries")
    .select("status, base_select_count, extra_price_krw, submitted_at, delivered_at")
    .eq("id", galleryId)
    .maybeSingle();
  if (!current) return { error: NOT_FOUND, values };

  const v = parsed.data;
  if (
    isSelectionLocked(current.status) &&
    (v.baseSelectCount !== current.base_select_count || v.extraPriceKrw !== current.extra_price_krw)
  ) {
    return { error: "고객이 셀렉을 제출한 뒤에는 셀렉 장수와 추가 보정 가격을 바꿀 수 없습니다.", values };
  }

  const expiresAt = v.expiresOn ? endOfDayKst(v.expiresOn) : null;
  // 만료된 갤러리의 기한을 늘리면 만료 전 단계로 되돌려 고객 링크를 다시 연다 (정리된 원본은 복구되지 않음).
  const reopened =
    current.status === "expired" && (!expiresAt || new Date(expiresAt) > new Date())
      ? { status: current.delivered_at ? ("delivered" as const) : current.submitted_at ? ("submitted" as const) : ("open" as const) }
      : {};

  const { error } = await supabase
    .from("galleries")
    .update({
      title: v.title,
      client_name: v.clientName,
      client_email: v.clientEmail,
      base_select_count: v.baseSelectCount,
      extra_price_krw: v.extraPriceKrw,
      expires_at: expiresAt,
      ...reopened,
    })
    .eq("id", galleryId);

  if (error) return { error: SAVE_FAILED, values };

  refresh(galleryId);
  return { message: "저장했어요.", values };
}

export async function setGalleryPassword(galleryId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();

  const checked = galleryPasswordSchema.safeParse(String(formData.get("password") ?? ""));
  if (!checked.success) return { fieldErrors: { password: checked.error.issues[0].message } };

  const { data, error } = await supabase
    .from("galleries")
    .update({ password_hash: await hashPassword(checked.data) })
    .eq("id", galleryId)
    .select("id");

  if (error) return { error: SAVE_FAILED };
  if (!data?.length) return { error: NOT_FOUND };

  refresh(galleryId);
  return { message: "비밀번호를 설정했어요." };
}

export async function removeGalleryPassword(galleryId: string) {
  const { supabase } = await requireUser();
  await supabase.from("galleries").update({ password_hash: null }).eq("id", galleryId);
  refresh(galleryId);
}

// 작가가 직접 바꿀 수 있는 상태는 비공개 ↔ 셀렉 진행 중 뿐이다.
export async function setGalleryVisibility(galleryId: string, visibility: "draft" | "open") {
  // 바인딩된 인자도 클라이언트에서 조작될 수 있으므로 다시 검사한다.
  if (visibility !== "draft" && visibility !== "open") return;
  const { supabase } = await requireUser();
  await supabase
    .from("galleries")
    .update({ status: visibility })
    .eq("id", galleryId)
    .in("status", ["draft", "open"]);
  refresh(galleryId);
}

// 고객이 제출한 셀렉을 수정하고 싶어할 때 작가가 다시 열어준다. 추가 결제가 끝난 뒤에는 열 수 없다.
export async function reopenSelection(galleryId: string) {
  const { supabase } = await requireUser();

  const { count: paid } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("gallery_id", galleryId)
    .eq("status", "paid");
  if (paid) return;

  const { data: reopened } = await supabase
    .from("galleries")
    .update({ status: "open", submitted_at: null })
    .eq("id", galleryId)
    .in("status", ["submitted", "awaiting_payment"])
    .select("id");
  if (reopened?.length) await cancelPendingOrders(galleryId);
  refresh(galleryId);
}

// 계좌이체 입금을 작가가 확인한 경우. 금액은 지금 셀렉 기준으로 서버가 계산한다.
export async function confirmManualPayment(galleryId: string) {
  const { supabase } = await requireUser();
  // RLS로 본인 갤러리인지 확인한 뒤에만 관리자 클라이언트로 주문을 기록한다 (orders는 작가가 직접 쓸 수 없음).
  const { data: gallery } = await supabase
    .from("galleries")
    .select("id, status, base_select_count, extra_price_krw")
    .eq("id", galleryId)
    .maybeSingle();
  if (!gallery || gallery.status !== "awaiting_payment") return;

  const { extra, amount } = await expectedExtra(gallery);
  if (extra <= 0) return;

  const admin = createAdminClient();
  await cancelPendingOrders(galleryId);
  const { error } = await admin.from("orders").insert({
    gallery_id: galleryId,
    method: "manual",
    toss_order_id: `manual-${randomBytes(9).toString("base64url")}`,
    extra_count: extra,
    unit_price_krw: gallery.extra_price_krw,
    amount_krw: amount,
    status: "paid",
    paid_at: new Date().toISOString(),
  });
  if (error) return;

  await admin
    .from("galleries")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", galleryId)
    .eq("status", "awaiting_payment");
  refresh(galleryId);
}

// 링크가 유출됐을 때 기존 링크를 무효화한다.
export async function regenerateShareToken(galleryId: string) {
  const { supabase } = await requireUser();
  await supabase
    .from("galleries")
    .update({ share_token: randomBytes(18).toString("base64url") })
    .eq("id", galleryId);
  refresh(galleryId);
}

// 영구 삭제하지 않고 휴지통으로 옮긴다.
export async function trashGallery(galleryId: string) {
  const { supabase } = await requireUser();
  await supabase.from("galleries").update({ trashed_at: new Date().toISOString() }).eq("id", galleryId);
  refresh(galleryId);
  revalidatePath("/dashboard/trash");
  redirect("/dashboard");
}

export async function restoreGallery(galleryId: string) {
  const { supabase } = await requireUser();
  await supabase.from("galleries").update({ trashed_at: null }).eq("id", galleryId);
  refresh(galleryId);
  revalidatePath("/dashboard/trash");
}
