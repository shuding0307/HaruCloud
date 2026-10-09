const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** 작성 후 경과 시간 → "방금", "12분 전", "3시간 전" */
export function formatElapsed(ms: number): string {
  if (ms < MINUTE) return "방금";
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}분 전`;
  return `${Math.floor(ms / HOUR)}시간 전`;
}

/** 만료까지 남은 시간 → "약 5시간 뒤", "23분 뒤", "곧" */
export function formatRemaining(ms: number): string {
  if (ms <= MINUTE) return "곧";
  if (ms < HOUR) return `${Math.ceil(ms / MINUTE)}분 뒤`;
  return `약 ${Math.floor(ms / HOUR)}시간 뒤`;
}
