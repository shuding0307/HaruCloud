import Link from "next/link";
import type { ReactNode } from "react";

/** 하위 페이지 공통 레이아웃: 상단 뒤로가기 + 가운데 정렬 본문 */
export function PageShell({
  children,
  backHref = "/",
  backLabel = "하늘로 돌아가기",
}: {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10 sm:px-6">
      <nav className="py-2">
        <Link
          href={backHref}
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[15px] font-medium text-deep-sky hover:bg-white/50"
        >
          <span aria-hidden>←</span> {backLabel}
        </Link>
      </nav>
      {children}
    </main>
  );
}
