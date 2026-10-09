import { getDataServices } from "@/lib/repositories";
import { readActor } from "@/lib/security/anon-token";
import { thoughtIdSchema } from "@/lib/validation/thought";
import { ApiError, handleError, json, lookupFailure } from "@/lib/api/http";
import type { GetThoughtResponse } from "@/types/api";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!thoughtIdSchema.safeParse(id).success) throw new ApiError(404, "NOT_FOUND", "고민을 찾을 수 없어요.");

    // 조회만으로는 새 식별 토큰을 발급하지 않는다.
    const actor = readActor(request);
    const { thoughts } = getDataServices();
    const [lookup, now] = await Promise.all([thoughts.getForViewer(id, actor?.hash ?? null), thoughts.now()]);
    if (lookup.state !== "active") throw lookupFailure(lookup.state);

    const body: GetThoughtResponse = { thought: lookup.thought, viewer: lookup.viewer, serverNow: now.toISOString() };
    return json(body);
  } catch (err) {
    return handleError(err);
  }
}
