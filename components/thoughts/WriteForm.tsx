"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { THOUGHT_LIFETIME_HOURS, THOUGHT_MAX_LENGTH } from "@/types/thought";
import type { CreateThoughtResponse } from "@/types/api";
import { apiFetch, ClientApiError } from "@/lib/client/api";
import { draftStore, sentStore } from "@/lib/client/storage";
import { countChars, normalizeThoughtContent } from "@/lib/validation/thought";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/Icon";
import { CloudPreview } from "./CloudPreview";

export function WriteForm() {
  const router = useRouter();
  const toast = useToast();
  const inputId = useId();
  const counterId = useId();
  const hintId = useId();
  const [content, setContent] = useState("");
  const [restored, setRestored] = useState(false);
  const [dialog, setDialog] = useState<"none" | "preview" | "confirm">("none");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const hydrated = useRef(false);

  // 이 기기에 남아 있던 초안 복원
  useEffect(() => {
    const draft = draftStore.read();
    if (draft) {
      // 브라우저 저장소(외부 시스템)에서 초안을 1회 복원한다. 서버 렌더와 어긋나지 않도록 마운트 후에 읽는다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContent(draft);
      setRestored(true);
    }
    hydrated.current = true;
  }, []);

  // 입력이 멈추면 이 기기에만 임시 저장 (서버 전송 없음)
  useEffect(() => {
    if (!hydrated.current) return;
    const id = window.setTimeout(() => draftStore.write(content), 400);
    return () => window.clearTimeout(id);
  }, [content]);

  const normalized = normalizeThoughtContent(content);
  const length = countChars(normalized);
  const isEmpty = length === 0;
  const isTooLong = length > THOUGHT_MAX_LENGTH;
  const canSubmit = !isEmpty && !isTooLong && !submitting;

  function handleChange(value: string) {
    setError(null);
    // 붙여넣기 등으로 최대 길이를 크게 넘으면 잘라내고 알려준다.
    const chars = Array.from(value);
    if (chars.length > THOUGHT_MAX_LENGTH + 50) {
      setContent(chars.slice(0, THOUGHT_MAX_LENGTH).join(""));
      toast(`${THOUGHT_MAX_LENGTH}자까지만 담을 수 있어요.`, "error");
      return;
    }
    setContent(value);
  }

  async function publish() {
    if (submittingRef.current || !canSubmit) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await apiFetch<CreateThoughtResponse>("/api/thoughts", {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      // 서버 저장이 성공한 뒤에만 초안을 지우고 완료 화면으로 이동한다.
      draftStore.clear();
      sentStore.write(data.thought.id);
      router.replace("/sent");
    } catch (err) {
      const message =
        err instanceof ClientApiError ? err.message : "일시적인 문제가 생겼어요. 잠시 후 다시 시도해주세요.";
      setError(`${message} 작성한 내용은 그대로 남아 있어요.`);
      setDialog("none");
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) setDialog("confirm");
      }}
      className="flex flex-1 flex-col"
      noValidate
    >
      <h1 className="text-[28px] font-bold leading-tight text-deep-sky sm:text-[32px]">무슨 마음이 있나요?</h1>
      <p className="mt-2 text-[15px] text-ink-soft">잘 정리하지 않아도 괜찮아요. 있는 그대로 적어주세요.</p>

      {restored && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-white/70 px-4 py-2 text-[13px] text-ink-soft">
          <span>이 기기에 임시 저장된 글을 불러왔어요.</span>
          <button
            type="button"
            className="min-h-11 shrink-0 px-2 font-medium text-deep-sky underline underline-offset-4"
            onClick={() => {
              setContent("");
              draftStore.clear();
              setRestored(false);
            }}
          >
            지우기
          </button>
        </div>
      )}

      <label htmlFor={inputId} className="sr-only">
        고민 내용
      </label>
      <Textarea
        id={inputId}
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        rows={9}
        placeholder="오늘 마음에 걸린 일을 적어보세요."
        aria-describedby={`${counterId} ${hintId}`}
        aria-invalid={isTooLong || undefined}
        className="mt-5 min-h-56"
        autoFocus
      />
      <div className="mt-2 flex items-start justify-between gap-3 px-1 text-[13px]">
        <p id={hintId} className="text-ink-soft">
          작성 중인 글은 이 기기에만 임시 저장되고, 띄우기 전까지 서버로 보내지지 않아요.
        </p>
        <p
          id={counterId}
          aria-live="polite"
          className={`shrink-0 tabular-nums ${isTooLong ? "font-semibold text-danger" : "text-ink-soft"}`}
        >
          {length} / {THOUGHT_MAX_LENGTH}
        </p>
      </div>

      <ul className="mt-5 space-y-2 rounded-[var(--radius-md)] bg-pearl/60 px-5 py-4 text-sm text-ink ring-1 ring-white/60 backdrop-blur-md">
        <li className="flex gap-2">
          <Icon name="cloud" className="mt-0.5 shrink-0 text-deep-sky/70" />
          <span>이름·연락처 없이 <strong className="font-semibold">익명</strong>으로 하늘에 공개돼요.</span>
        </li>
        <li className="flex gap-2">
          <Icon name="clock" className="mt-0.5 shrink-0 text-deep-sky/70" />
          <span>
            공개 후 <strong className="font-semibold">{THOUGHT_LIFETIME_HOURS}시간</strong>이 지나면 하늘에서 사라져요.
          </span>
        </li>
        <li className="flex gap-2">
          <Icon name="lock" className="mt-0.5 shrink-0 text-deep-sky/70" />
          <span>이름, 연락처, 학교·회사처럼 나를 알아볼 수 있는 정보는 적지 않는 걸 권해요.</span>
        </li>
      </ul>

      {error && (
        <p role="alert" className="mt-4 rounded-[var(--radius-sm)] bg-white px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="mt-auto flex flex-col-reverse gap-2 pt-8 sm:flex-row sm:justify-end">
        <ButtonLink href="/" variant="ghost">
          취소
        </ButtonLink>
        <Button variant="secondary" disabled={isEmpty || isTooLong} onClick={() => setDialog("preview")}>
          미리보기
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          하늘에 띄우기
        </Button>
      </div>

      <Modal open={dialog === "preview"} onClose={() => setDialog("none")} title="미리보기">
        <CloudPreview content={normalized} />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setDialog("none")}>
            더 고치기
          </Button>
          <Button onClick={() => setDialog("confirm")} disabled={!canSubmit}>
            이대로 띄우기
          </Button>
        </div>
      </Modal>

      <Modal
        open={dialog === "confirm"}
        onClose={() => !submitting && setDialog("none")}
        title="이 마음을 하늘에 띄울까요?"
        description="띄운 뒤에는 고치거나 직접 지울 수 없어요."
      >
        <CloudPreview content={normalized} />
        <dl className="mt-4 space-y-2 rounded-[var(--radius-md)] bg-lavender/50 px-4 py-3 text-sm">
          <div className="flex gap-2">
            <dt className="shrink-0 font-semibold">공개 범위</dt>
            <dd>HaruCloud를 방문한 누구나 익명으로 읽고 공감할 수 있어요.</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-semibold">공개 기간</dt>
            <dd>지금부터 {THOUGHT_LIFETIME_HOURS}시간 동안. 이후 하늘에서 사라지고 삭제돼요.</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setDialog("none")} disabled={submitting}>
            조금 더 생각할게요
          </Button>
          <Button onClick={publish} disabled={!canSubmit} aria-busy={submitting}>
            {submitting ? "띄워 보내는 중…" : "하늘에 띄우기"}
          </Button>
        </div>
      </Modal>
    </form>
  );
}
