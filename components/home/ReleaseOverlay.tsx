"use client";

import { useEffect } from "react";
import { THOUGHT_LIFETIME_HOURS } from "@/types/thought";
import { s } from "./classes";
import { figureClass, SkyFigure } from "./SkyFigure";
import { useSkyMode } from "./useSkyMode";

const SPARKS = [
  { x: -70, y: -40, d: 0.15 },
  { x: 64, y: -56, d: 0.25 },
  { x: -36, y: 46, d: 0.35 },
  { x: 86, y: 18, d: 0.2 },
  { x: -96, y: 8, d: 0.4 },
  { x: 24, y: 60, d: 0.3 },
  { x: 10, y: -78, d: 0.45 },
];

/**
 * 띄워 보내기 연출 — 서버 저장이 성공한 뒤에만 보인다.
 * 구름(밤엔 별)이 반짝이며 하늘로 올라가고, 완료 문구가 나타난 뒤 스스로 닫힌다. 누르거나 Esc 로 바로 닫을 수 있다.
 */
export function ReleaseOverlay({ text, onDone }: { text: string; onDone(): void }) {
  const sky = useSkyMode();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(onDone, reduce ? 2400 : 4200);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [onDone]);

  return (
    <div className={s.release} onClick={onDone}>
      <div className={s.releaseStage} aria-hidden="true">
        <div className={s.releaseFly}>
          <div className={`${figureClass(sky)} ${s.releaseFigure}`}>
            <SkyFigure sky={sky} text={text} />
          </div>
          {SPARKS.map((p, i) => (
            <span
              key={i}
              className={s.spark}
              style={{ "--sx": `${p.x}px`, "--sy": `${p.y}px`, animationDelay: `${p.d}s` } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
      <div className={s.releaseText} role="status" aria-live="polite">
        <p className={s.releaseTitle}>잘 띄워 보냈어요.</p>
        <p>
          <span className={s.onlyDay}>당신의 마음이 이제 하늘에 떠 있어요.</span>
          <span className={s.onlyNight}>당신의 마음이 이제 별이 되어 반짝여요.</span>
        </p>
        <p className={s.releaseSub}>앞으로 {THOUGHT_LIFETIME_HOURS}시간 동안 다른 누군가가 읽고 공감할 수 있어요.</p>
      </div>
    </div>
  );
}
