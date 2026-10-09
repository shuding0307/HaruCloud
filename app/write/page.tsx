import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { WriteForm } from "@/components/thoughts/WriteForm";

export const metadata: Metadata = { title: "고민 띄우기" };

export default function WritePage() {
  return (
    <PageShell>
      <div className="mt-2 flex flex-1 flex-col">
        <WriteForm />
      </div>
    </PageShell>
  );
}
