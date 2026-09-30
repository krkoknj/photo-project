import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret, maskKey } from "./secret-box";
import { checkKeyFormat, confirmPayment, verifySecretKey } from "./toss";

beforeAll(() => {
  process.env.PAYMENT_SECRET_KEY = Buffer.alloc(32, 7).toString("base64url");
});

afterEach(() => vi.unstubAllGlobals());

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("secret-box", () => {
  it("암호화한 값을 복호화하면 원래 값이 나온다", () => {
    const sealed = encryptSecret("test_sk_abc123");
    expect(sealed).not.toContain("test_sk_abc123");
    expect(decryptSecret(sealed)).toBe("test_sk_abc123");
  });

  it("같은 값도 매번 다르게 암호화된다 (랜덤 IV)", () => {
    expect(encryptSecret("x")).not.toBe(encryptSecret("x"));
  });

  it("변조된 값은 복호화에 실패한다", () => {
    const [v, iv, tag, data] = encryptSecret("test_sk_abc123").split(".");
    const tampered = [v, iv, tag, data.slice(0, -2) + (data.endsWith("A") ? "BB" : "AA")].join(".");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("키를 가려서 보여준다", () => {
    expect(maskKey("test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R")).toBe("test_sk_****YG5R");
  });
});

describe("checkKeyFormat", () => {
  it("API 개별 연동 키 쌍은 통과", () => expect(checkKeyFormat("test_ck_abc", "test_sk_def")).toBeNull());
  it("결제위젯 키는 안내와 함께 거부", () =>
    expect(checkKeyFormat("test_gck_abc", "test_gsk_def")).toContain("API 개별 연동 키"));
  it("테스트·라이브 혼용 거부", () => expect(checkKeyFormat("test_ck_abc", "live_sk_def")).toContain("섞어"));
});

describe("confirmPayment", () => {
  it("시크릿 키로 Basic 인증하고 멱등 키를 보낸다", async () => {
    const fetchMock = mockFetch(200, { paymentKey: "pk", orderId: "o1", totalAmount: 5000, status: "DONE" });
    const res = await confirmPayment("test_sk_abc", { paymentKey: "pk", orderId: "o1", amount: 5000 });

    expect(res).toEqual({ ok: true, data: expect.objectContaining({ status: "DONE", totalAmount: 5000 }) });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.tosspayments.com/v1/payments/confirm");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from("test_sk_abc:").toString("base64")}`);
    expect(init.headers["Idempotency-Key"]).toBe("confirm-o1");
    expect(JSON.parse(init.body)).toEqual({ paymentKey: "pk", orderId: "o1", amount: 5000 });
  });

  it("실패하면 토스 오류 코드와 메시지를 돌려준다", async () => {
    mockFetch(400, { code: "REJECT_CARD_PAYMENT", message: "한도초과 혹은 잔액부족으로 결제에 실패했습니다." });
    const res = await confirmPayment("test_sk_abc", { paymentKey: "pk", orderId: "o1", amount: 5000 });
    expect(res).toEqual({ ok: false, code: "REJECT_CARD_PAYMENT", message: "한도초과 혹은 잔액부족으로 결제에 실패했습니다." });
  });

  it("네트워크 오류도 실패로 처리한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const res = await confirmPayment("test_sk_abc", { paymentKey: "pk", orderId: "o1", amount: 5000 });
    expect(res).toMatchObject({ ok: false, code: "NETWORK_ERROR" });
  });
});

describe("verifySecretKey", () => {
  it("없는 주문 조회에 404가 오면 유효한 키", async () => {
    mockFetch(404, { code: "NOT_FOUND_PAYMENT", message: "존재하지 않는 결제 정보 입니다." });
    expect((await verifySecretKey("test_sk_abc")).ok).toBe(true);
  });

  it("401이면 잘못된 키", async () => {
    mockFetch(401, { code: "UNAUTHORIZED_KEY", message: "인증되지 않은 시크릿 키 혹은 클라이언트 키 입니다." });
    expect(await verifySecretKey("test_sk_bad")).toMatchObject({ ok: false, message: "시크릿 키가 올바르지 않아요." });
  });
});
