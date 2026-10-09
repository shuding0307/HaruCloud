import { describe, expect, it } from "vitest";
import { resolveSky } from "@/lib/sky/day-night";

describe("낮/밤 판단", () => {
  it("06:00–18:59 는 낮, 그 외는 밤", () => {
    expect(resolveSky(5, "")).toBe("night");
    expect(resolveSky(6, "")).toBe("day");
    expect(resolveSky(18, "")).toBe("day");
    expect(resolveSky(19, "")).toBe("night");
    expect(resolveSky(0, "")).toBe("night");
  });

  it("?sky=day|night 로 강제하고, 잘못된 값은 무시한다", () => {
    expect(resolveSky(12, "?sky=night")).toBe("night");
    expect(resolveSky(23, "?sky=day")).toBe("day");
    expect(resolveSky(12, "?sky=dusk")).toBe("day");
  });
});
