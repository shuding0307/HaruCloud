import type { PublicThought, ReactionType, ThoughtViewer } from "./thought";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "EXPIRED"
  | "UNAVAILABLE"
  | "RATE_LIMITED"
  | "FORBIDDEN"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    fields?: Record<string, string[]>;
  };
}

export interface ListThoughtsResponse {
  thoughts: PublicThought[];
  nextCursor: string | null;
  serverNow: string;
}

export interface CreateThoughtRequest {
  content: string;
}

export interface CreateThoughtResponse {
  thought: PublicThought;
}

export interface GetThoughtResponse {
  thought: PublicThought;
  viewer: ThoughtViewer;
  serverNow: string;
}

export interface CreateReactionRequest {
  type: ReactionType;
}

export interface CreateReactionResponse {
  type: ReactionType;
  /** 이미 보낸 공감이면 true (중복 집계되지 않음) */
  alreadyReacted: boolean;
}

export interface CreateReportRequest {
  reason: string;
}

export interface CreateReportResponse {
  status: "received" | "already_reported";
}
