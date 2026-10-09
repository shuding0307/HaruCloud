import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { ThoughtDetail } from "@/components/thoughts/ThoughtDetail";

export const metadata: Metadata = { title: "고민 읽기" };

export default function ThoughtPage({ params }: PageProps<"/thoughts/[id]">) {
  return (
    <PageShell>
      <Suspense fallback={<p className="mt-10 text-center text-[15px] text-ink-soft">구름을 불러오는 중이에요…</p>}>
        {params.then(({ id }) => (
          <ThoughtDetail key={id} id={id} />
        ))}
      </Suspense>
    </PageShell>
  );
}
