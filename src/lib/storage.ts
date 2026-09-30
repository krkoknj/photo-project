import "server-only";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 호환 저장소. 로컬은 Supabase Storage, 운영은 Cloudflare R2 (환경 변수만 교체).
const bucket = process.env.S3_BUCKET!;

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "auto",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

const UPLOAD_URL_TTL = 60 * 15; // 업로드 URL 15분
const VIEW_URL_TTL = 60 * 60; // 보기 URL 1시간

export const storageKeys = {
  // 원본 키에는 확장자를 넣지 않는다 (원래 파일명은 DB에 보관). 서버가 id만으로 키를 만들 수 있어 조작할 여지가 없다.
  original: (galleryId: string, photoId: string) => `galleries/${galleryId}/originals/${photoId}`,
  preview: (galleryId: string, photoId: string) => `galleries/${galleryId}/previews/${photoId}.webp`,
  thumb: (galleryId: string, photoId: string) => `galleries/${galleryId}/thumbs/${photoId}.webp`,
};

/** 브라우저가 저장소로 직접 올릴 수 있는 서명 URL. 타입·크기를 서명에 포함해 다른 파일로 바꿔치기 못하게 한다. */
export function presignUpload(key: string, contentType: string, contentLength: number) {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: contentLength }),
    { expiresIn: UPLOAD_URL_TTL, signableHeaders: new Set(["content-type", "content-length"]) },
  );
}

export function presignView(key: string) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: VIEW_URL_TTL });
}

/** 객체가 없으면 null */
export async function headObject(key: string) {
  try {
    const res = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { size: res.ContentLength ?? 0, contentType: res.ContentType };
  } catch (error) {
    if ((error as { name?: string }).name === "NotFound") return null;
    throw error;
  }
}

export async function getObjectBytes(key: string) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return Buffer.from(await res.Body!.transformToByteArray());
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

/**
 * 영구 삭제 대신 trash/ 경로로 옮긴다.
 * 운영(R2)에서는 수명 주기 규칙으로 trash/ 아래 객체를 7일 뒤 삭제한다.
 */
export async function moveToTrash(key: string) {
  if (!(await headObject(key))) return;
  await s3.send(
    new CopyObjectCommand({ Bucket: bucket, Key: `trash/${key}`, CopySource: `${bucket}/${encodeURI(key)}` }),
  );
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
