import { getDataServices } from "@/lib/repositories";
import { readOrIssueActor, type Actor } from "@/lib/security/anon-token";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { createReportSchema, thoughtIdSchema } from "@/lib/validation/thought";
import { ApiError, assertSameOrigin, enforceRateLimit, handleError, json, lookupFailure, parseJsonBody } from "@/lib/api/http";
import type { CreateReportResponse } from "@/types/api";

/** 신고 접수 — 같은 익명 사용자의 같은 게시물 중복 신고는 한 번만 기록된다. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  let actor: Actor | null = null;
  try {
    assertSameOrigin(request);
    const { id } = await ctx.params;
    if (!thoughtIdSchema.safeParse(id).success) throw new ApiError(404, "NOT_FOUND", "고민을 찾을 수 없어요.");
    actor = readOrIssueActor(request);
    const { reason } = await parseJsonBody(request, createReportSchema);

    const { thoughts, rateLimiter } = getDataServices();
    await enforceRateLimit(rateLimiter, request, actor.hash, {
      actor: RATE_LIMITS.reportActor,
      ip: RATE_LIMITS.reportIp,
    });

    const result = await thoughts.createReport({ thoughtId: id, reason, reporterHash: actor.hash });
    if (result === "created" || result === "duplicate") {
      const body: CreateReportResponse = { status: result === "created" ? "received" : "already_reported" };
      return json(body, { status: result === "created" ? 201 : 200, actor });
    }
    throw lookupFailure(result);
  } catch (err) {
    return handleError(err, actor);
  }
}
