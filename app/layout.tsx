import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { MockModeBanner } from "@/components/layout/MockModeBanner";
import { isMockMode } from "@/lib/env";
import { SKY_INIT_SCRIPT } from "@/lib/sky/day-night";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/site";
import { SkyClock } from "@/components/home/SkyClock";

export const metadata: Metadata = {
  // 공유 미리보기의 이미지·URL 을 절대 주소로 만들기 위한 기준 (lib/site.ts)
  metadataBase: siteUrl(),
  title: {
    default: "HaruCloud · 하루구름",
    template: "%s · HaruCloud",
  },
  description: SITE_TAGLINE,
  applicationName: SITE_NAME,
  // 링크 공유 미리보기 (카카오톡·슬랙·디스코드·X 등). 이미지는 app/opengraph-image.tsx
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_TAGLINE + " " + SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_TAGLINE,
  },
  // 검색엔진 색인은 막되(익명 글 보호), 링크 미리보기 크롤러는 robots 와 무관하게 동작한다
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#C7C6EC",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const mock = isMockMode();
  return (
    // data-sky 는 첫 페인트 전에 인라인 스크립트가 정하므로 하이드레이션 경고에서 제외한다.
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <body className="relative min-h-full">
        {/* 첫 페인트 전에 낮/밤을 정한다. 서버 HTML 의 <script> 는 파싱 즉시 실행되고,
            React 는 이를 문자열로만 다뤄 클라이언트에서 script 요소를 만들지 않는다.
            (next/script beforeInteractive 는 부트스트랩까지 실행을 미뤄 밤에 낮 하늘이 잠깐 보일 수 있다) */}
        <div hidden dangerouslySetInnerHTML={{ __html: `<script>${SKY_INIT_SCRIPT}</script>` }} />
        <SkyClock />
        <ToastProvider>
          {mock && <MockModeBanner />}
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
