import type {
  PublicThought,
  ReactionResult,
  ReactionType,
  ReportReason,
  ReportResult,
  ThoughtLookup,
} from "@/types/thought";
import type { RateLimiter } from "@/lib/security/rate-limit";

export interface ListCursor {
  createdAt: string;
  id: string;
}

export interface ListActiveResult {
  thoughts: PublicThought[];
  nextCursor: ListCursor | null;
}

/**
 * 데이터 접근 인터페이스. 실제(Supabase)와 Mock 이 동일하게 구현한다.
 * 모든 만료 판단은 구현체의 "서버 시각"(DB now() 또는 서버 Date.now())을 기준으로 한다.
 */
export interface ThoughtRepository {
  readonly mode: "mock" | "supabase";
  listActive(opts: { limit: number; cursor?: ListCursor }): Promise<ListActiveResult>;
  create(input: { content: string; authorHash: string }): Promise<PublicThought>;
  getForViewer(id: string, actorHash: string | null): Promise<ThoughtLookup>;
  addReaction(input: {
    thoughtId: string;
    type: ReactionType;
    actorHash: string;
  }): Promise<ReactionResult>;
  createReport(input: {
    thoughtId: string;
    reason: ReportReason;
    reporterHash: string;
  }): Promise<ReportResult>;
  /** 서버 기준 현재 시각 */
  now(): Promise<Date>;
}

export interface DataServices {
  thoughts: ThoughtRepository;
  rateLimiter: RateLimiter;
}
