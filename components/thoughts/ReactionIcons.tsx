import type { ReactionType } from "@/types/thought";

/**
 * 공감 버튼 아이콘 (harucloud-sky/icons/*.svg 를 인라인 컴포넌트로 옮김).
 * 선과 눈은 currentColor, 하트는 CSS 변수 --hc-heart / --hc-heart-sent 로 테마에 따라 바뀐다.
 */

const STAR = "M12 6 13.94 9.33 17.71 10.15 15.14 13.02 15.53 16.85 12 15.3 8.47 16.85 8.86 13.02 6.29 10.15 10.06 9.33Z";
const CLOUD = "M7 19h10a3.6 3.6 0 0 0 .6-7.15A5.2 5.2 0 0 0 7.5 11.6 3.7 3.7 0 0 0 7 19Z";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** 나도 이런 적 있어 · 기본 */
function MeToo() {
  return (
    <Frame>
      <circle cx="16" cy="14" r="5.2" fill="#FFE1EA" strokeWidth="1.4" />
      <circle cx="8" cy="14" r="5.2" fill="#E4DEFC" strokeWidth="1.4" />
      <g fill="currentColor" stroke="none">
        <circle cx="7.6" cy="13.4" r=".75" />
        <circle cx="10" cy="13.4" r=".75" />
        <circle cx="14.1" cy="13.4" r=".75" />
        <circle cx="16.5" cy="13.4" r=".75" />
      </g>
      <g fill="#F6A9BF" stroke="none" opacity=".85">
        <ellipse cx="10.6" cy="15.3" rx=".9" ry=".55" />
        <ellipse cx="13.5" cy="15.3" rx=".9" ry=".55" />
      </g>
      <path
        d="M12 7.6c-1.7-1-2.7-2-2.7-3.1a1.35 1.35 0 0 1 2.7-.5 1.35 1.35 0 0 1 2.7.5c0 1.1-1 2.1-2.7 3.1Z"
        stroke="none"
        style={{ fill: "var(--hc-heart, #F28AA8)" }}
      />
    </Frame>
  );
}

/** 나도 이런 적 있어 · 보낸 뒤 (눈웃음 + 큰 하트) */
function MeTooSent() {
  return (
    <Frame>
      <circle cx="16" cy="14" r="5.2" fill="#FFC6D6" strokeWidth="1.4" />
      <circle cx="8" cy="14" r="5.2" fill="#CFC4FA" strokeWidth="1.4" />
      <path d="M6.8 13.6q.7-.8 1.4 0M9.3 13.6q.7-.8 1.4 0M13.3 13.6q.7-.8 1.4 0M15.8 13.6q.7-.8 1.4 0" strokeWidth="1.2" />
      <g fill="#F6A9BF" stroke="none" opacity=".85">
        <ellipse cx="10.6" cy="15.5" rx=".9" ry=".55" />
        <ellipse cx="13.4" cy="15.5" rx=".9" ry=".55" />
      </g>
      <path
        d="M12 7.9c-2-1.2-3.2-2.3-3.2-3.6a1.6 1.6 0 0 1 3.2-.6 1.6 1.6 0 0 1 3.2.6c0 1.3-1.2 2.4-3.2 3.6Z"
        stroke="none"
        style={{ fill: "var(--hc-heart-sent, #E8668C)" }}
      />
    </Frame>
  );
}

/** 조금 가벼워지길 · 낮 · 둥실 구름 */
function LightenDay() {
  return (
    <Frame>
      <g transform="translate(0 -2.5)">
        <path d={CLOUD} fill="#F3F1FF" strokeWidth="1.4" />
        <path d="M9.4 15.2q.75-.85 1.5 0M13.1 15.2q.75-.85 1.5 0" strokeWidth="1.2" />
        <g fill="#F6A9BF" stroke="none" opacity=".85">
          <ellipse cx="8.6" cy="16.7" rx=".95" ry=".55" />
          <ellipse cx="15.4" cy="16.7" rx=".95" ry=".55" />
        </g>
      </g>
      <path d="M9.5 19.6v1.8M12 20v2M14.5 19.6v1.8" stroke="#9A90DE" strokeWidth="1.2" />
      <path d="M19.2 2.4Q19.2 4.6 21.4 4.6Q19.2 4.6 19.2 6.8Q19.2 4.6 17 4.6Q19.2 4.6 19.2 2.4Z" fill="#F6C35B" stroke="none" />
    </Frame>
  );
}

