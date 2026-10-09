import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { SkyBackground } from "@/components/sky/SkyBackground";
import { ToastProvider } from "@/components/ui/Toast";
import { MockModeBanner } from "@/components/layout/MockModeBanner";
import { isMockMode } from "@/lib/env";

export const metadata: Metadata = {
  title: {
    default: "HaruCloud · 하루 구름",
    template: "%s · HaruCloud",
  },
  description: "오늘의 고민을 띄워두세요. 내일이면 조금 가벼워질지도.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#DDEFFD",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const mock = isMockMode();
  return (
    <html lang="ko" className="h-full">
      <body className="relative min-h-full">
        <SkyBackground />
        <ToastProvider>
          {mock && <MockModeBanner />}
          <div className="relative z-10 flex min-h-dvh flex-col">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}
