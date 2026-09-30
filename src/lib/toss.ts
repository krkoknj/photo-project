import "server-only";

// 토스페이먼츠 API (결제창 SDK v2 + API 개별 연동 키)
// https://docs.tosspayments.com/guides/v2/payment-window/integration

const API_BASE = "https://api.tosspayments.com";

export type TossResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

function authHeader(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function call<T>(secretKey: string, path: string, init: RequestInit = {}): Promise<TossResult<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { Authorization: authHeader(secretKey), "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data: body as T };
    return { ok: false, code: body.code ?? `HTTP_${res.status}`, message: body.message ?? "결제사 오류" };
  } catch {
    return { ok: false, code: "NETWORK_ERROR", message: "결제사에 연결하지 못했어요." };
  }
}

export type TossPayment = { paymentKey: string; orderId: string; totalAmount: number; status: string; method?: string };

/** 결제 승인. 같은 주문을 두 번 승인하지 않도록 멱등 키를 보낸다. */
export function confirmPayment(secretKey: string, input: { paymentKey: string; orderId: string; amount: number }) {
  return call<TossPayment>(secretKey, "/v1/payments/confirm", {
    method: "POST",
    headers: { "Idempotency-Key": `confirm-${input.orderId}` },
    body: JSON.stringify(input),
  });
}

// ─── 키 검사 ───

const CLIENT_KEY = /^(test|live)_ck_[A-Za-z0-9]+$/;
const SECRET_KEY = /^(test|live)_sk_[A-Za-z0-9]+$/;

export function keyMode(key: string) {
  return key.startsWith("live_") ? "live" : "test";
}

/** 형식 검사: API 개별 연동 키(ck/sk)인지, 테스트·라이브가 섞이지 않았는지 */
export function checkKeyFormat(clientKey: string, secretKey: string): string | null {
  if (!CLIENT_KEY.test(clientKey)) {
    return clientKey.includes("_gck_")
      ? "결제위젯 키(gck)가 아니라 'API 개별 연동 키'의 클라이언트 키(ck)를 넣어주세요."
      : "클라이언트 키 형식이 올바르지 않아요. (test_ck_… 또는 live_ck_…)";
  }
  if (!SECRET_KEY.test(secretKey)) {
    return secretKey.includes("_gsk_")
      ? "결제위젯 키(gsk)가 아니라 'API 개별 연동 키'의 시크릿 키(sk)를 넣어주세요."
      : "시크릿 키 형식이 올바르지 않아요. (test_sk_… 또는 live_sk_…)";
  }
  if (keyMode(clientKey) !== keyMode(secretKey)) return "테스트 키와 라이브 키를 섞어 쓸 수 없어요.";
  return null;
}

/**
 * 시크릿 키가 실제로 유효한지 확인한다.
 * 존재하지 않는 주문을 조회하면 유효한 키는 404(NOT_FOUND_PAYMENT), 잘못된 키는 401을 받는다.
 */
export async function verifySecretKey(secretKey: string): Promise<TossResult<null>> {
  const res = await call<unknown>(secretKey, "/v1/payments/orders/key-check-000000");
  if (res.ok || res.code === "NOT_FOUND_PAYMENT") return { ok: true, data: null };
  if (res.code === "NETWORK_ERROR") return res;
  return { ok: false, code: res.code, message: "시크릿 키가 올바르지 않아요." };
}
