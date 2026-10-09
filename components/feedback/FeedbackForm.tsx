"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_MAX_LENGTH,
  FEEDBACK_RETENTION_DAYS,
  type FeedbackCategory,
} from "@/types/feedback";
import type { CreateFeedbackResponse } from "@/types/api";
import { apiFetch, ClientApiError } from "@/lib/client/api";
import { countChars, normalizeThoughtContent } from "@/lib/validation/thought";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

/** 이용 안내 페이지의 건의·문의·피드백 입력란 (익명, 답장 없음) */
export function FeedbackForm() {
  const messageId = useId();
  const hintId = useId();
  const countId = useId();
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const sendingRef = useRef(false);

  const length = countChars(normalizeThoughtContent(message));
  const tooLong = length > FEEDBACK_MAX_LENGTH;
  const canSend = length > 0 && !tooLong && !sending;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSend || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      await apiFetch<CreateFeedbackResponse>("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ category, message }),
      });
      setSent(true);
      setMessage("");
    } catch (err) {
      // 실패하면 쓴 내용을 그대로 두고 알려준다
      setError(err instanceof ClientApiError ? err.message : "의견을 보내지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="rounded-[var(--radius-md)] bg-sky/70 px-5 py-4">
        <p className="font-semibold text-deep-sky">소중한 의견 고마워요.</p>
        <p className="mt-1 text-sm text-ink-soft">보내주신 내용은 HaruCloud를 다듬는 데 꼼꼼히 참고할게요.</p>
        <Button variant="ghost" className="mt-2 -ml-3" onClick={() => setSent(false)}>
          다른 의견 보내기
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">어떤 이야기인가요?</legend>
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_CATEGORIES.map((c) => (
            <label
              key={c}
              className={`inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-[15px] ring-1 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-deep-sky ${
                category === c ? "bg-deep-sky text-white ring-deep-sky" : "bg-white/80 text-ink ring-cloud-blue/50 hover:bg-white"
              }`}
            >
              <input
                type="radio"
                name="feedback-category"
                value={c}
                checked={category === c}
                onChange={() => setCategory(c)}
                className="sr-only"
              />
              {FEEDBACK_CATEGORY_LABELS[c]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={messageId} className="mb-2 block text-sm font-semibold text-ink">
          내용
        </label>
        <Textarea
          id={messageId}
          value={message}
          onChange={(e) => {
            setError(null);
            setMessage(e.target.value);
          }}
          rows={5}
          placeholder="불편했던 점, 바라는 기능, 궁금한 점을 자유롭게 적어주세요."
          aria-describedby={`${hintId} ${countId}`}
          aria-invalid={tooLong || undefined}
        />
        <div className="mt-2 flex items-start justify-between gap-3 px-1 text-[13px]">
          <p id={hintId} className="text-ink-soft">
            익명으로 전달되고 답장은 드릴 수 없어요. 이름·연락처 같은 개인정보는 적지 말아주세요. 보내주신 의견은{" "}
            {FEEDBACK_RETENTION_DAYS}일 뒤 삭제돼요.
          </p>
          <p
            id={countId}
            aria-live="polite"
            className={`shrink-0 tabular-nums ${tooLong ? "font-semibold text-danger" : "text-ink-soft"}`}
          >
            {length} / {FEEDBACK_MAX_LENGTH}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-white px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={!canSend} aria-busy={sending || undefined}>
          {sending ? "보내는 중…" : "의견 보내기"}
        </Button>
      </div>
    </form>
  );
}
