"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/form";
import { getGalleryAccess, grantAccess, type SharedGallery } from "@/lib/gallery-access";
import { verifyPassword } from "@/lib/password";
import { cancelPendingOrders, createTossOrder, getPaymentOptions } from "@/lib/payments";
import { siteUrl } from "@/lib/site";
import { MAX_PIN_BODY, MAX_PINS_PER_PHOTO, extraCount, selectionLimit } from "@/lib/selection";
import { createAdminClient } from "@/lib/supabase/admin";

// 고객은 로그인하지 않으므로 모든 쓰기는 관리자 클라이언트로 한다.
// 그래서 매번 공유 링크 접근 조건(비밀번호 쿠키 포함)과 갤러리 상태를 여기서 직접 검사한다.

// 무차별 대입을 늦추기 위한 지연. 운영에서는 IP 기준 요청 제한을 추가한다 (docs/plan.md).
const FAILURE_DELAY_MS = 800;

export async function unlockGallery(token: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const access = await getGalleryAccess(token);
  if (access.state === "ok") redirect(`/g/${token}`);
  if (access.state !== "locked") return { error: "갤러리를 열 수 없어요. 링크를 다시 확인해주세요." };

  const password = String(formData.get("password") ?? "");
  const valid = password.length > 0 && (await verifyPassword(password, access.gallery.password_hash!));

  if (!valid) {
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return { error: "비밀번호가 맞지 않아요." };
  }

  await grantAccess(access.gallery);
  redirect(`/g/${token}`);
}

// ─── 셀렉·핀 ───

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const uuid = z.uuid();
const CLOSED = "셀렉을 제출해서 더 이상 바꿀 수 없어요.";

async function openGallery(token: string): Promise<{ gallery: SharedGallery } | { error: string }> {
  const access = await getGalleryAccess(token);
  if (access.state !== "ok") return { error: "갤러리를 열 수 없어요. 페이지를 새로고침해주세요." };
  if (access.gallery.status !== "open") return { error: CLOSED };
  return { gallery: access.gallery };
}

async function countSelections(galleryId: string) {
  const { count } = await createAdminClient()
    .from("selections")
    .select("id", { count: "exact", head: true })
    .eq("gallery_id", galleryId);
  return count ?? 0;
}

export async function toggleSelection(token: string, photoId: string, selected: boolean): Promise<Result> {
  if (!uuid.safeParse(photoId).success) return { ok: false, error: "잘못된 요청이에요." };
  const res = await openGallery(token);
  if ("error" in res) return { ok: false, error: res.error };
  const { gallery } = res;
  const admin = createAdminClient();

  if (!selected) {
    await admin.from("selections").delete().eq("gallery_id", gallery.id).eq("photo_id", photoId);
    return { ok: true };
  }

  const { data: photo } = await admin
    .from("photos")
    .select("id")
    .eq("id", photoId)
    .eq("gallery_id", gallery.id)
    .eq("processing_status", "ready")
    .maybeSingle();
  if (!photo) return { ok: false, error: "사진을 찾을 수 없어요." };

  const limit = selectionLimit(gallery);
  if (limit !== null && (await countSelections(gallery.id)) >= limit) {
    return { ok: false, error: `최대 ${limit}장까지 고를 수 있어요.` };
  }

  const { error } = await admin
    .from("selections")
    .upsert({ gallery_id: gallery.id, photo_id: photoId }, { onConflict: "gallery_id,photo_id", ignoreDuplicates: true });
  return error ? { ok: false, error: "저장하지 못했어요. 다시 시도해주세요." } : { ok: true };
}

export async function submitSelection(token: string): Promise<Result<{ status: "submitted" | "awaiting_payment" }>> {
  const res = await openGallery(token);
  if ("error" in res) return { ok: false, error: res.error };
  const { gallery } = res;
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("selections")
    .select("id")
    .eq("gallery_id", gallery.id)
    .order("created_at")
    .order("id");
  const selected = rows ?? [];
  if (!selected.length) return { ok: false, error: "사진을 한 장 이상 골라주세요." };

  const limit = selectionLimit(gallery);
  if (limit !== null && selected.length > limit) return { ok: false, error: `최대 ${limit}장까지 고를 수 있어요.` };

  // 나중에 고른 사진부터 추가 결제 대상으로 표시한다.
  const extras = extraCount(selected.length, gallery);
  const extraIds = extras ? selected.slice(-extras).map((s) => s.id) : [];
  await admin.from("selections").update({ is_extra: false }).eq("gallery_id", gallery.id);
  if (extraIds.length) await admin.from("selections").update({ is_extra: true }).in("id", extraIds);

  const status = extras > 0 ? "awaiting_payment" : "submitted";
  // 상태 조건을 걸어서 동시에 두 번 제출돼도 한 번만 반영되게 한다.
  const { data: updated } = await admin
    .from("galleries")
    .update({ status, submitted_at: status === "submitted" ? new Date().toISOString() : null })
    .eq("id", gallery.id)
    .eq("status", "open")
    .select("id");
  if (!updated?.length) return { ok: false, error: CLOSED };

  revalidatePath(`/g/${token}`);
  return { ok: true, status };
}

