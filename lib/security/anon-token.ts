import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getAnonSecret } from "@/lib/env";

/**
 * 익명 식별 토큰
 * - 쿠키 값: `<랜덤ID>.<HMAC 서명>` (httpOnly, SameSite=Lax)
 * - DB 에는 원본이 아닌 별도 HMAC 해시(actor hash)만 저장한다.
 * - 쿠키를 지우면 새 식별자가 발급되므로, 중복 방지는 IP 해시 기반 요청 제한과 함께 동작한다.
 */
export const ACTOR_COOKIE = "hc_actor";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30일

function hmac(purpose: string, value: string): string {
  return createHmac("sha256", getAnonSecret()).update(`${purpose}:${value}`).digest("base64url");
}

export function signActorId(id: string): string {
  return `${id}.${hmac("actor-cookie", id)}`;
}

export function verifyActorToken(token: string | undefined | null): string | null {
  if (!token || token.length > 200) return null;
  const [id, sig, ...rest] = token.split(".");
  if (!id || !sig || rest.length > 0 || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) return null;
  const expected = Buffer.from(hmac("actor-cookie", id));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return id;
}

export function hashActorId(id: string): string {
  return hmac("actor-hash", id);
}

/** IP 원문은 저장하지 않고, 요청 제한 키로만 쓰는 단방향 해시 */
export function hashIp(ip: string): string {
  return hmac("ip", ip);
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export interface Actor {
  hash: string;
  /** 새 토큰을 발급했다면 응답에 붙일 Set-Cookie 값 */
  setCookie: string | null;
}

/** 쿠키에서 검증된 익명 식별값을 읽는다. 없거나 위조되었으면 null. */
export function readActor(request: Request): Actor | null {
  const existing = verifyActorToken(readCookie(request, ACTOR_COOKIE));
  return existing ? { hash: hashActorId(existing), setCookie: null } : null;
}

/** 검증된 식별값이 없으면 새로 발급한다. (쓰기 요청에서만 사용) */
export function readOrIssueActor(request: Request): Actor {
  const existing = readActor(request);
  if (existing) return existing;

  const id = randomBytes(18).toString("base64url");
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return {
    hash: hashActorId(id),
    setCookie: `${ACTOR_COOKIE}=${signActorId(id)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
