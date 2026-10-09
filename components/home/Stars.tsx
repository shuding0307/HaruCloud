"use client";

import { memo, useEffect, useRef } from "react";
import { s } from "./classes";

/**
 * 밤하늘의 별. 화면 넓이에 비례해 한 번만 무작위 생성한다.
 * React 상태가 아니라 DOM 에 직접 붙이므로 리렌더로 다시 만들어지지 않는다.
 */
export const Stars = memo(function Stars() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = ref.current;
    if (!wrap || wrap.childElementCount) return;
    const n = Math.round((window.innerWidth * window.innerHeight) / 3500);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const big = Math.random() > 0.88;
      const r = big ? 2.5 : Math.random() > 0.5 ? 1.5 : 1;
      const dot = document.createElement("div");
      dot.className = s.dot;
      dot.style.cssText =
        `left:${Math.random() * 100}%;top:${Math.random() * 88}%;width:${r}px;height:${r}px;` +
        `opacity:${(0.3 + Math.random() * 0.7).toFixed(2)};` +
        `box-shadow:0 0 ${big ? 8 : 3}px ${big ? 1 : 0}px rgba(210,220,255,.7);` +
        `animation-delay:${(-Math.random() * 3.4).toFixed(2)}s`;
      frag.appendChild(dot);
    }
    wrap.appendChild(frag);
  }, []);

  return <div ref={ref} className={s.stars} />;
});
