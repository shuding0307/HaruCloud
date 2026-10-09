import "server-only";

export type DataMode = "mock" | "supabase";

/**
 * 데이터 모드를 결정한다.
 * - DATA_MODE 가 명시되면 그 값을 사용한다.
 * - 명시되지 않으면 개발 환경은 mock, 프로덕션은 supabase.
 * - 프로덕션에서 mock 은 ALLOW_MOCK_IN_PRODUCTION=true 일 때만 허용한다.
 */
export function getDataMode(): DataMode {
  const raw = process.env.DATA_MODE?.trim().toLowerCase();
  const isProd = process.env.NODE_ENV === "production";

  if (raw && raw !== "mock" && raw !== "supabase") {
    throw new Error(`DATA_MODE 값이 올바르지 않습니다: "${raw}" (mock | supabase)`);
  }
  const mode: DataMode = (raw as DataMode | undefined) ?? (isProd ? "supabase" : "mock");

  if (mode === "mock" && isProd && process.env.ALLOW_MOCK_IN_PRODUCTION !== "true") {
    throw new Error(
      "프로덕션 환경에서 mock 모드가 감지되었습니다. 실제 서비스라면 DATA_MODE=supabase 를 설정하세요. " +
        "데모 목적이라면 ALLOW_MOCK_IN_PRODUCTION=true 를 명시해야 합니다.",
    );
  }
  return mode;
}

/** UI 표시용: 예외를 던지지 않고 mock 여부만 알려준다. */
export function isMockMode(): boolean {
  try {
    return getDataMode() === "mock";
  } catch {
    return false;
  }
}

const DEV_FALLBACK_SECRET = "harucloud-dev-only-secret-do-not-use-in-production";

export function getAnonSecret(): string {
  const secret = process.env.ANON_TOKEN_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production" && getDataMode() === "supabase") {
    throw new Error("ANON_TOKEN_SECRET 가 없거나 32자 미만입니다.");
  }
  return DEV_FALLBACK_SECRET;
}

export function getSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase 환경변수(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다.",
    );
  }
  return { url, serviceRoleKey };
}
