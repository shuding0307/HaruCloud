import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SkyShell } from "@/components/home/SkyShell";
import { s } from "@/components/home/classes";
import { ThoughtDetail } from "@/components/thoughts/ThoughtDetail";

export const metadata: Metadata = { title: "고민 읽기" };

export default function ThoughtPage({ params }: PageProps<"/thoughts/[id]">) {
  return (
    <SkyShell>
      <nav>
        <Link href="/" className={s.back}>
          <span aria-hidden>←</span> 하늘로 돌아가기
        </Link>
      </nav>
      <Suspense fallback={<p className={s.notice}>고민을 불러오는 중이에요…</p>}>
        {params.then(({ id }) => (
          <ThoughtDetail key={id} id={id} />
        ))}
      </Suspense>
    </SkyShell>
  );
}
