import Link from "next/link";
import { SkyField } from "@/components/sky/SkyField";
import { ButtonLink } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="px-5 pt-[max(1.75rem,env(safe-area-inset-top))] text-center sm:pt-10">
        <h1 className="text-[28px] font-bold tracking-tight text-deep-sky sm:text-[34px]">
          HaruCloud
          <span className="ml-2 align-middle text-sm font-medium tracking-normal text-ink-soft">하루 구름</span>
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-6 text-ink-soft sm:text-base">
          오늘의 고민을 띄워두세요.
          <br />
          내일이면 조금 가벼워질지도.
        </p>
      </header>

      <div className="flex flex-1 flex-col px-3 pt-4 pb-44 sm:px-6">
        <SkyField />
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-1 bg-gradient-to-t from-[var(--color-peach)]/90 via-[var(--color-peach)]/50 to-transparent px-4 pt-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <ButtonLink href="/write" size="lg" className="pointer-events-auto w-full max-w-xs">
          <span aria-hidden>+</span> 고민 띄우기
        </ButtonLink>
        <Link
          href="/about"
          className="pointer-events-auto inline-flex min-h-11 items-center px-3 text-[13px] text-ink-soft underline-offset-4 hover:underline"
        >
          이용 안내 · 신고 및 개인정보 정책
        </Link>
      </div>
    </main>
  );
}
