import type { CSSProperties } from "react";
import { s } from "./classes";
import { Stars } from "./Stars";

const w = (px: number) => ({ "--w": `${px}px` }) as CSSProperties;

/** 낮(해·먼 구름·빛 입자)과 밤(성운·별·별똥별·달) 배경. 둘 다 렌더하고 opacity 로 전환한다. */
export function SkyLayers() {
  return (
    <>
      <div className={`${s.layer} ${s.layerDay}`} aria-hidden="true">
        <div className={s.sunBloom} />
        <div className={s.sun} />
        <div className={s.far} style={{ left: -40, top: "28%", ...w(170) }}>
          <span /><span /><span />
        </div>
        <div className={s.far} style={{ right: -30, top: "52%", opacity: 0.6, ...w(160) }}>
          <span /><span /><span />
        </div>
        <div className={s.far} style={{ left: "4%", top: "72%", opacity: 0.55, filter: "blur(2.5px)", ...w(140) }}>
          <span /><span /><span />
        </div>
        <span className={s.mote} style={{ left: "15%", top: "30%" }} />
        <span className={s.mote} style={{ left: "82%", top: "36%", animationDelay: "-2s" }} />
        <span className={s.mote} style={{ left: "54%", top: "62%", animationDelay: "-4s" }} />
        <span className={s.mote} style={{ left: "30%", top: "76%", animationDelay: "-5.5s" }} />
      </div>

      <div className={`${s.layer} ${s.layerNight}`} aria-hidden="true">
        <div className={s.neb} style={{ left: "-10%", top: "26%", width: 300, height: 220, background: "rgba(126,92,220,.38)" }} />
        <div className={s.neb} style={{ right: "-10%", top: "45%", width: 280, height: 200, background: "rgba(64,140,210,.26)" }} />
        <div className={s.neb} style={{ left: "10%", bottom: 0, width: 340, height: 200, background: "rgba(220,120,190,.22)" }} />
        <Stars />
        <span className={s.shoot} />
        <div className={s.moonGlow} />
        <div className={s.moon}>
          <i /><i /><i />
        </div>
        <div className={s.horizonGlow} />
      </div>
    </>
  );
}
