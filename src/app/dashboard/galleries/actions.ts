"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { endOfDayKst, isSelectionLocked } from "@/lib/gallery";
import { hashPassword } from "@/lib/password";
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
    .select("status, base_select_count, extra_price_krw")
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

  const { error } = await supabase
    .from("galleries")
    .update({
      title: v.title,
      client_name: v.clientName,
      client_email: v.clientEmail,
      base_select_count: v.baseSelectCount,
      extra_price_krw: v.extraPriceKrw,
      expires_at: v.expiresOn ? endOfDayKst(v.expiresOn) : null,
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
