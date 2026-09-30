import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

// 라틴 글꼴은 next/font로 자체 호스팅한다.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// 제목: 대비가 큰 세리프(이탤릭 포함)로 에디토리얼 느낌을 낸다.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

// 한글 글꼴(나눔명조, Noto Sans KR)은 조각이 수백 개라 Google Fonts CDN에서 직접 받는다.
// unicode-range로 페이지에 쓰인 글자 조각만 내려받는다.
const KOREAN_FONTS_CSS =
  "https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Noto+Sans+KR:wght@300..700&display=swap";

export const metadata: Metadata = {
  title: { default: "셀렉갤러리", template: "%s · 셀렉갤러리" },
  description: "사진작가용 셀렉·보정 전달 갤러리",
  applicationName: "셀렉갤러리",
  // iPhone에서 홈 화면에 추가하면 주소창 없이 전체 화면으로 열린다.
  appleWebApp: { capable: true, title: "셀렉갤러리", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0e0d0c",
  colorScheme: "dark",
  // 노치·홈 인디케이터 영역까지 채우고, 여백은 safe-area-inset으로 준다.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fonts = [geistSans, geistMono, instrumentSerif].map((f) => f.variable).join(" ");
  return (
    <html lang="ko" className={`${fonts} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={KOREAN_FONTS_CSS} />
      </head>
      <body className="grain flex min-h-full flex-col">{children}</body>
    </html>
  );
}
