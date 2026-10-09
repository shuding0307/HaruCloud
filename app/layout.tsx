import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { MockModeBanner } from "@/components/layout/MockModeBanner";
import { isMockMode } from "@/lib/env";
import { SKY_INIT_SCRIPT } from "@/lib/sky/day-night";
import { SkyClock } from "@/components/home/SkyClock";

export const metadata: Metadata = {
  title: {
    default: "HaruCloud · 하루구름",
    template: "%s · HaruCloud",
  },
  description: "오늘의 고민을 띄워두세요. 내일이면 조금 가벼워질지도.",
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
