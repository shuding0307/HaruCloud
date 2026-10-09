import { describe, expect, it } from "vitest";
import { boardHeight, placeBySeq, SLOTS } from "@/lib/sky/worry-layout";

describe("메인 하늘 고민 배치", () => {
  it("처음 6개는 레퍼런스 SLOTS 좌표 그대로", () => {
    for (let i = 0; i < 6; i++) expect(placeBySeq(i, 0)).toEqual({ x: SLOTS[i]!.x, y: SLOTS[i]!.y });
    expect(boardHeight(0, 5)).toBe(512 + 130);
  });

  it("7번째부터는 지그재그가 아래로 반복된다", () => {
    expect(placeBySeq(6, 0)).toEqual({ x: 4, y: 610 });
    expect(placeBySeq(11, 0)).toEqual({ x: 32, y: 1112 });
  });

  it("위쪽에 이전 고민이 붙어도 기존 고민의 x 는 그대로, y 는 같은 양만큼만 밀린다", () => {
    const before = [0, 1, 2, 3].map((s) => placeBySeq(s, 0));
    const after = [0, 1, 2, 3].map((s) => placeBySeq(s, -5));
    const shift = after[0]!.y - before[0]!.y;
    expect(shift).toBeGreaterThan(0);
    after.forEach((p, i) => {
      expect(p.x).toBe(before[i]!.x);
      expect(p.y - before[i]!.y).toBe(shift);
    });
    expect(placeBySeq(-5, -5).y).toBe(SLOTS[0].y); // 가장 오래된 고민은 맨 위
    expect(boardHeight(-5, 3) - boardHeight(0, 3)).toBe(shift);
  });

  it("아래쪽에 새 고민이 붙어도 기존 고민 자리는 그대로", () => {
    expect(placeBySeq(3, 0)).toEqual(placeBySeq(3, 0));
    expect(boardHeight(0, 6)).toBeGreaterThan(boardHeight(0, 5));
  });

  it("순번이 이어지면 고민 사이 세로 간격이 일정 범위 안에 있다", () => {
    for (let s = -20; s < 20; s++) {
      const gap = placeBySeq(s + 1, -20).y - placeBySeq(s, -20).y;
      expect(gap).toBeGreaterThanOrEqual(90);
      expect(gap).toBeLessThanOrEqual(110);
    }
  });
});
