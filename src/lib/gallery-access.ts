import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// 고객(로그인 없음)의 공유 링크 접근 판단.
// 고객 요청은 RLS를 쓸 수 없으므로 관리자 클라이언트로 조회하고, 여기서 접근 조건을 직접 검사한다.

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30일

const GALLERY_FIELDS =
  "id, photographer_id, title, client_name, share_token, password_hash, base_select_count, extra_price_krw, status, expires_at, delivered_at, trashed_at, photographers(display_name, studio_name)";

async function findByToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) return null;
  const { data } = await createAdminClient()
    .from("galleries")
    .select(GALLERY_FIELDS)
    .eq("share_token", token)
    .maybeSingle();
  return data;
}

export type SharedGallery = NonNullable<Awaited<ReturnType<typeof findByToken>>>;

export type GalleryAccess =
  | { state: "not_found" }
  | { state: "not_open" }
  | { state: "expired" }
  | { state: "locked"; gallery: SharedGallery }
  | { state: "ok"; gallery: SharedGallery };

// ─── 비밀번호 통과 쿠키 ───
// 서명에 share_token과 password_hash를 넣어서, 링크 재발급이나 비밀번호 변경 시 기존 쿠키가 자동으로 무효가 된다.

const cookieName = (galleryId: string) => `g_${galleryId}`;

function sign(gallery: Pick<SharedGallery, "id" | "share_token" | "password_hash">) {
  return createHmac("sha256", process.env.GALLERY_ACCESS_SECRET!)
    .update(`${gallery.id}:${gallery.share_token}:${gallery.password_hash ?? ""}`)
    .digest("base64url");
}

async function hasAccessCookie(gallery: SharedGallery) {
  const value = (await cookies()).get(cookieName(gallery.id))?.value;
  if (!value) return false;
  const expected = Buffer.from(sign(gallery));
  const actual = Buffer.from(value);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function grantAccess(gallery: SharedGallery) {
  (await cookies()).set(cookieName(gallery.id), sign(gallery), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
}

// ─── 접근 판단 ───

export async function getGalleryAccess(token: string): Promise<GalleryAccess> {
  const gallery = await findByToken(token);

  if (!gallery || gallery.trashed_at) return { state: "not_found" };
  if (gallery.status === "draft") return { state: "not_open" };
  // 만료 처리(cron)가 아직 돌지 않았어도 기한이 지났으면 닫는다.
  if (gallery.status === "expired" || (gallery.expires_at && new Date(gallery.expires_at) < new Date())) {
    return { state: "expired" };
  }
  if (gallery.password_hash && !(await hasAccessCookie(gallery))) return { state: "locked", gallery };
  return { state: "ok", gallery };
}
