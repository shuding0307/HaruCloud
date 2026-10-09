import { CloudShape } from "@/components/sky/CloudShape";
import { SkyBackground } from "@/components/sky/SkyBackground";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <SkyBackground />
      <div className="w-40 opacity-80">
        <CloudShape variant={2} />
      </div>
      <h1 className="mt-5 text-xl font-bold text-deep-sky">길을 잃은 구름이에요</h1>
      <p className="mt-2 text-[15px] text-ink-soft">찾으시는 페이지가 없어요.</p>
      <ButtonLink href="/" variant="secondary" className="mt-6">
        하늘로 돌아가기
      </ButtonLink>
    </main>
  );
}
