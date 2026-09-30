"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { processRetouched } from "@/lib/image-processing";
import { matchKey } from "@/lib/match-key";
import { notifyRetouchDelivered } from "@/lib/notifications";
import { headObject, moveToTrash, presignUpload, storageKeys } from "@/lib/storage";
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES, MAX_UPLOAD_BATCH, type UploadTicket } from "./photo-upload-rules";

// 보정본 전달
// - 업로드는 원본과 같은 흐름(서명 URL → 브라우저 직접 업로드 → 완료 확인)
// - 완료 시 파일명(match_key)으로 원본과 자동 매칭, 실패하면 unmatched로 두고 작가가 직접 연결
// - 사진 한 장에 보정본은 하나. 같은 사진에 다시 올리면 이전 파일은 trash/로 옮기고 교체

const uploadRequestSchema = z
  .array(z.object({ name: z.string().min(1).max(255), size: z.number().int().positive(), type: z.string() }))
  .min(1)
  .max(MAX_UPLOAD_BATCH);

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

async function deliverableGallery(galleryId: string) {
  const { supabase } = await requireUser();
  const { data: gallery } = await supabase
    .from("galleries")
    .select("id, status, trashed_at")
    .eq("id", galleryId)
    .maybeSingle();

  if (!gallery) return { supabase, error: "갤러리를 찾을 수 없습니다." };
  if (gallery.trashed_at) return { supabase, error: "휴지통에 있는 갤러리예요." };
  if (gallery.status !== "submitted" && gallery.status !== "delivered") {
    return { supabase, error: "고객이 셀렉을 확정한 뒤에 보정본을 올릴 수 있어요." };
  }
  return { supabase, error: null };
}

function refresh(galleryId: string) {
  revalidatePath(`/dashboard/galleries/${galleryId}`);
}

async function trashRetouched(supabase: Supabase, fileIds: string[]) {
  if (!fileIds.length) return;
  const { data: removed } = await supabase
    .from("retouched_files")
    .delete()
    .in("id", fileIds)
    .select("file_key, preview_key, thumb_key");
  const keys = (removed ?? []).flatMap((f) => [f.file_key, f.preview_key, f.thumb_key]).filter((k): k is string => !!k);
  after(() => Promise.all(keys.map(moveToTrash)));
}

// 이 사진에 이미 연결된 보정본(교체 대상)
async function currentRetouchedOf(supabase: Supabase, photoId: string, exceptId?: string) {
  let q = supabase.from("retouched_files").select("id").eq("photo_id", photoId);
  if (exceptId) q = q.neq("id", exceptId);
  const { data } = await q;
  return (data ?? []).map((r) => r.id);
}

export async function requestRetouchUploads(
  galleryId: string,
  files: { name: string; size: number; type: string }[],
): Promise<{ tickets: UploadTicket[] } | { error: string }> {
  const parsed = uploadRequestSchema.safeParse(files);
  if (!parsed.success) return { error: `한 번에 ${MAX_UPLOAD_BATCH}장까지 요청할 수 있어요.` };

  const { error } = await deliverableGallery(galleryId);
  if (error) return { error };

  const tickets: UploadTicket[] = [];
  for (const file of parsed.data) {
    if (!(file.type in ALLOWED_PHOTO_TYPES)) {
      tickets.push({ name: file.name, error: "JPG, PNG, WebP만 올릴 수 있어요." });
    } else if (file.size > MAX_PHOTO_BYTES) {
      tickets.push({ name: file.name, error: "50MB 이하 파일만 올릴 수 있어요." });
    } else {
      const id = randomUUID();
      tickets.push({ name: file.name, id, url: await presignUpload(storageKeys.retouched(galleryId, id), file.type, file.size) });
    }
  }
  return { tickets };
}

