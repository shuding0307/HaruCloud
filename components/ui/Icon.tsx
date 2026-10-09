import type { SVGProps } from "react";

/** 얇은 선 아이콘 (이모지 대신 사용 — 차분한 톤 유지) */
export type IconName = "together" | "lift" | "cloud" | "clock" | "lock";

const PATHS: Record<IconName, string> = {
  // 겹쳐진 두 원 — "나도 이런 적 있어"
  together: "M9 15.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11Zm6 0a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11Z",
  // 위로 떠오르는 깃털 같은 곡선 — "조금 가벼워지길"
  lift: "M12 20V9m0 0-4 4m4-4 4 4M6.5 6.5c1.6-1.4 3.4-2 5.5-2s3.9.6 5.5 2",
  cloud: "M7.5 18.5h9.5a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 9.6a4.5 4.5 0 0 0 .5 8.9Z",
  clock: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  lock: "M7.5 11V8.5a4.5 4.5 0 0 1 9 0V11M6.5 11h11v8.5h-11z",
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.15em"
      height="1.15em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
