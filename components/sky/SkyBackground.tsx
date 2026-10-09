import { SkyCanvas } from "./SkyCanvas";

/**
 * 고정 하늘 배경.
 * 1) CSS 대기 원근 레이어 — 서버 렌더되어 즉시 보이고, WebGL 이 없을 때의 대체 화면이 된다.
 * 2) WebGL 하늘(SkyCanvas) — 준비되면 그 위로 서서히 겹쳐진다.
 */
export function SkyBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(55% 30% at 62% 60%, rgb(255 236 213 / 0.85) 0%, rgb(252 224 208 / 0.35) 45%, transparent 75%)",
            "radial-gradient(45% 25% at 42% 12%, rgb(199 223 242 / 0.45) 0%, transparent 70%)",
            "radial-gradient(70% 20% at 18% 74%, rgb(250 244 250 / 0.75) 0%, transparent 70%)",
            "radial-gradient(65% 18% at 86% 80%, rgb(250 242 248 / 0.7) 0%, transparent 70%)",
            "radial-gradient(100% 30% at 50% 106%, rgb(246 236 244 / 0.95) 0%, transparent 72%)",
            "linear-gradient(180deg, #b0a7da 0%, #c7c6ec 20%, #e2d9ed 44%, #f6dfd2 62%, #e9d4dd 82%, #e6d0dc 100%)",
          ].join(", "),
        }}
      />
      <SkyCanvas />
    </div>
  );
}
