import "server-only";
import { randomUUID } from "node:crypto";
import type {
  ModerationStatus,
  PublicThought,
  ReactionCounts,
  ReactionResult,
  ReactionType,
  ReportReason,
  ReportResult,
  ThoughtLookup,
  ThoughtStatus,
} from "@/types/thought";
import type { FeedbackCategory } from "@/types/feedback";
import type { FeedbackRepository, ListActiveResult, ListCursor, ThoughtRepository } from "./types";
import { REPORT_HIDE_THRESHOLD, REPORTED_RETENTION_MS, THOUGHT_LIFETIME_MS } from "./policy";

interface MockThought {
  id: string;
  content: string;
  authorHash: string | null;
  createdAt: number;
  expiresAt: number;
  status: ThoughtStatus;
  moderationStatus: ModerationStatus;
  retainUntil: number | null;
}

interface MockReaction {
  thoughtId: string;
  type: ReactionType;
  actorHash: string;
}

interface MockReport {
  thoughtId: string;
  reason: ReportReason;
  reporterHash: string;
  createdAt: number;
}

const SAMPLE_THOUGHTS = [
  "요즘 아무것도 하기 싫은데, 이게 게으른 건지 지친 건지 모르겠어요.",
  "친구한테 서운한 게 있는데 말하면 관계가 어색해질까 봐 계속 참고 있어요.",
  "취업 준비가 길어지니까 가족들 얼굴 보기가 점점 미안해져요.",
  "오늘 발표 망쳤어요. 계속 그 장면이 머릿속에서 반복돼요.",
  "새로운 동네로 이사 왔는데 아는 사람이 아무도 없어서 조금 외로워요.",
  "잘하고 있다는 말을 듣고 싶은데, 누구한테 해달라고 하기는 어렵네요.",
  "밤만 되면 생각이 많아져서 잠을 잘 못 자요.",
  "좋아하는 일을 직업으로 삼았는데 요즘은 그 일이 싫어질 때가 있어요.",
  "부모님이 점점 나이 드시는 게 보여서 마음이 이상해요.",
  "다들 앞으로 나아가는 것 같은데 저만 제자리인 기분이에요.",
  "거절을 잘 못해서 늘 할 일이 넘쳐요. 이번 주도 벌써 지쳤어요.",
  "작은 실수 하나에도 하루 종일 마음이 쓰여요.",
];

/** 개발용 메모리 저장소. 서버 프로세스가 재시작되면 사라지고, 다른 서버 인스턴스와 공유되지 않는다. */
export class MockThoughtRepository implements ThoughtRepository {
  readonly mode = "mock" as const;
  private thoughts = new Map<string, MockThought>();
  private reactions: MockReaction[] = [];
  private reports: MockReport[] = [];

  constructor(private clock: () => number = () => Date.now(), opts: { seed?: boolean } = {}) {
    if (opts.seed) this.seed();
  }

  private seed() {
    const now = this.clock();
    SAMPLE_THOUGHTS.forEach((content, i) => {
      const createdAt = now - (i * 97 + 13) * 60 * 1000;
      const id = randomUUID();
      this.thoughts.set(id, {
        id,
        content,
        authorHash: null,
        createdAt,
        expiresAt: createdAt + THOUGHT_LIFETIME_MS,
        status: "published",
        moderationStatus: "none",
        retainUntil: null,
      });
    });
  }

  async now() {
    return new Date(this.clock());
  }

  /** Supabase Cron 의 purge_expired() 와 같은 정리 규칙 */
  purgeExpired(): number {
    const now = this.clock();
    let removed = 0;
    for (const t of this.thoughts.values()) {
      const retained = t.retainUntil !== null && t.retainUntil > now;
      if (t.expiresAt <= now && !retained) {
        this.thoughts.delete(t.id);
        this.reactions = this.reactions.filter((r) => r.thoughtId !== t.id);
        removed++;
      }
    }
    return removed;
  }

  private stateOf(t: MockThought | undefined): "active" | "expired" | "unavailable" | "not_found" {
    if (!t) return "not_found";
    if (t.status !== "published") return "unavailable";
    if (t.expiresAt <= this.clock()) return "expired";
    return "active";
  }

