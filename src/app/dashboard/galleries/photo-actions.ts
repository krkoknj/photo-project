"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { processPhoto } from "@/lib/image-processing";
import { matchKey } from "@/lib/match-key";
import { headObject, moveToTrash, presignUpload, storageKeys } from "@/lib/storage";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  MAX_UPLOAD_BATCH,
  type UploadTicket,
} from "./photo-upload-rules";

// 업로드 흐름
// 1) requestUploads: 파일 목록을 검사하고 파일마다 서명된 업로드 URL을 발급한다.
// 2) 브라우저가 저장소로 직접 업로드한다 (서버를 거치지 않음).
// 3) completeUpload: 저장소에 실제로 올라왔는지 확인한 뒤 photos 행을 만들고,
//    응답 후(after) 미리보기·워터마크를 생성한다.

const uploadRequestSchema = z
  .array(z.object({ name: z.string().min(1).max(255), size: z.number().int().positive(), type: z.string() }))
  .min(1)
  .max(MAX_UPLOAD_BATCH);

// RLS로 본인 갤러리인지 확인하고, 사진을 바꿀 수 있는 상태인지 검사한다.
async function editableGallery(galleryId: string) {
  const { supabase } = await requireUser();
  const { data: gallery } = await supabase
    .from("galleries")
    .select("id, status, trashed_at")
    .eq("id", galleryId)
    .maybeSingle();

  if (!gallery) return { supabase, error: "갤러리를 찾을 수 없습니다." };
  if (gallery.trashed_at) return { supabase, error: "휴지통에 있는 갤러리예요." };
  if (gallery.status !== "draft" && gallery.status !== "open") {
    return { supabase, error: "고객이 셀렉을 제출한 뒤에는 사진을 추가하거나 뺄 수 없어요." };
  }
  return { supabase, error: null };
}

export async function requestUploads(
  galleryId: string,
  files: { name: string; size: number; type: string }[],
): Promise<{ tickets: UploadTicket[] } | { error: string }> {
  const parsed = uploadRequestSchema.safeParse(files);
  if (!parsed.success) return { error: `한 번에 ${MAX_UPLOAD_BATCH}장까지 요청할 수 있어요.` };

  const { supabase, error } = await editableGallery(galleryId);
  if (error) return { error };

  const keys = parsed.data.map((f) => matchKey(f.name));
  const { data: existing } = await supabase
    .from("photos")
    .select("match_key")
    .eq("gallery_id", galleryId)
    .in("match_key", keys);
  const taken = new Set(existing?.map((p) => p.match_key));

  const tickets: UploadTicket[] = [];
  for (const [i, file] of parsed.data.entries()) {
    const key = keys[i];
    if (!(file.type in ALLOWED_PHOTO_TYPES)) {
      tickets.push({ name: file.name, error: "JPG, PNG, WebP만 올릴 수 있어요." });
    } else if (file.size > MAX_PHOTO_BYTES) {
      tickets.push({ name: file.name, error: "50MB 이하 파일만 올릴 수 있어요." });
    } else if (taken.has(key)) {
      tickets.push({ name: file.name, error: "같은 이름의 사진이 이미 있어요." });
    } else {
      taken.add(key); // 같은 요청 안의 중복도 막는다
      const photoId = randomUUID();
      const url = await presignUpload(storageKeys.original(galleryId, photoId), file.type, file.size);
      tickets.push({ name: file.name, id: photoId, url });
    }
  }
  return { tickets };
}

export async function completeUpload(
  galleryId: string,
  photoId: string,
  filename: string,
): Promise<{ ok: true } | { error: string }> {
  if (!z.uuid().safeParse(photoId).success || !filename || filename.length > 255) {
    return { error: "잘못된 요청이에요." };
  }

  const { supabase, error } = await editableGallery(galleryId);
  if (error) return { error };

  // 서버가 id로 키를 다시 만든다. 클라이언트가 보낸 경로는 믿지 않는다.
  const originalKey = storageKeys.original(galleryId, photoId);
  const object = await headObject(originalKey);
  if (!object) return { error: "업로드된 파일을 찾을 수 없어요." };

  const { data: photo, error: insertError } = await supabase
    .from("photos")
    .insert({
      id: photoId,
      gallery_id: galleryId,
      filename,
      match_key: matchKey(filename),
      original_key: originalKey,
      size_bytes: object.size,
    })
    .select("id, gallery_id, original_key")
    .single();

  if (insertError || !photo) {
    // 같은 사진에 대한 재시도(네트워크 재전송 등)는 이미 완료된 것으로 본다.
    const { data: already } = await supabase.from("photos").select("id").eq("id", photoId).maybeSingle();
    if (already) return { ok: true };

    // 동시에 같은 이름이 올라온 경우 등. 올라간 파일은 휴지통으로 옮긴다.
    after(() => moveToTrash(originalKey));
    return {
      error: insertError?.code === "23505" ? "같은 이름의 사진이 이미 있어요." : "사진을 저장하지 못했어요.",
    };
  }

  after(() => processPhoto(photo));
  return { ok: true };
}

export async function retryProcessing(galleryId: string, photoId: string) {
  const { supabase } = await requireUser();
  const { data: photo } = await supabase
    .from("photos")
    .select("id, gallery_id, original_key")
    .eq("id", photoId)
    .eq("gallery_id", galleryId)
    .eq("processing_status", "failed")
    .maybeSingle();

  if (photo) after(() => processPhoto(photo));
  revalidatePath(`/dashboard/galleries/${galleryId}`);
}

// 사진 빼기: DB 행은 지우고, 파일은 영구 삭제 대신 trash/로 옮긴다.
export async function removePhoto(galleryId: string, photoId: string) {
  const { supabase, error } = await editableGallery(galleryId);
  if (error) return;

  const { data: photo } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId)
    .eq("gallery_id", galleryId)
    .select("original_key, preview_key, thumb_key")
    .maybeSingle();

  if (photo) {
    const keys = [photo.original_key, photo.preview_key, photo.thumb_key].filter((k): k is string => !!k);
    after(() => Promise.all(keys.map(moveToTrash)));
  }
  revalidatePath(`/dashboard/galleries/${galleryId}`);
  revalidatePath("/dashboard");
}
