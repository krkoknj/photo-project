// 알림 메일 본문. 사용자가 입력한 값(갤러리 이름, 고객 이름 등)은 반드시 escape한다.

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

type Rendered = { subject: string; html: string; text: string };

function layout({ heading, lines, cta }: { heading: string; lines: string[]; cta: { label: string; url: string } }) {
  const html = `<!doctype html>
<html lang="ko"><body style="margin:0;padding:24px;background:#f5f5f5;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#171717">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:28px">
    <p style="margin:0 0 16px;font-size:13px;color:#737373">셀렉갤러리</p>
    <h1 style="margin:0 0 16px;font-size:20px;line-height:1.4">${escapeHtml(heading)}</h1>
    ${lines.map((l) => `<p style="margin:0 0 8px;font-size:15px;line-height:1.6">${escapeHtml(l)}</p>`).join("\n    ")}
    <p style="margin:24px 0 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:15px;font-weight:600">${escapeHtml(cta.label)}</a></p>
  </div>
</body></html>`;
  const text = [heading, "", ...lines, "", `${cta.label}: ${cta.url}`].join("\n");
  return { html, text };
}

/** 작가에게: 고객이 셀렉을 제출했다 (추가 결제가 필요하면 결제 대기) */
export function selectionSubmittedEmail(p: {
  galleryTitle: string;
  clientName: string | null;
  selectedCount: number;
  pinCount: number;
  awaitingPayment: { extraCount: number; amountText: string } | null;
  dashboardUrl: string;
}): Rendered {
  const who = p.clientName ? `${p.clientName}님` : "고객";
  const heading = p.awaitingPayment
    ? `${who}이 셀렉을 제출했어요 (추가 결제 대기)`
    : `${who}이 셀렉을 제출했어요`;
  const lines = [
    `갤러리: ${p.galleryTitle}`,
    `고른 사진 ${p.selectedCount}장 · 보정 요청 ${p.pinCount}개`,
    ...(p.awaitingPayment
      ? [
          `추가 ${p.awaitingPayment.extraCount}장(${p.awaitingPayment.amountText}) 결제를 기다리고 있어요.`,
          "계좌이체로 받았다면 입금을 확인한 뒤 갤러리 화면에서 '입금 확인'을 눌러주세요.",
        ]
      : []),
  ];
  return { subject: heading, ...layout({ heading, lines, cta: { label: "셀렉 결과 보기", url: p.dashboardUrl } }) };
}

/** 작가에게: 고객이 카드로 추가 결제를 마쳐 셀렉이 확정됐다 */
export function paymentCompletedEmail(p: {
  galleryTitle: string;
  clientName: string | null;
  amountText: string;
  dashboardUrl: string;
}): Rendered {
  const who = p.clientName ? `${p.clientName}님` : "고객";
  const heading = `${who}이 추가 보정 비용을 결제했어요`;
  const lines = [`갤러리: ${p.galleryTitle}`, `결제 금액: ${p.amountText}`, "셀렉이 확정됐어요. 보정을 시작해주세요."];
  return { subject: heading, ...layout({ heading, lines, cta: { label: "셀렉 결과 보기", url: p.dashboardUrl } }) };
}

/** 고객에게: 보정본이 도착했다 */
export function retouchDeliveredEmail(p: {
  galleryTitle: string;
  photographerName: string;
  count: number;
  expiresText: string | null;
  shareUrl: string;
}): Rendered {
  const heading = `보정본 ${p.count}장이 도착했어요`;
  const lines = [
    `${p.photographerName}님이 "${p.galleryTitle}" 보정본을 보냈어요.`,
    "링크에서 한 장씩 또는 전체를 원본 화질로 받을 수 있어요.",
    ...(p.expiresText ? [`${p.expiresText}까지 받을 수 있으니 그 전에 저장해주세요.`] : []),
  ];
  return { subject: heading, ...layout({ heading, lines, cta: { label: "보정본 받기", url: p.shareUrl } }) };
}

/** 고객에게: 곧 공유 기간이 끝난다 (9단계 만료 처리에서 사용) */
export function expiryWarningEmail(p: {
  galleryTitle: string;
  photographerName: string;
  expiresText: string;
  shareUrl: string;
}): Rendered {
  const heading = `사진 공유 기간이 ${p.expiresText}에 끝나요`;
  const lines = [
    `${p.photographerName}님의 "${p.galleryTitle}" 갤러리가 곧 닫혀요.`,
    "아직 받지 않은 사진이 있다면 기간 안에 저장해주세요.",
  ];
  return { subject: heading, ...layout({ heading, lines, cta: { label: "갤러리 열기", url: p.shareUrl } }) };
}
