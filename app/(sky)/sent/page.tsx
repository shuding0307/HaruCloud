import type { Metadata } from "next";
import { SentView } from "@/components/thoughts/SentView";

export const metadata: Metadata = { title: "띄워 보냈어요" };

export default function SentPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-10">
      <SentView />
    </main>
  );
}
