import { s } from "./classes";

/** 장식용 표식: 낮엔 3D 구름, 밤엔 빛나는 별 (메인과 같은 모양) */
export function SkyMark() {
  return (
    <div className={s.mark} aria-hidden="true">
      <span className={`${s.cloud3d} ${s.markCloud} ${s.onlyDay}`}>
        <span className={`${s.p} ${s.base}`} />
        <span className={`${s.p} ${s.a}`} />
        <span className={`${s.p} ${s.b}`} />
        <span className={`${s.p} ${s.c}`} />
      </span>
      <span className={`${s.orb} ${s.markOrb} ${s.onlyNight}`} />
    </div>
  );
}
