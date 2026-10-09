import type { ApiErrorBody, ApiErrorCode } from "@/types/api";

export class ClientApiError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode | "NETWORK",
    message: string,
  ) {
    super(message);
  }
}

/** API 호출 공통 처리. 성공 응답이 아니면 ClientApiError 를 던진다. */
export async function apiFetch<T>(input: string, init?: RequestInit): Promise<{ status: number; data: T }> {
  let res: Response;
  try {
    res = await fetch(input, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
    });
  } catch {
    throw new ClientApiError(0, "NETWORK", "연결이 불안정해요. 잠시 후 다시 시도해주세요.");
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* 본문이 없는 응답 */
  }
  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ClientApiError(res.status, err?.code ?? "INTERNAL_ERROR", err?.message ?? "일시적인 문제가 생겼어요.");
  }
  return { status: res.status, data: body as T };
}

/** 서버 시각과 브라우저 시각의 차이를 보정해 만료 판단을 서버 기준에 맞춘다. */
export function serverOffset(serverNowIso: string): number {
  const server = Date.parse(serverNowIso);
  return Number.isNaN(server) ? 0 : server - Date.now();
}
