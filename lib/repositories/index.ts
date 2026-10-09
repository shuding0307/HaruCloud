import "server-only";
import { getDataMode } from "@/lib/env";
import { MemoryRateLimiter } from "@/lib/security/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { MockThoughtRepository } from "./mock";
import { SupabaseRateLimiter, SupabaseThoughtRepository } from "./supabase";
import type { DataServices } from "./types";

const PINNED = "pinned-for-testing";
const globalForData = globalThis as unknown as { __harucloudData?: DataServices & { key?: string } };

/** 환경변수에 따라 Supabase 또는 Mock 구현을 반환한다. 모드가 바뀌면(개발 중 .env 변경) 새로 만든다. */
export function getDataServices(): DataServices {
  const mode = getDataMode();
  const cached = globalForData.__harucloudData;
  if (cached && (cached.key === PINNED || cached.key === mode)) return cached;

  let services: DataServices;
  if (mode === "supabase") {
    const db = getSupabaseAdmin();
    services = { thoughts: new SupabaseThoughtRepository(db), rateLimiter: new SupabaseRateLimiter(db) };
  } else {
    services = {
      thoughts: new MockThoughtRepository(undefined, { seed: process.env.NODE_ENV !== "test" }),
      rateLimiter: new MemoryRateLimiter(),
    };
  }
  globalForData.__harucloudData = { ...services, key: mode };
  return services;
}

/** 테스트에서 저장소를 교체할 때 사용 */
export function setDataServicesForTesting(services: DataServices | undefined) {
  globalForData.__harucloudData = services && { ...services, key: PINNED };
}
