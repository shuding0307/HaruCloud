import { describe, expect, it } from "vitest";
import { CLOUD_ASPECT, gridFor, layoutClouds } from "@/lib/sky/layout";

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `id-${i}`, length: 20 + i * 7 }));

function overlaps(a: { x: number; y: number; width: number }, b: { x: number; y: number; width: number }) {
  const ah = a.width / CLOUD_ASPECT;
  const bh = b.width / CLOUD_ASPECT;
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + bh && b.y < a.y + ah;
}

describe("구름 배치", () => {
  it("모바일은 최대 12개, 데스크톱은 최대 30개", () => {
    expect(gridFor(375, 560).capacity).toBeGreaterThanOrEqual(6);
    expect(gridFor(375, 560).capacity).toBeLessThanOrEqual(12);
    expect(gridFor(1440, 720).capacity).toBeGreaterThanOrEqual(15);
    expect(gridFor(1440, 720).capacity).toBeLessThanOrEqual(30);
  });

  for (const [w, h] of [
    [360, 520],
    [390, 640],
    [768, 800],
    [1280, 640],
    [1920, 900],
  ] as const) {
    it(`${w}×${h}: 구름이 서로 겹치지 않고 영역 안에 있다`, () => {
      const slots = layoutClouds(items(40), w, h);
      expect(slots.length).toBe(gridFor(w, h).capacity);
      for (const s of slots) {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.x + s.width).toBeLessThanOrEqual(w + 1);
        expect(s.y + s.width / CLOUD_ASPECT).toBeLessThanOrEqual(h + 1);
        expect(s.floatDuration).toBeGreaterThanOrEqual(12);
        expect(s.floatDuration).toBeLessThanOrEqual(24);
      }
      for (let i = 0; i < slots.length; i++)
        for (let j = i + 1; j < slots.length; j++) expect(overlaps(slots[i]!, slots[j]!)).toBe(false);
    });
  }

  it("같은 입력이면 같은 배치를 만든다", () => {
    expect(layoutClouds(items(8), 390, 600)).toEqual(layoutClouds(items(8), 390, 600));
  });

  it("빈 목록이면 빈 배치", () => {
    expect(layoutClouds([], 390, 600)).toEqual([]);
  });
});
