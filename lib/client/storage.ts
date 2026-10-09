/**
 * 브라우저 저장소 래퍼. 사생활 보호 모드 등에서 접근이 막혀도 예외 없이 동작한다.
 * - 작성 중 초안: localStorage (이 기기에만 저장, 서버 전송 없음)
 * - 게시 완료 표시: sessionStorage (탭을 닫으면 사라짐, 게시물 id 만 저장)
 */
export const DRAFT_KEY = "harucloud:draft";
export const SENT_KEY = "harucloud:sent";

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export const draftStore = {
  read: () => safe(() => window.localStorage.getItem(DRAFT_KEY) ?? "", ""),
  write: (value: string) =>
    safe(() => {
      if (value.trim()) window.localStorage.setItem(DRAFT_KEY, value);
      else window.localStorage.removeItem(DRAFT_KEY);
    }, undefined),
  clear: () => safe(() => window.localStorage.removeItem(DRAFT_KEY), undefined),
};

export const sentStore = {
  read: () => safe(() => window.sessionStorage.getItem(SENT_KEY), null),
  write: (id: string) => safe(() => window.sessionStorage.setItem(SENT_KEY, id), undefined),
};
