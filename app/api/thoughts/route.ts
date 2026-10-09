import { getDataServices } from "@/lib/repositories";
import { decodeCursor, encodeCursor } from "@/lib/repositories/cursor";
import { readOrIssueActor, type Actor } from "@/lib/security/anon-token";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { createThoughtSchema, listThoughtsQuerySchema } from "@/lib/validation/thought";
import { ApiError, assertSameOrigin, enforceRateLimit, handleError, json, parseJsonBody } from "@/lib/api/http";
import type { CreateThoughtResponse, ListThoughtsResponse } from "@/types/api";

/** 공개 중인(만료되지 않은) 고민 목록 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = listThoughtsQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!query.success) throw new ApiError(400, "BAD_REQUEST", "목록 요청 값이 올바르지 않아요.");
    const cursor = decodeCursor(query.data.cursor);
    if (cursor === null) throw new ApiError(400, "BAD_REQUEST", "목록 위치 값이 올바르지 않아요.");

    const { thoughts } = getDataServices();
    const [result, now] = await Promise.all([
      thoughts.listActive({ limit: query.data.limit, cursor }),
      thoughts.now(),
    ]);
    const body: ListThoughtsResponse = {
      thoughts: result.thoughts,
      nextCursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
      serverNow: now.toISOString(),
    };
    return json(body);
  } catch (err) {
    return handleError(err);
  }
}

/** 고민 작성 — 만료 시각은 서버가 계산한다. */
export async function POST(request: Request) {
  let actor: Actor | null = null;
  try {
    assertSameOrigin(request);
    actor = readOrIssueActor(request);
    const { content } = await parseJsonBody(request, createThoughtSchema);
    const { thoughts, rateLimiter } = getDataServices();
    await enforceRateLimit(rateLimiter, request, actor.hash, {
      actor: RATE_LIMITS.createThoughtActor,
      ip: RATE_LIMITS.createThoughtIp,
    });
    const thought = await thoughts.create({ content, authorHash: actor.hash });
    const body: CreateThoughtResponse = { thought };
    return json(body, { status: 201, actor });
  } catch (err) {
    return handleError(err, actor);
  }
}
