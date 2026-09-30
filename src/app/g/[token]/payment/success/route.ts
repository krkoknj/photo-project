import { after, type NextRequest, NextResponse } from "next/server";
import { getGalleryAccess } from "@/lib/gallery-access";
import { notifyPaymentCompleted } from "@/lib/notifications";
import { confirmTossOrder } from "@/lib/payments";

// 토스 결제창 인증 성공 후 돌아오는 주소. 여기서 서버가 결제를 승인한 뒤 갤러리로 돌려보낸다.
export async function GET(request: NextRequest, { params }: RouteContext<"/g/[token]/payment/success">) {
  const { token } = await params;
  const q = request.nextUrl.searchParams;
  const paymentKey = q.get("paymentKey") ?? "";
  const orderId = q.get("orderId") ?? "";
  const amount = Number(q.get("amount"));

  const back = new URL(`/g/${token}`, request.url);
  const access = await getGalleryAccess(token);

  if (access.state !== "ok" || !paymentKey || !orderId || !Number.isInteger(amount)) {
    back.searchParams.set("payment", "error");
    return NextResponse.redirect(back);
  }

  const outcome = await confirmTossOrder(access.gallery, { paymentKey, orderId, amount });
  if (outcome.ok && outcome.newlyPaid) {
    const galleryId = access.gallery.id;
    after(() => notifyPaymentCompleted(galleryId, outcome.amount));
  }
  // 결과 문구는 URL로 넘기지 않는다 (임의 문구를 띄우는 링크를 만들 수 없도록). 상세 사유는 주문 기록(raw)에 남는다.
  if (!outcome.ok) console.warn(`[payment] 승인 실패 ${orderId}: ${outcome.message}`);
  back.searchParams.set("payment", outcome.ok ? "done" : "error");
  return NextResponse.redirect(back);
}
