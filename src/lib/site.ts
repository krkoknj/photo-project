// 고객 공유 링크 등 절대 URL을 만들 때 사용하는 사이트 주소
export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
