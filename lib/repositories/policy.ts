/** 서비스 정책 상수 — DB 마이그레이션(SQL)의 값과 동일하게 유지한다. */
export const THOUGHT_LIFETIME_MS = 24 * 60 * 60 * 1000;
/** 서로 다른 신고가 이 수 이상 쌓이면 공개 목록에서 임시로 숨기고 검토 대기 상태로 전환 */
export const REPORT_HIDE_THRESHOLD = 3;
/** 신고된 게시물을 검토 목적으로 보존하는 최대 기간 (만료 시각 기준) */
export const REPORTED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