  private toPublic(t: MockThought): PublicThought {
    return {
      id: t.id,
      content: t.content,
      createdAt: new Date(t.createdAt).toISOString(),
      expiresAt: new Date(t.expiresAt).toISOString(),
    };
  }

  async listActive({ limit, cursor }: { limit: number; cursor?: ListCursor }): Promise<ListActiveResult> {
    this.purgeExpired();
    const capped = Math.min(Math.max(limit, 1), 50);
    const cursorTime = cursor ? Date.parse(cursor.createdAt) : null;

    const active = [...this.thoughts.values()]
      .filter((t) => this.stateOf(t) === "active")
      .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1))
      .filter((t) => {
        if (!cursor || cursorTime === null) return true;
        return t.createdAt < cursorTime || (t.createdAt === cursorTime && t.id < cursor.id);
      });

    const page = active.slice(0, capped);
    const last = page[page.length - 1];
    return {
      thoughts: page.map((t) => this.toPublic(t)),
      nextCursor:
        active.length > capped && last
          ? { createdAt: new Date(last.createdAt).toISOString(), id: last.id }
          : null,
    };
  }

  async create({ content, authorHash }: { content: string; authorHash: string }) {
    const createdAt = this.clock();
    const t: MockThought = {
      id: randomUUID(),
      content,
      authorHash,
      createdAt,
      expiresAt: createdAt + THOUGHT_LIFETIME_MS,
      status: "published",
      moderationStatus: "none",
      retainUntil: null,
    };
    this.thoughts.set(t.id, t);
    return this.toPublic(t);
  }

  async getForViewer(id: string, actorHash: string | null): Promise<ThoughtLookup> {
    const t = this.thoughts.get(id);
    const state = this.stateOf(t);
    if (state !== "active" || !t) return { state } as ThoughtLookup;

    const isAuthor = actorHash !== null && t.authorHash === actorHash;
    const mine = actorHash
      ? this.reactions.filter((r) => r.thoughtId === id && r.actorHash === actorHash).map((r) => r.type)
      : [];
    let received: ReactionCounts | null = null;
    if (isAuthor) {
      received = { been_there: 0, lighter: 0 };
      for (const r of this.reactions) if (r.thoughtId === id) received[r.type]++;
    }
    return {
      state: "active",
      thought: this.toPublic(t),
      viewer: { reactions: mine, isAuthor, receivedReactions: received },
    };
  }

  async addReaction({ thoughtId, type, actorHash }: { thoughtId: string; type: ReactionType; actorHash: string }): Promise<ReactionResult> {
    const state = this.stateOf(this.thoughts.get(thoughtId));
    if (state !== "active") return state;
    const dup = this.reactions.some(
      (r) => r.thoughtId === thoughtId && r.type === type && r.actorHash === actorHash,
    );
    if (dup) return "duplicate";
    this.reactions.push({ thoughtId, type, actorHash });
    return "created";
  }

  async createReport({ thoughtId, reason, reporterHash }: { thoughtId: string; reason: ReportReason; reporterHash: string }): Promise<ReportResult> {
    const t = this.thoughts.get(thoughtId);
    const state = this.stateOf(t);
    if (state !== "active") return state;
    if (!t) return "not_found";
    if (this.reports.some((r) => r.thoughtId === thoughtId && r.reporterHash === reporterHash)) {
      return "duplicate";
    }
    this.reports.push({ thoughtId, reason, reporterHash, createdAt: this.clock() });

    t.moderationStatus = "pending";
    t.retainUntil = t.expiresAt + REPORTED_RETENTION_MS;
    const count = this.reports.filter((r) => r.thoughtId === thoughtId).length;
    if (count >= REPORT_HIDE_THRESHOLD) t.status = "under_review";
    return "created";
  }

  /** 테스트용: 신고 레코드 수 */
  reportCount(thoughtId: string) {
    return this.reports.filter((r) => r.thoughtId === thoughtId).length;
  }
}

/** 개발용 메모리 의견함 (서버 재시작 시 사라짐) */
export class MockFeedbackRepository implements FeedbackRepository {
  readonly items: { category: FeedbackCategory; message: string; senderHash: string; createdAt: number }[] = [];

  async create(input: { category: FeedbackCategory; message: string; senderHash: string }) {
    this.items.push({ ...input, createdAt: Date.now() });
  }
}
