// 업로드 규칙 (클라이언트·서버 공용)

export const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_PHOTO_BYTES = 50 * 1024 * 1024; // 로컬 Supabase Storage 기본 제한과 같음
export const MAX_UPLOAD_BATCH = 50; // 서명 URL 요청 1회당 파일 수
export const UPLOAD_CONCURRENCY = 3;

export type UploadTicket = { name: string; id: string; url: string } | { name: string; error: string };
