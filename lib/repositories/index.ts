import "server-only";
import { getDataMode } from "@/lib/env";
import { MemoryRateLimiter } from "@/lib/security/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { MockThoughtRepository } from "./mock";
import { SupabaseRateLimiter, SupabaseThoughtRepository } from "./supabase";
import type { DataServices } from "./types";

const globalForData = globalThis as unknown as { __harucloudData?: DataServices };

/** 환경변수에 따라 Supabase 또는 Mock 구현을 반환한다. (프로세스 당 1회 생성) */
export function getDataServices(): DataServices {
  if (globalForData.__harucloudData) return globalForData.__harucloudData;

  const mode = getDataMode();
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
  globalForData.__harucloudData = services;
  return services;
}

/** 테스트에서 저장소를 교체할 때 사용 */
export function setDataServicesForTesting(services: DataServices | undefined) {
  globalForData.__harucloudData = services;
}
