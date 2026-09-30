import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// 작가의 토스 시크릿 키 같은 비밀 값을 DB에 저장하기 전에 암호화한다 (AES-256-GCM).
// 형식: v1.<iv>.<tag>.<ciphertext> (각각 base64url)

const VERSION = "v1";

function key() {
  const raw = Buffer.from(process.env.PAYMENT_SECRET_KEY ?? "", "base64url");
  if (raw.length !== 32) throw new Error("PAYMENT_SECRET_KEY must be 32 bytes (base64url)");
  return raw;
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), encrypted].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function decryptSecret(sealed: string) {
  const [version, iv, tag, encrypted] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || !encrypted) throw new Error("Unsupported secret format");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

/** 화면 표시용: test_sk_****abcd */
export function maskKey(value: string) {
  const prefix = value.match(/^(test|live)_[a-z]+_/)?.[0] ?? "";
  return `${prefix}****${value.slice(-4)}`;
}
