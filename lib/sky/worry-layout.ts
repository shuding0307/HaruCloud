/**
 * 메인 하늘의 고민 배치 (harucloud-sky 의 SLOTS 지그재그를 세로로 반복).
 * 고민마다 고정된 순번(seq)을 주고 순번으로 자리를 정하므로,
 * 위쪽에 이전 고민이 붙거나 아래쪽에 새 고민이 붙어도 기존 고민의 지그재그 자리가 바뀌지 않는다.
 */
export const SLOTS = [
  { x: 4, y: 10 },
  { x: 30, y: 118 },
  { x: 2, y: 226 },
  { x: 30, y: 322 },
  { x: 10, y: 420 },
  { x: 32, y: 512 },
] as const;

/** 6개 묶음이 반복되는 세로 간격 — 다음 묶음의 첫 자리가 이전 마지막 자리(512)보다 98px 아래 */
export const BLOCK_HEIGHT = 600;
/** 마지막 고민 아래로 남기는 높이 (구름 높이 + 여유) */
const BOTTOM_ROOM = 130;

export interface Placement {
  x: number; // left %
  y: number; // top px
}

function rawY(seq: number) {
  const slot = SLOTS[((seq % 6) + 6) % 6]!;
  return Math.floor(seq / 6) * BLOCK_HEIGHT + slot.y;
}

export function placeBySeq(seq: number, minSeq: number): Placement {
  const slot = SLOTS[((seq % 6) + 6) % 6]!;
  // 가장 오래된 고민이 맨 위 첫 자리(y=10)에 오도록 전체를 끌어올린다
  const trim = rawY(minSeq) - SLOTS[0].y;
  return { x: slot.x, y: rawY(seq) - trim };
}

export function boardHeight(minSeq: number, maxSeq: number): number {
  return placeBySeq(maxSeq, minSeq).y + BOTTOM_ROOM;
}
