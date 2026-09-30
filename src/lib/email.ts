import "server-only";

// 메일 발송. 운영은 Resend, 로컬은 Supabase에 포함된 Mailpit(계정 불필요)으로 보낸다.
// 둘 다 HTTP API라 SDK 없이 fetch로 호출한다.

export type Email = { to: string; subject: string; html: string; text: string };
export type SendResult = { ok: true } | { ok: false; error: string };

const FROM_EMAIL = () => process.env.EMAIL_FROM ?? "noreply@selectgallery.test";
const FROM_NAME = "셀렉갤러리";

export function emailTransport(): "resend" | "mailpit" | "none" {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.MAILPIT_URL) return "mailpit";
  return "none";
}

async function post(url: string, body: unknown, headers: Record<string, string> = {}): Promise<SendResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "network error" };
  }
}

export async function sendEmail(email: Email): Promise<SendResult> {
  switch (emailTransport()) {
    case "resend":
      // https://resend.com/docs/api-reference/emails/send-email
      return post(
        "https://api.resend.com/emails",
        { from: `${FROM_NAME} <${FROM_EMAIL()}>`, to: [email.to], subject: email.subject, html: email.html, text: email.text },
        { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      );
    case "mailpit":
      return post(`${process.env.MAILPIT_URL!.replace(/\/$/, "")}/api/v1/send`, {
        From: { Email: FROM_EMAIL(), Name: FROM_NAME },
        To: [{ Email: email.to }],
        Subject: email.subject,
        HTML: email.html,
        Text: email.text,
      });
    case "none":
      console.info(`[email] 발송 설정 없음. 건너뜀: ${email.subject} → ${email.to}`);
      return { ok: false, error: "no email transport configured" };
  }
}
