import { CloudShape } from "@/components/sky/CloudShape";

/** 작성 중인 글이 구름에 담긴 모습 (홈 화면 구름과 같은 3줄 미리보기 + 전체 본문) */
export function CloudPreview({ content }: { content: string }) {
  const preview = content.trim().replace(/\s+/g, " ");
  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-md)] bg-sky px-6 py-6">
        <div className="mx-auto w-48">
          <CloudShape variant={0} textClassName="text-[13px] leading-[1.45]">
            <span className="line-clamp-3">{preview || "…"}</span>
          </CloudShape>
        </div>
        <p className="mt-3 text-center text-xs text-ink-soft">하늘에서는 이렇게 보여요</p>
      </div>
      <p className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-[var(--radius-md)] bg-sky/50 px-4 py-3 text-[15px] leading-7">
        {content.trim()}
      </p>
    </div>
  );
}
