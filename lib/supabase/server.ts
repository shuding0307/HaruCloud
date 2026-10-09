import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/env";

let client: SupabaseClient | null = null;

/**
 * 서버 전용 Supabase 클라이언트 (service role).
 * - 브라우저 번들에 포함되지 않도록 server-only 로 보호한다.
 * - 테이블 직접 접근 대신 권한이 통제된 RPC 함수만 호출한다.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  const { url, serviceRoleKey } = getSupabaseConfig();
  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "harucloud-server" } },
  });
  return client;
}
