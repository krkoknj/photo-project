import { type NextRequest, NextResponse } from "next/server";
import { getGalleryAccess } from "@/lib/gallery-access";
import { failTossOrder } from "@/lib/payments";

// 토스 결제창에서 고객이 취소했거나 인증에 실패했을 때 돌아오는 주소
export async function GET(request: NextRequest, { params }: RouteContext<"/g/[token]/payment/fail">) {
  const { token } = await params;
  const q = request.nextUrl.searchParams;
  const code = q.get("code") ?? "UNKNOWN";
  const message = q.get("message") ?? "결제가 완료되지 않았어요.";
  const orderId = q.get("orderId");

  const access = await getGalleryAccess(token);
  if (access.state === "ok" && orderId) await failTossOrder(access.gallery.id, orderId, { code, message });

  const back = new URL(`/g/${token}`, request.url);
  back.searchParams.set("payment", code === "PAY_PROCESS_CANCELED" ? "canceled" : "error");
  return NextResponse.redirect(back);
}