/** 조금 가벼워지길 · 낮 · 보낸 뒤 (더 높이 + 반짝임 하나 더) */
function LightenDaySent() {
  return (
    <Frame>
      <g transform="translate(0 -4.5)">
        <path d={CLOUD} fill="#FFFFFF" strokeWidth="1.4" />
        <path d="M9.4 15.2q.75-.85 1.5 0M13.1 15.2q.75-.85 1.5 0" strokeWidth="1.2" />
        <g fill="#F6A9BF" stroke="none" opacity=".85">
          <ellipse cx="8.6" cy="16.7" rx=".95" ry=".55" />
          <ellipse cx="15.4" cy="16.7" rx=".95" ry=".55" />
        </g>
      </g>
      <path d="M9.5 17.6v2.4M12 18v3M14.5 17.6v2.4" stroke="#7A6FD0" strokeWidth="1.2" />
      <g fill="#F6C35B" stroke="none">
        <path d="M19.2 1.6Q19.2 3.8 21.4 3.8Q19.2 3.8 19.2 6Q19.2 3.8 17 3.8Q19.2 3.8 19.2 1.6Z" />
        <path d="M4.6 7.4Q4.6 8.6 5.8 8.6Q4.6 8.6 4.6 9.8Q4.6 8.6 3.4 8.6Q4.6 8.6 4.6 7.4Z" />
      </g>
    </Frame>
  );
}

/** 조금 가벼워지길 · 밤 · 두 별 친구 */
function LightenNight() {
  return (
    <Frame>
      <g transform="translate(9.5 -1.5) scale(.62)">
        <path d={STAR} fill="#FFD6E0" strokeWidth="2.2" />
        <g fill="currentColor" stroke="none">
          <circle cx="10.8" cy="12" r=".9" />
          <circle cx="13.2" cy="12" r=".9" />
        </g>
      </g>
      <g transform="translate(-3.5 1.5) scale(1.05)">
        <path d={STAR} fill="#FFE7A3" strokeWidth="1.35" />
        <g fill="currentColor" stroke="none">
          <circle cx="11" cy="11.9" r=".6" />
          <circle cx="13.2" cy="11.9" r=".6" />
        </g>
        <ellipse cx="14.2" cy="13.2" rx=".8" ry=".5" fill="#F6A9BF" stroke="none" opacity=".85" />
      </g>
    </Frame>
  );
}

/** 조금 가벼워지길 · 밤 · 보낸 뒤 (눈웃음 + 반짝임) */
function LightenNightSent() {
  return (
    <Frame>
      <g transform="translate(9.5 -1.5) scale(.62)">
        <path d={STAR} fill="#FFC6D6" strokeWidth="2.2" />
        <path d="M10.2 12.2q.6-.7 1.2 0M12.6 12.2q.6-.7 1.2 0" strokeWidth="1.6" />
      </g>
      <g transform="translate(-3.5 1.5) scale(1.05)">
        <path d={STAR} fill="#FFFFFF" strokeWidth="1.35" />
        <path d="M10.4 12q.55-.65 1.1 0M12.6 12q.55-.65 1.1 0" strokeWidth="1.1" />
        <ellipse cx="14.2" cy="13.3" rx=".8" ry=".5" fill="#F6A9BF" stroke="none" opacity=".85" />
      </g>
      <path d="M4 2.6Q4 4.2 5.6 4.2Q4 4.2 4 5.8Q4 4.2 2.4 4.2Q4 4.2 4 2.6Z" fill="#E8668C" stroke="none" />
    </Frame>
  );
}

/** 공감 유형 × 낮/밤 × 보냄 여부에 맞는 아이콘 */
export function ReactionIcon({ type, sky, sent }: { type: ReactionType; sky: "day" | "night"; sent: boolean }) {
  if (type === "been_there") return sent ? <MeTooSent /> : <MeToo />;
  if (sky === "day") return sent ? <LightenDaySent /> : <LightenDay />;
  return sent ? <LightenNightSent /> : <LightenNight />;
}
