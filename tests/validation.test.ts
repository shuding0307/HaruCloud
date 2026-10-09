import { describe, expect, it } from "vitest";
import {
  countChars,
  createReactionSchema,
  createReportSchema,
  createThoughtSchema,
  normalizeThoughtContent,
} from "@/lib/validation/thought";

describe("고민 입력 검증", () => {
  it("정상 입력을 허용하고 앞뒤 공백을 정리한다", () => {
    const r = createThoughtSchema.safeParse({ content: "  오늘 조금 지쳤어요  \n" });
    expect(r.success).toBe(true);
    expect(r.success && r.data.content).toBe("오늘 조금 지쳤어요");
  });

  it("빈 문자열·공백·보이지 않는 문자만 있는 입력을 거부한다", () => {
    for (const content of ["", "    ", "\n\n\t", "​​", "﻿ "]) {
      expect(createThoughtSchema.safeParse({ content }).success).toBe(false);
    }
  });

  it("500자는 허용하고 501자는 거부한다 (한글·이모지 포함 코드 포인트 기준)", () => {
    expect(createThoughtSchema.safeParse({ content: "가".repeat(500) }).success).toBe(true);
    expect(createThoughtSchema.safeParse({ content: "가".repeat(501) }).success).toBe(false);
    expect(createThoughtSchema.safeParse({ content: "😀".repeat(500) }).success).toBe(true);
    expect(createThoughtSchema.safeParse({ content: "😀".repeat(501) }).success).toBe(false);
  });

  it("문자열이 아닌 값을 거부한다", () => {
    expect(createThoughtSchema.safeParse({ content: 123 }).success).toBe(false);
    expect(createThoughtSchema.safeParse({}).success).toBe(false);
  });

  it("HTML 은 그대로 문자열로 다뤄지고(렌더링 시 이스케이프) 제어문자는 제거된다", () => {
    expect(normalizeThoughtContent("<script>x</script>\u0007")).toBe("<script>x</script>");
    expect(normalizeThoughtContent("a\r\n\n\n\nb")).toBe("a\n\nb");
    expect(countChars("👍🏻가")).toBe(3);
  });

  it("공감 유형과 신고 사유는 정해진 값만 허용한다", () => {
    expect(createReactionSchema.safeParse({ type: "been_there" }).success).toBe(true);
    expect(createReactionSchema.safeParse({ type: "like" }).success).toBe(false);
    expect(createReportSchema.safeParse({ reason: "privacy" }).success).toBe(true);
    expect(createReportSchema.safeParse({ reason: "hate" }).success).toBe(false);
  });
});
