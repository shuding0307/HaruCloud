export const REACTION_TYPES = ["been_there", "lighter"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export const REPORT_REASONS = [
  "harassment",
  "privacy",
  "spam",
  "safety",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type ThoughtStatus = "published" | "under_review" | "deleted";
export type ModerationStatus = "none" | "pending" | "approved" | "removed";

/** 공개 화면에 노출해도 되는 고민 정보. 작성자 식별값은 절대 포함하지 않는다. */
export interface PublicThought {
  id: string;
  content: string;
  createdAt: string; // ISO
  expiresAt: string; // ISO
}

export type ReactionCounts = Record<ReactionType, number>;

export interface ThoughtViewer {
  /** 현재 익명 사용자가 이미 보낸 공감 */
  reactions: ReactionType[];
  /** 현재 익명 사용자가 이 고민의 작성자인지 */
  isAuthor: boolean;
  /** 작성자 본인에게만 제공되는 받은 공감 수 */
  receivedReactions: ReactionCounts | null;
}

export type ThoughtLookup =
  | { state: "active"; thought: PublicThought; viewer: ThoughtViewer }
  | { state: "expired" }
  | { state: "unavailable" } // 삭제·검토 중
  | { state: "not_found" };

export type ReactionResult =
  | "created"
  | "duplicate"
  | "not_found"
  | "expired"
  | "unavailable";

export type ReportResult = ReactionResult;

export const REACTION_LABELS: Record<ReactionType, string> = {
  been_there: "나도 이런 적 있어",
  lighter: "조금 가벼워지길",
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: "괴롭힘 또는 혐오 표현",
  privacy: "개인정보 노출",
  spam: "스팸 또는 광고",
  safety: "자해·폭력 등 안전 우려",
  other: "기타",
};

export const THOUGHT_MAX_LENGTH = 500;
export const THOUGHT_LIFETIME_HOURS = 24;
