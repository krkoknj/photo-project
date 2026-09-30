import type { MetadataRoute } from "next";

// 홈 화면에 추가하면 주소창 없이 앱처럼 열린다 (PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "셀렉갤러리 — 사진작가용 셀렉·보정 전달",
    short_name: "셀렉갤러리",
    description: "원본 공유부터 셀렉, 보정 요청, 보정본 전달까지 한 링크로",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0e0d0c",
    theme_color: "#0e0d0c",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
