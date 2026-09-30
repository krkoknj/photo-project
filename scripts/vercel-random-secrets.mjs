// 운영(Vercel)에 앱 내부용 랜덤 비밀 값을 만들어 넣는다. 값은 화면에 출력하지 않는다.
//   node scripts/vercel-random-secrets.mjs
//
// 이미 설정된 값은 건너뛴다. 특히 PAYMENT_SECRET_KEY를 바꾸면 저장된 작가 토스 키를
// 복호화할 수 없게 되므로 절대 덮어쓰지 않는다.

import { randomBytes } from "node:crypto";
import { execSync, spawnSync } from "node:child_process";

const NAMES = ["GALLERY_ACCESS_SECRET", "PAYMENT_SECRET_KEY", "CRON_SECRET"];
const vercel = "npx --yes vercel@latest";

const listed = execSync(`${vercel} env ls production`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const existing = new Set(NAMES.filter((name) => new RegExp(`^\\s*${name}\\s`, "m").test(listed)));

for (const name of NAMES) {
  if (existing.has(name)) {
    console.log(`- ${name}: 이미 있음, 건너뜀`);
    continue;
  }
  const value = randomBytes(32).toString("base64url");
  const res = spawnSync(`${vercel} env add ${name} production`, {
    input: value,
    shell: true,
    encoding: "utf8",
    stdio: ["pipe", "ignore", "pipe"],
  });
  console.log(res.status === 0 ? `✓ ${name}: 설정함` : `✗ ${name}: 실패\n${res.stderr}`);
}
