import { s } from "./classes";

/** 고민 하나의 모양: 낮엔 3D 구름, 밤엔 빛나는 별 + 라벨. 감싸는 요소(링크·div)의 class 는 호출하는 쪽이 정한다. */
export function SkyFigure({ sky, text }: { sky: "day" | "night"; text: string }) {
  return sky === "day" ? (
    <>
      <span className={`${s.p} ${s.base}`} />
      <span className={`${s.p} ${s.a}`} />
      <span className={`${s.p} ${s.b}`} />
      <span className={`${s.p} ${s.c}`} />
      <span className={s.t}>{text}</span>
    </>
  ) : (
    <>
      <span className={s.orb} />
      <span className={s.lbl}>{text}</span>
    </>
  );
}

export const figureClass = (sky: "day" | "night") => (sky === "day" ? s.cloud3d : s.wish);
