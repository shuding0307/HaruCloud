import { getDataServices } from "@/lib/repositories";
import { readOrIssueActor, type Actor } from "@/lib/security/anon-token";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { createReactionSchema, thoughtIdSchema } from "@/lib/validation/thought";
import { ApiError, assertSameOrigin, enforceRateLimit, handleError, json, lookupFailure, parseJsonBody } from "@/lib/api/http";
import type { CreateReactionResponse } from "@/types/api";

/** 익명 공감 — 같은 식별값·게시물·유형 조합은 한 번만 집계된다(DB 고유 제약). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  let actor: Actor | null = null;
  try {
    assertSameOrigin(request);
    const { id } = await ctx.params;
    if (!thoughtIdSchema.safeParse(id).success) throw new ApiError(404, "NOT_FOUND", "고민을 찾을 수 없어요.");
    actor = readOrIssueActor(request);
    const { type } = await parseJsonBody(request, createReactionSchema);

    const { thoughts, rateLimiter } = getDataServices();
    await enforceRateLimit(rateLimiter, request, actor.hash, {
      actor: RATE_LIMITS.reactionActor,
      ip: RATE_LIMITS.reactionIp,
    });

    const result = await thoughts.addReaction({ thoughtId: id, type, actorHash: actor.hash });
    if (result === "created" || result === "duplicate") {
      const body: CreateReactionResponse = { type, alreadyReacted: result === "duplicate" };
      return json(body, { status: result === "created" ? 201 : 200, actor });
    }
    throw lookupFailure(result);
  } catch (err) {
    return handleError(err, actor);
  }
}
