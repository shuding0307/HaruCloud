import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PublicThought,
  ReactionCounts,
  ReactionResult,
  ReactionType,
  ReportReason,
  ReportResult,
  ThoughtLookup,
} from "@/types/thought";
import type { RateLimiter, RateLimitRule } from "@/lib/security/rate-limit";
import type { FeedbackCategory } from "@/types/feedback";
import type { FeedbackRepository, ListActiveResult, ListCursor, ThoughtRepository } from "./types";

interface ThoughtRow {
  id: string;
  content: string;
  created_at: string;
  expires_at: string;
}

interface ThoughtViewJson {
  state: "active" | "expired" | "unavailable" | "not_found";
  thought?: ThoughtRow;
  viewer?: {
    reactions: ReactionType[] | null;
    is_author: boolean;
    received: ReactionCounts | null;
  };
}

class RepositoryError extends Error {
  constructor(op: string, code?: string) {
    // 메시지에 사용자 입력이나 키를 포함하지 않는다.
    super(`Supabase ${op} 실패${code ? ` (${code})` : ""}`);
  }
}

function toPublic(row: ThoughtRow): PublicThought {
  return {
    id: row.id,
    content: row.content,
    createdAt: new Date(row.created_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
  };
}

const RESULTS = new Set(["created", "duplicate", "not_found", "expired", "unavailable"]);

function asResult(op: string, value: unknown): ReactionResult {
  if (typeof value === "string" && RESULTS.has(value)) return value as ReactionResult;
  throw new RepositoryError(op, "unexpected_result");
}

export class SupabaseThoughtRepository implements ThoughtRepository {
  readonly mode = "supabase" as const;
  constructor(private db: SupabaseClient) {}

  async now() {
    const { data, error } = await this.db.rpc("server_now");
    if (error) throw new RepositoryError("server_now", error.code);
    return new Date(data as string);
  }

  async listActive({ limit, cursor }: { limit: number; cursor?: ListCursor }): Promise<ListActiveResult> {
    const capped = Math.min(Math.max(limit, 1), 50);
    const { data, error } = await this.db.rpc("list_active_thoughts", {
      p_limit: capped + 1,
      p_before_created_at: cursor?.createdAt ?? null,
      p_before_id: cursor?.id ?? null,
    });
    if (error) throw new RepositoryError("list_active_thoughts", error.code);
    const rows = (data ?? []) as ThoughtRow[];
    const page = rows.slice(0, capped);
    const last = page[page.length - 1];
    return {
      thoughts: page.map(toPublic),
      nextCursor:
        rows.length > capped && last
          ? { createdAt: new Date(last.created_at).toISOString(), id: last.id }
          : null,
    };
  }

  async create({ content, authorHash }: { content: string; authorHash: string }) {
    const { data, error } = await this.db.rpc("create_thought", {
      p_content: content,
      p_author_hash: authorHash,
    });
    if (error) throw new RepositoryError("create_thought", error.code);
    const row = (Array.isArray(data) ? data[0] : data) as ThoughtRow | undefined;
    if (!row) throw new RepositoryError("create_thought", "empty");
    return toPublic(row);
  }

  async getForViewer(id: string, actorHash: string | null): Promise<ThoughtLookup> {
    const { data, error } = await this.db.rpc("get_thought_view", {
      p_id: id,
      p_actor_hash: actorHash,
    });
    if (error) throw new RepositoryError("get_thought_view", error.code);
    const view = data as ThoughtViewJson;
    if (view.state !== "active" || !view.thought || !view.viewer) {
      return { state: view.state === "active" ? "not_found" : view.state } as ThoughtLookup;
    }
    return {
      state: "active",
      thought: toPublic(view.thought),
      viewer: {
        reactions: view.viewer.reactions ?? [],
        isAuthor: view.viewer.is_author,
        receivedReactions: view.viewer.is_author ? view.viewer.received : null,
      },
    };
  }

  async addReaction(input: { thoughtId: string; type: ReactionType; actorHash: string }) {
    const { data, error } = await this.db.rpc("add_reaction", {
      p_thought_id: input.thoughtId,
      p_type: input.type,
      p_actor_hash: input.actorHash,
    });
    if (error) throw new RepositoryError("add_reaction", error.code);
    return asResult("add_reaction", data);
  }

  async createReport(input: { thoughtId: string; reason: ReportReason; reporterHash: string }): Promise<ReportResult> {
    const { data, error } = await this.db.rpc("create_report", {
      p_thought_id: input.thoughtId,
      p_reason: input.reason,
      p_reporter_hash: input.reporterHash,
    });
    if (error) throw new RepositoryError("create_report", error.code);
    return asResult("create_report", data);
  }
}

/** DB 기반 요청 제한 — 여러 서버리스 인스턴스 간에 공유된다. 키는 HMAC 해시만 저장된다. */
export class SupabaseRateLimiter implements RateLimiter {
  constructor(private db: SupabaseClient) {}

  async hit(rule: RateLimitRule, key: string): Promise<boolean> {
    const { data, error } = await this.db.rpc("hit_rate_limit", {
      p_key: `${rule.name}:${key}`,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) throw new RepositoryError("hit_rate_limit", error.code);
    return data === true;
  }
}

export class SupabaseFeedbackRepository implements FeedbackRepository {
  constructor(private db: SupabaseClient) {}

  async create(input: { category: FeedbackCategory; message: string; senderHash: string }) {
    const { error } = await this.db.rpc("create_feedback", {
      p_category: input.category,
      p_message: input.message,
      p_sender_hash: input.senderHash,
    });
    if (error) throw new RepositoryError("create_feedback", error.code);
  }
}
