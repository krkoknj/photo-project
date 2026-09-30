import "server-only";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { getObjectBytes, putObject, storageKeys } from "@/lib/storage";

// 고객에게 보여줄 미리보기(워터마크)와 썸네일을 만든다.
// 원본은 고객에게 노출하지 않으므로 이 두 가지만 서명 URL로 전달된다.

const PREVIEW_LONG_EDGE = 2000;
const THUMB_LONG_EDGE = 480;
const WATERMARK_TEXT = "PREVIEW";

// 대각선으로 반복되는 워터마크. 글꼴이 없는 서버에서도 띠(rect)는 보이도록 함께 그린다.
function watermarkSvg(width: number, height: number) {
  const tile = Math.round(Math.max(width, height) / 4);
  const fontSize = Math.round(tile / 6);
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <pattern id="wm" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
      <rect x="0" y="${tile / 2 - fontSize}" width="${tile}" height="${fontSize * 1.6}" fill="white" fill-opacity="0.12"/>
      <text x="${tile / 2}" y="${tile / 2}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-weight="700" font-size="${fontSize}" fill="white" fill-opacity="0.45"
        stroke="black" stroke-opacity="0.25" stroke-width="${Math.max(1, fontSize / 24)}">${WATERMARK_TEXT}</text>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#wm)"/>
</svg>`);
}

export async function renderPreviews(original: Buffer) {
  const meta = await sharp(original).metadata();
  // EXIF 회전을 반영한 실제 가로·세로
  const { width, height } = meta.autoOrient;

  const { data: resized, info } = await sharp(original)
    .autoOrient()
    .resize({ width: PREVIEW_LONG_EDGE, height: PREVIEW_LONG_EDGE, fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  const preview = await sharp(resized)
    .composite([{ input: watermarkSvg(info.width, info.height) }])
    .webp({ quality: 80 })
    .toBuffer();

  const thumb = await sharp(preview)
    .resize({ width: THUMB_LONG_EDGE, height: THUMB_LONG_EDGE, fit: "inside" })
    .webp({ quality: 75 })
    .toBuffer();

  return { preview, thumb, width, height };
}

export async function processPhoto(photo: { id: string; gallery_id: string; original_key: string }) {
  const admin = createAdminClient();
  await admin.from("photos").update({ processing_status: "processing" }).eq("id", photo.id);

  try {
    const original = await getObjectBytes(photo.original_key);
    const { preview, thumb, width, height } = await renderPreviews(original);

    const previewKey = storageKeys.preview(photo.gallery_id, photo.id);
    const thumbKey = storageKeys.thumb(photo.gallery_id, photo.id);
    await Promise.all([putObject(previewKey, preview, "image/webp"), putObject(thumbKey, thumb, "image/webp")]);

    await admin
      .from("photos")
      .update({ preview_key: previewKey, thumb_key: thumbKey, width, height, processing_status: "ready" })
      .eq("id", photo.id);
  } catch (error) {
    console.error(`[processPhoto] ${photo.id} 처리 실패`, error);
    await admin.from("photos").update({ processing_status: "failed" }).eq("id", photo.id);
  }
}
