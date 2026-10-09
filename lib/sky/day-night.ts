/** 낮/밤: 사용자 로컬 시각 06:00–18:59 는 낮, 그 외는 밤. ?sky=day|night 로 강제할 수 있다. */
export type SkyMode = "day" | "night";

export const DAY_START = 6;
export const NIGHT_START = 19;

export function resolveSky(hour: number, search: string): SkyMode {
  const forced = new URLSearchParams(search).get("sky");
  if (forced === "day" || forced === "night") return forced;
  return hour >= DAY_START && hour < NIGHT_START ? "day" : "night";
}

/**
 * 첫 페인트 전에 <html data-sky> 를 정하는 인라인 스크립트.
 * 서버는 사용자의 현지 시각을 알 수 없으므로 브라우저에서 결정해야 깜빡임·하이드레이션 불일치가 없다.
 */
export const SKY_INIT_SCRIPT = `(function(){try{var q=new URLSearchParams(location.search).get("sky");var h=new Date().getHours();document.documentElement.dataset.sky=(q==="day"||q==="night")?q:(h>=${DAY_START}&&h<${NIGHT_START}?"day":"night");}catch(e){}})();`;
