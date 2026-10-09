import "server-only";
import type { z } from "zod";
import type { ApiErrorBody, ApiErrorCode } from "@/types/api";
import type { Actor } from "@/lib/security/anon-token";
import { getClientIp, hashIp } from "@/lib/security/anon-token";
import type { RateLimiter, RateLimitRule } from "@/lib/security/rate-limit";

const NO_STORE = { "Cache-Control": "no-store" };

export function json<T>(body: T, init: { status?: number; actor?: Actor | null } = {}): Response {
  const headers = new Headers(NO_STORE);
  if (init.actor?.setCookie) headers.append("Set-Cookie", init.actor.setCookie);
  return Response.json(body, { status: init.status ?? 200, headers });
}

export function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra: { fields?: Record<string, string[]>; actor?: Actor | null; retryAfter?: number } = {},
): Response {
  const body: ApiErrorBody = { error: { code, message, ...(extra.fields ? { fields: extra.fields } : {}) } };
  const res = json(body, { status, actor: extra.actor });
  if (extra.retryAfter) res.headers.set("Retry-After", String(extra.retryAfter));
  return res;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

/** 브라우저 교차 사이트 요청 차단 (Origin 이 있으면 Host 와 일치해야 함) */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw new Error();
  } catch {
    throw new ApiError(403, "FORBIDDEN", "허용되지 않은 요청이에요.");
  }
}

const MAX_BODY_BYTES = 8 * 1024;

export async function parseJsonBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "JSON 형식으로 보내주세요.");
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    throw new ApiError(413 as number, "BAD_REQUEST", "요청 본문이 너무 커요.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "요청 형식이 올바르지 않아요.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      (fields[key] ??= []).push(issue.message);
    }
    const first = parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.";
    throw new ApiError(422, "VALIDATION_FAILED", first, fields);
  }
  return parsed.data;
}

/** 익명 식별값과 IP 해시 두 기준으로 요청 빈도를 제한한다. */
export async function enforceRateLimit(
  limiter: RateLimiter,
  request: Request,
  actorHash: string,
  rules: { actor: RateLimitRule; ip: RateLimitRule },
) {
  const ipKey = hashIp(getClientIp(request));
  const [actorOk, ipOk] = await Promise.all([
    limiter.hit(rules.actor, actorHash),
    limiter.hit(rules.ip, ipKey),
  ]);
  if (!actorOk || !ipOk) {
    throw new ApiError(429, "RATE_LIMITED", "잠시 쉬었다가 다시 시도해주세요.");
  }
}

/** 공통 오류 처리. 로그에는 본문·토큰·IP 를 남기지 않는다. */
export function handleError(err: unknown, actor?: Actor | null): Response {
  if (err instanceof ApiError) {
    return errorResponse(err.status, err.code, err.message, {
      fields: err.fields,
      actor,
      retryAfter: err.status === 429 ? 60 : undefined,
    });
  }
  console.error("[api] unexpected error:", err instanceof Error ? err.message : "unknown");
  return errorResponse(500, "INTERNAL_ERROR", "일시적인 문제가 생겼어요. 잠시 후 다시 시도해주세요.", { actor });
}

export function lookupFailure(state: "not_found" | "expired" | "unavailable"): ApiError {
  switch (state) {
    case "expired":
      return new ApiError(410, "EXPIRED", "이 고민은 24시간이 지나 하늘에서 사라졌어요.");
    case "unavailable":
      return new ApiError(404, "UNAVAILABLE", "지금은 볼 수 없는 고민이에요.");
    default:
      return new ApiError(404, "NOT_FOUND", "고민을 찾을 수 없어요.");
  }
}
