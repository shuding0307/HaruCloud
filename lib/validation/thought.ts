import { z } from "zod";
import {
  REACTION_TYPES,
  REPORT_REASONS,
  THOUGHT_MAX_LENGTH,
} from "@/types/thought";

// 제어문자(줄바꿈·탭 제외)와 보이지 않는 문자 제거
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const INVISIBLE_CHARS = /[​-‍⁠﻿]/g;

/** 저장 전 본문 정규화: 보이지 않는 문자 제거, 줄 끝 통일, 3줄 이상 빈 줄 축약, 앞뒤 공백 제거 */
export function normalizeThoughtContent(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    .replace(INVISIBLE_CHARS, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 사용자에게 보이는 글자 수(코드 포인트 기준, DB char_length와 동일) */
export function countChars(text: string): number {
  return Array.from(text).length;
}

export const createThoughtSchema = z.object({
  content: z
    .string({ error: "고민 내용을 입력해주세요." })
    .max(THOUGHT_MAX_LENGTH * 4, { error: "글이 너무 길어요." })
    .transform(normalizeThoughtContent)
    .refine((v) => countChars(v) >= 1, { error: "고민 내용을 입력해주세요." })
    .refine((v) => countChars(v) <= THOUGHT_MAX_LENGTH, {
      error: `최대 ${THOUGHT_MAX_LENGTH}자까지 쓸 수 있어요.`,
    }),
});

export const thoughtIdSchema = z.uuid({ error: "잘못된 고민 주소예요." });

export const createReactionSchema = z.object({
  type: z.enum(REACTION_TYPES, { error: "알 수 없는 공감 유형이에요." }),
});

export const createReportSchema = z.object({
  reason: z.enum(REPORT_REASONS, { error: "신고 사유를 선택해주세요." }),
});

export const listThoughtsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(30),
  cursor: z.string().max(200).optional(),
});
