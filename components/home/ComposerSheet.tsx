"use client";

import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { THOUGHT_LIFETIME_HOURS, THOUGHT_MAX_LENGTH } from "@/types/thought";
import { countChars, normalizeThoughtContent } from "@/lib/validation/thought";
import { s } from "./classes";
import { SKY_COPY } from "./HomeHeader";
import { figureClass, SkyFigure } from "./SkyFigure";
import { useSkyMode } from "./useSkyMode";

export type SheetStep = "write" | "preview";

interface Props {
  open: boolean;
  step: SheetStep;
  text: string;
  sending: boolean;
  onChange(text: string): void;
  onStep(step: SheetStep): void;
  onSubmit(): void;
  onClose(): void;
}

/**
 * 고민 작성 시트. 쓰기 → 미리보기(하늘에 보일 모습·공개 범위·기간 확인) → 띄우기.
 * 네이티브 <dialog> 의 showModal() 로 포커스 가두기·배경 비활성화·Esc 닫기를 브라우저가 처리한다.
 */
export function ComposerSheet({ open, step, text, sending, onChange, onStep, onSubmit, onClose }: Props) {
  const sky = useSkyMode();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const normalized = normalizeThoughtContent(text);
  const length = countChars(normalized);
  const tooLong = length > THOUGHT_MAX_LENGTH;
  const canSend = length > 0 && !tooLong && !sending;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // 단계가 바뀌면 그 단계의 주요 컨트롤로 포커스를 옮긴다
  useEffect(() => {
    if (!open) return;
    if (step === "write") {
      const area = areaRef.current;
      if (area) {
        area.focus();
        area.setSelectionRange(area.value.length, area.value.length);
      }
    } else {
      confirmRef.current?.focus();
    }
  }, [open, step]);

  function toPreview(e?: FormEvent) {
    e?.preventDefault();
    if (canSend) onStep("preview");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // ⌘/Ctrl + Enter 로 미리보기
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      toPreview();
    }
  }

  const closeIcon = (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );

  return (
    <dialog
      ref={dialogRef}
      className={s.sheet}
      aria-labelledby={step === "write" ? "sheet-title" : "preview-title"}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        if (!sending) onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current && !sending) onClose();
      }}
    >
      {open && step === "write" && (
        <form key="write" className={`${s.composer} ${s.glass} ${s.sheetPanel}`} onSubmit={toPreview}>
          <div className={s.sheetHead}>
            <label id="sheet-title" htmlFor="worry-sheet">
              <span className={s.onlyDay}>{SKY_COPY.day.label}</span>
              <span className={s.onlyNight}>{SKY_COPY.night.label}</span>
            </label>
            <button type="button" className={s.sheetClose} onClick={onClose} aria-label="닫기">
              {closeIcon}
            </button>
          </div>

          <textarea
            ref={areaRef}
            id="worry-sheet"
            className={s.sheetArea}
            value={text}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="어떤 고민을 띄워볼까요? 잘 정리하지 않아도 괜찮아요."
            aria-describedby="sheet-hint sheet-count"
            aria-invalid={tooLong || undefined}
          />

          <div className={s.sheetMeta}>
            <p id="sheet-hint">이름 없이 익명으로 공개되고, {THOUGHT_LIFETIME_HOURS}시간이 지나면 사라져요.</p>
            <p id="sheet-count" aria-live="polite" className={tooLong ? s.sheetOver : undefined}>
              {length} / {THOUGHT_MAX_LENGTH}
            </p>
          </div>

          <div className={s.row}>
            <button type="button" className={s.sheetCancel} onClick={onClose}>
              닫기
            </button>
            <button type="submit" className={`${s.send} ${s.sheetSend}`} disabled={!canSend}>
              미리보기
            </button>
          </div>
        </form>
      )}

      {open && step === "preview" && (
        <div key="preview" className={`${s.glass} ${s.dialogPanel}`}>
          <div className={s.sheetHead}>
            <div>
              <h2 id="preview-title" className={s.dialogTitle}>
                이 마음을 하늘에 띄울까요?
              </h2>
              <p className={s.dialogHint}>띄운 뒤에는 고치거나 직접 지울 수 없어요.</p>
            </div>
            <button type="button" className={s.sheetClose} onClick={onClose} disabled={sending} aria-label="닫기">
              {closeIcon}
            </button>
          </div>

          <figure className={s.previewSky}>
            <div className={s.previewStage} aria-hidden="true">
              <div className={`${figureClass(sky)} ${s.previewFigure}`}>
                <SkyFigure sky={sky} text={normalized.replace(/\s+/g, " ")} />
              </div>
            </div>
            <figcaption>
              <span className={s.onlyDay}>하늘에서는 이렇게 보여요</span>
              <span className={s.onlyNight}>밤하늘에서는 이렇게 보여요</span>
            </figcaption>
          </figure>

          <p className={s.previewText}>{normalized}</p>

          <dl className={s.previewInfo}>
            <div>
              <dt>공개 범위</dt>
              <dd>HaruCloud를 방문한 누구나 익명으로 읽고 공감할 수 있어요.</dd>
            </div>
            <div>
              <dt>공개 기간</dt>
              <dd>지금부터 {THOUGHT_LIFETIME_HOURS}시간 동안. 이후 하늘에서 흩어지고 삭제돼요.</dd>
            </div>
          </dl>

          <div className={s.row}>
            <button type="button" className={s.sheetCancel} onClick={() => onStep("write")} disabled={sending}>
              조금 더 생각할게요
            </button>
            <button
              ref={confirmRef}
              type="button"
              className={`${s.send} ${s.sheetSend}`}
              onClick={onSubmit}
              disabled={!canSend}
              aria-busy={sending || undefined}
            >
              {sending ? "띄워 보내는 중…" : "하늘에 띄우기"}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
