import type { ReactNode } from "react";
import "./home.css";
import { s } from "./classes";
import { gowunBatang, gowunDodum } from "./fonts";
import { SkyLayers } from "./SkyLayers";

/** 낮엔 구름, 밤엔 별 — 메인과 고민 상세가 함께 쓰는 하늘 배경과 본문 칼럼 */
export function SkyShell({ children }: { children: ReactNode }) {
  return (
    <main className={`${s.sky} ${gowunBatang.variable} ${gowunDodum.variable}`}>
      <SkyLayers />
      <div className={s.content}>{children}</div>
    </main>
  );
}
