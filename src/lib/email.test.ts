import { afterEach, describe, expect, it, vi } from "vitest";
import { emailTransport, sendEmail } from "./email";
import { escapeHtml, retouchDeliveredEmail, selectionSubmittedEmail } from "./email-templates";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const email = { to: "a@photo.test", subject: "제목", html: "<p>본문</p>", text: "본문" };

describe("sendEmail", () => {
  it("RESEND_API_KEY가 있으면 Resend로 보낸다", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_123");
    vi.stubEnv("MAILPIT_URL", "http://127.0.0.1:54324");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(emailTransport()).toBe("resend");
    expect(await sendEmail(email)).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test_123");
    expect(JSON.parse(init.body)).toMatchObject({ to: ["a@photo.test"], subject: "제목" });
  });

  it("로컬에서는 Mailpit으로 보낸다", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("MAILPIT_URL", "http://127.0.0.1:54324/");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await sendEmail(email)).toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:54324/api/v1/send");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ To: [{ Email: "a@photo.test" }], Subject: "제목" });
  });

  it("실패 응답은 오류로 돌려준다", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_123");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid from", { status: 422 })));
    expect(await sendEmail(email)).toEqual({ ok: false, error: "HTTP 422: invalid from" });
  });
});

describe("email templates", () => {
  it("escapeHtml", () => expect(escapeHtml(`<b>"A&B"</b>`)).toBe("&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;"));

  it("사용자 입력(갤러리 이름)은 HTML로 해석되지 않는다", () => {
    const mail = retouchDeliveredEmail({
      galleryTitle: `<script>alert(1)</script>`,
      photographerName: "스튜디오",
      count: 3,
      expiresText: null,
      shareUrl: "http://localhost:3000/g/abc",
    });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.text).toContain("http://localhost:3000/g/abc");
  });

  it("결제 대기면 제목과 본문에 안내가 들어간다", () => {
    const mail = selectionSubmittedEmail({
      galleryTitle: "도쿄 스냅",
      clientName: "김민지",
      selectedCount: 33,
      pinCount: 4,
      awaitingPayment: { extraCount: 3, amountText: "15,000원" },
      dashboardUrl: "http://localhost:3000/dashboard/galleries/1",
    });
    expect(mail.subject).toBe("김민지님이 셀렉을 제출했어요 (추가 결제 대기)");
    expect(mail.text).toContain("추가 3장(15,000원)");
  });
});
