export const FEEDBACK_CATEGORIES = ["suggestion", "question", "bug", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  suggestion: "건의",
  question: "문의",
  bug: "오류 제보",
  other: "기타",
};

export const FEEDBACK_MAX_LENGTH = 1000;
/** 의견을 보관하는 기간 (일) — 이후 자동 삭제. SQL purge_expired() 와 같은 값 */
export const FEEDBACK_RETENTION_DAYS = 180;