// 결제 대기 중에 고객이 추가 결제 대신 다시 고르기로 한 경우
export async function reopenForPayment(token: string): Promise<Result> {
  const access = await getGalleryAccess(token);
  if (access.state !== "ok") return { ok: false, error: "갤러리를 열 수 없어요." };

  const { data } = await createAdminClient()
    .from("galleries")
    .update({ status: "open" })
    .eq("id", access.gallery.id)
    .eq("status", "awaiting_payment")
    .select("id");
  if (!data?.length) return { ok: false, error: "지금은 다시 고를 수 없어요." };

  await cancelPendingOrders(access.gallery.id);
  revalidatePath(`/g/${token}`);
  return { ok: true };
}

// ─── 추가 보정 결제 (토스 결제창) ───

export type TossCheckout = {
  clientKey: string;
  orderId: string;
  amount: number;
  orderName: string;
  customerName?: string;
  successUrl: string;
  failUrl: string;
};

export async function startTossPayment(token: string): Promise<Result<{ checkout: TossCheckout }>> {
  const access = await getGalleryAccess(token);
  if (access.state !== "ok") return { ok: false, error: "갤러리를 열 수 없어요." };
  const { gallery } = access;
  if (gallery.status !== "awaiting_payment") return { ok: false, error: "결제할 수 있는 상태가 아니에요." };

  const options = await getPaymentOptions(gallery.photographer_id);
  if (!options.toss) return { ok: false, error: "카드 결제를 받지 않는 작가님이에요. 계좌이체 안내를 확인해주세요." };

  const res = await createTossOrder(gallery);
  if ("error" in res) return { ok: false, error: res.error! };

  const base = `${siteUrl()}/g/${token}/payment`;
  return {
    ok: true,
    checkout: {
      clientKey: options.toss.clientKey,
      orderId: res.order.toss_order_id,
      amount: res.order.amount_krw,
      orderName: `${gallery.title} 추가 보정 ${res.order.extra_count}장`.slice(0, 100),
      customerName: gallery.client_name ?? undefined,
      successUrl: `${base}/success`,
      failUrl: `${base}/fail`,
    },
  };
}

const pinSchema = z.object({
  photoId: z.uuid(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  body: z.string().trim().min(1, "요청 내용을 적어주세요.").max(MAX_PIN_BODY, `${MAX_PIN_BODY}자 이내로 적어주세요.`),
});

export type PinInput = z.input<typeof pinSchema>;
export type SavedPin = { id: string; photoId: string; x: number; y: number; body: string };

export async function addPin(token: string, input: PinInput): Promise<Result<{ pin: SavedPin }>> {
  const parsed = pinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const res = await openGallery(token);
  if ("error" in res) return { ok: false, error: res.error };
  const { gallery } = res;
  const { photoId, x, y, body } = parsed.data;
  const admin = createAdminClient();

  // 보정 요청은 고른 사진에만 남길 수 있다.
  const { data: selection } = await admin
    .from("selections")
    .select("id")
    .eq("gallery_id", gallery.id)
    .eq("photo_id", photoId)
    .maybeSingle();
  if (!selection) return { ok: false, error: "먼저 사진을 골라주세요." };

  const { count } = await admin
    .from("retouch_pins")
    .select("id", { count: "exact", head: true })
    .eq("photo_id", photoId);
  if ((count ?? 0) >= MAX_PINS_PER_PHOTO) {
    return { ok: false, error: `사진 한 장에 ${MAX_PINS_PER_PHOTO}개까지 남길 수 있어요.` };
  }

  const { data: pin, error } = await admin
    .from("retouch_pins")
    .insert({ gallery_id: gallery.id, photo_id: photoId, x, y, body, author: "client" })
    .select("id, photo_id, x, y, body")
    .single();
  if (error || !pin) return { ok: false, error: "저장하지 못했어요. 다시 시도해주세요." };

  return { ok: true, pin: { id: pin.id, photoId: pin.photo_id, x: Number(pin.x), y: Number(pin.y), body: pin.body } };
}

// 제출 전 고객이 자기 요청을 지우는 경우. 아직 작가에게 전달되기 전의 초안이라 바로 삭제한다.
export async function removePin(token: string, pinId: string): Promise<Result> {
  if (!uuid.safeParse(pinId).success) return { ok: false, error: "잘못된 요청이에요." };
  const res = await openGallery(token);
  if ("error" in res) return { ok: false, error: res.error };

  await createAdminClient()
    .from("retouch_pins")
    .delete()
    .eq("id", pinId)
    .eq("gallery_id", res.gallery.id)
    .eq("author", "client");
  return { ok: true };
}
