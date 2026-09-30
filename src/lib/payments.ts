import "server-only";
import { randomBytes } from "node:crypto";
import type { SharedGallery } from "@/lib/gallery-access";
import { extraAmount, extraCount } from "@/lib/selection";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/secret-box";
import { confirmPayment } from "@/lib/toss";

// 추가 보정 결제. 금액은 항상 DB(셀렉 수 × 장당 가격)로 다시 계산하고, 브라우저가 보낸 값은 믿지 않는다.

export type PaymentOptions = {
  toss: { clientKey: string } | null;
  bank: { bankName: string; account: string; holder: string } | null;
};

export async function getPaymentOptions(photographerId: string): Promise<PaymentOptions> {
  const { data } = await createAdminClient()
    .from("payment_settings")
    .select("toss_client_key, toss_secret_key_encrypted, bank_name, bank_account, bank_holder")
    .eq("photographer_id", photographerId)
    .maybeSingle();

  return {
    toss:
      data?.toss_client_key && data.toss_secret_key_encrypted ? { clientKey: data.toss_client_key } : null,
    bank:
      data?.bank_name && data.bank_account && data.bank_holder
        ? { bankName: data.bank_name, account: data.bank_account, holder: data.bank_holder }
        : null,
  };
}

type Rules = Pick<SharedGallery, "id" | "base_select_count" | "extra_price_krw">;

/** 현재 셀렉 기준으로 결제해야 할 추가 장수와 금액 */
export async function expectedExtra(gallery: Rules) {
  const { count } = await createAdminClient()
    .from("selections")
    .select("id", { count: "exact", head: true })
    .eq("gallery_id", gallery.id);
  const selected = count ?? 0;
  return { extra: extraCount(selected, gallery), amount: extraAmount(selected, gallery) };
}

/** 셀렉을 다시 열 때, 아직 결제되지 않은 주문을 취소한다. */
export async function cancelPendingOrders(galleryId: string) {
  await createAdminClient()
    .from("orders")
    .update({ status: "canceled" })
    .eq("gallery_id", galleryId)
    .eq("status", "pending");
}

// 토스 orderId 규칙: 6~64자, 영문·숫자·-·_
const newOrderId = () => `g${randomBytes(12).toString("base64url")}`;

export async function createTossOrder(gallery: SharedGallery) {
  const { extra, amount } = await expectedExtra(gallery);
  if (extra <= 0) return { error: "결제할 추가 장수가 없어요." } as const;

  await cancelPendingOrders(gallery.id); // 이전에 열었다 닫은 결제창 주문 정리
  const { data: order, error } = await createAdminClient()
    .from("orders")
    .insert({
      gallery_id: gallery.id,
      method: "toss",
      toss_order_id: newOrderId(),
      extra_count: extra,
      unit_price_krw: gallery.extra_price_krw,
      amount_krw: amount,
    })
    .select("toss_order_id, amount_krw, extra_count")
    .single();
  if (error || !order) return { error: "주문을 만들지 못했어요." } as const;
  return { order } as const;
}

export type ConfirmOutcome = { ok: true; newlyPaid: boolean; amount: number } | { ok: false; message: string };

/** 토스 결제창 인증 성공 후 서버 승인 */
export async function confirmTossOrder(
  gallery: SharedGallery,
  input: { paymentKey: string; orderId: string; amount: number },
): Promise<ConfirmOutcome> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, amount_krw")
    .eq("gallery_id", gallery.id)
    .eq("toss_order_id", input.orderId)
    .eq("method", "toss")
    .maybeSingle();

  if (!order) return { ok: false, message: "주문을 찾을 수 없어요." };
  if (order.status === "paid") return { ok: true, newlyPaid: false, amount: order.amount_krw }; // 새로고침 등으로 다시 들어온 경우
  if (order.status !== "pending") return { ok: false, message: "취소되었거나 만료된 주문이에요. 다시 결제해주세요." };

  const fail = async (message: string, raw?: unknown) => {
    await admin.from("orders").update({ status: "failed", raw: (raw ?? null) as never }).eq("id", order.id);
    return { ok: false, message } as const;
  };

  // 토스가 돌려준 금액, 주문 금액, 지금 셀렉 기준 금액이 모두 같아야 한다.
  const { amount: expected } = await expectedExtra(gallery);
  if (input.amount !== order.amount_krw || order.amount_krw !== expected) {
    return fail("결제 금액이 맞지 않아요. 다시 시도해주세요.");
  }
  if (gallery.status !== "awaiting_payment") return fail("결제할 수 있는 상태가 아니에요.");

  const { data: settings } = await admin
    .from("payment_settings")
    .select("toss_secret_key_encrypted")
    .eq("photographer_id", gallery.photographer_id)
    .maybeSingle();
  if (!settings?.toss_secret_key_encrypted) return fail("작가님의 결제 설정이 없어요.");

  const res = await confirmPayment(decryptSecret(settings.toss_secret_key_encrypted), input);
  if (!res.ok) return fail(res.message, res);

  await admin
    .from("orders")
    .update({ status: "paid", payment_key: res.data.paymentKey, paid_at: new Date().toISOString(), raw: res.data as never })
    .eq("id", order.id);
  await admin
    .from("galleries")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", gallery.id)
    .eq("status", "awaiting_payment");
  return { ok: true, newlyPaid: true, amount: order.amount_krw };
}

/** 토스 결제창에서 취소·실패로 돌아온 경우 */
export async function failTossOrder(galleryId: string, orderId: string, reason: { code: string; message: string }) {
  await createAdminClient()
    .from("orders")
    .update({ status: "failed", raw: reason })
    .eq("gallery_id", galleryId)
    .eq("toss_order_id", orderId)
    .eq("status", "pending");
}
