import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { runExpiryJobs } from "@/lib/expiry";

// 하루 한 번 실행 (vercel.json의 crons).
// Vercel Cron은 CRON_SECRET 환경 변수가 있으면 `Authorization: Bearer <CRON_SECRET>`을 붙여 호출한다.
export const maxDuration = 300;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const report = await runExpiryJobs();
  console.info("[cron/expire]", report);
  return NextResponse.json(report);
}
