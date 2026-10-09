import { SkyBackground } from "@/components/sky/SkyBackground";

/** 메인을 제외한 페이지(작성·상세·완료·안내)의 공통 배경: WebGL 하늘 */
export default function SkyPagesLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SkyBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">{children}</div>
    </>
  );
}
