import { getDataServices } from "@/lib/repositories";
import { readOrIssueActor, type Actor } from "@/lib/security/anon-token";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { createFeedbackSchema } from "@/lib/validation/thought";
import { assertSameOrigin, enforceRateLimit, handleError, json, parseJsonBody } from "@/lib/api/http";
import type { CreateFeedbackResponse } from "@/types/api";

/** 건의·문의·피드백 접수 — 익명으로 저장하고, 답장 기능은 없다. */
export async function POST(request: Request) {
  let actor: Actor | null = null;
  try {
    assertSameOrigin(request);
    actor = readOrIssueActor(request);
    const { category, message } = await parseJsonBody(request, createFeedbackSchema);
    const { feedback, rateLimiter } = getDataServices();
    await enforceRateLimit(rateLimiter, request, actor.hash, {
      actor: RATE_LIMITS.feedbackActor,
      ip: RATE_LIMITS.feedbackIp,
    });
    await feedback.create({ category, message, senderHash: actor.hash });
    const body: CreateFeedbackResponse = { status: "received" };
    return json(body, { status: 201, actor });
  } catch (err) {
    return handleError(err, actor);
  }
}
