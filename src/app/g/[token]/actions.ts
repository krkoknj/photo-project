"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/components/form";
import { getGalleryAccess, grantAccess } from "@/lib/gallery-access";
import { verifyPassword } from "@/lib/password";

// 무차별 대입을 늦추기 위한 지연. 운영에서는 IP 기준 요청 제한을 추가한다 (docs/plan.md).
const FAILURE_DELAY_MS = 800;

export async function unlockGallery(token: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const access = await getGalleryAccess(token);
  if (access.state === "ok") redirect(`/g/${token}`);
  if (access.state !== "locked") return { error: "갤러리를 열 수 없어요. 링크를 다시 확인해주세요." };

  const password = String(formData.get("password") ?? "");
  const valid = password.length > 0 && (await verifyPassword(password, access.gallery.password_hash!));

  if (!valid) {
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return { error: "비밀번호가 맞지 않아요." };
  }

  await grantAccess(access.gallery);
  redirect(`/g/${token}`);
}
