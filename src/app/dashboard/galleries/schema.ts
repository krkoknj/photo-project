import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max}자 이내로 입력해주세요.`)
    .transform((v) => v || null);

export const galleryFormSchema = z.object({
  title: z.string().trim().min(1, "갤러리 이름을 입력해주세요.").max(100, "100자 이내로 입력해주세요."),
  clientName: optionalText(50),
  clientEmail: z
    .union([z.literal(""), z.email("이메일 형식이 올바르지 않습니다.")])
    .transform((v) => v || null),
  baseSelectCount: z.coerce
    .number("숫자를 입력해주세요.")
    .int("정수로 입력해주세요.")
    .min(0, "0 이상이어야 합니다.")
    .max(1000, "1000장 이하로 입력해주세요."),
  extraPriceKrw: z.coerce
    .number("숫자를 입력해주세요.")
    .int("원 단위 정수로 입력해주세요.")
    .min(0, "0 이상이어야 합니다.")
    .max(1_000_000, "100만원 이하로 입력해주세요."),
  expiresOn: z.union([z.literal(""), z.iso.date("날짜 형식이 올바르지 않습니다.")]).transform((v) => v || null),
});

export const galleryPasswordSchema = z
  .string()
  .min(4, "비밀번호는 4자 이상이어야 합니다.")
  .max(64, "비밀번호는 64자 이하여야 합니다.");

export const GALLERY_FORM_FIELDS = [
  "title",
  "clientName",
  "clientEmail",
  "baseSelectCount",
  "extraPriceKrw",
  "expiresOn",
] as const;

export function readForm(formData: FormData) {
  return Object.fromEntries(GALLERY_FORM_FIELDS.map((key) => [key, String(formData.get(key) ?? "")]));
}

// zod 오류 → 필드별 첫 메시지
export function fieldErrorsOf(error: z.ZodError) {
  const { fieldErrors } = z.flattenError(error);
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([key, messages]) => [key, (messages as string[] | undefined)?.[0]]),
  );
}