export async function completeRetouchUpload(
  galleryId: string,
  fileId: string,
  filename: string,
): Promise<{ ok: true } | { error: string }> {
  if (!z.uuid().safeParse(fileId).success || !filename || filename.length > 255) return { error: "잘못된 요청이에요." };

  const { supabase, error } = await deliverableGallery(galleryId);
  if (error) return { error };

  const fileKey = storageKeys.retouched(galleryId, fileId);
  const object = await headObject(fileKey);
  if (!object) return { error: "업로드된 파일을 찾을 수 없어요." };

  // 같은 파일에 대한 재시도는 이미 완료된 것으로 본다.
  const { data: already } = await supabase.from("retouched_files").select("id").eq("id", fileId).maybeSingle();
  if (already) return { ok: true };

  const { data: photo } = await supabase
    .from("photos")
    .select("id")
    .eq("gallery_id", galleryId)
    .eq("match_key", matchKey(filename))
    .maybeSingle();

  if (photo) await trashRetouched(supabase, await currentRetouchedOf(supabase, photo.id));

  const { data: file, error: insertError } = await supabase
    .from("retouched_files")
    .insert({
      id: fileId,
      gallery_id: galleryId,
      photo_id: photo?.id ?? null,
      filename,
      file_key: fileKey,
      size_bytes: object.size,
      match_status: photo ? "matched" : "unmatched",
    })
    .select("id, gallery_id, file_key")
    .single();

  if (insertError || !file) {
    after(() => moveToTrash(fileKey));
    return { error: "보정본을 저장하지 못했어요. 다시 올려주세요." };
  }

  after(() => processRetouched(file));
  refresh(galleryId);
  return { ok: true };
}

/** 자동 매칭에 실패한 보정본을 작가가 원본에 직접 연결하거나(photoId), 연결을 끊는다(null). */
export async function assignRetouched(galleryId: string, fileId: string, photoId: string | null) {
  if (!z.uuid().safeParse(fileId).success || (photoId !== null && !z.uuid().safeParse(photoId).success)) return;
  const { supabase, error } = await deliverableGallery(galleryId);
  if (error) return;

  if (photoId) {
    const { data: photo } = await supabase.from("photos").select("id").eq("id", photoId).eq("gallery_id", galleryId).maybeSingle();
    if (!photo) return;
    await trashRetouched(supabase, await currentRetouchedOf(supabase, photoId, fileId));
  }

  await supabase
    .from("retouched_files")
    .update({ photo_id: photoId, match_status: photoId ? "matched" : "unmatched" })
    .eq("id", fileId)
    .eq("gallery_id", galleryId);
  refresh(galleryId);
}

export async function removeRetouched(galleryId: string, fileId: string) {
  const { supabase, error } = await deliverableGallery(galleryId);
  if (error) return;
  const { data } = await supabase.from("retouched_files").select("id").eq("id", fileId).eq("gallery_id", galleryId);
  await trashRetouched(supabase, (data ?? []).map((r) => r.id));
  refresh(galleryId);
}

export async function retryRetouched(galleryId: string, fileId: string) {
  const { supabase } = await requireUser();
  const { data: file } = await supabase
    .from("retouched_files")
    .select("id, gallery_id, file_key")
    .eq("id", fileId)
    .eq("gallery_id", galleryId)
    .eq("processing_status", "failed")
    .maybeSingle();
  if (file) after(() => processRetouched(file));
  refresh(galleryId);
}

/** 고객에게 전달: 연결되고 처리가 끝난 보정본이 한 장 이상 있어야 한다. */
export async function deliverGallery(galleryId: string): Promise<{ ok: true } | { error: string }> {
  const { supabase, error } = await deliverableGallery(galleryId);
  if (error) return { error };

  const { count } = await supabase
    .from("retouched_files")
    .select("id", { count: "exact", head: true })
    .eq("gallery_id", galleryId)
    .eq("match_status", "matched")
    .eq("processing_status", "ready");
  if (!count) return { error: "전달할 보정본이 없어요." };

  const { data: delivered } = await supabase
    .from("galleries")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", galleryId)
    .eq("status", "submitted")
    .select("id");
  if (delivered?.length) after(() => notifyRetouchDelivered(galleryId));
  refresh(galleryId);
  revalidatePath("/dashboard");
  return { ok: true };
}
