"use client";

import { useEffect, useRef, useState } from "react";
import { REPORT_REASONS, REPORT_REASON_LABELS, type ReportReason } from "@/types/thought";
import type { CreateReportResponse } from "@/types/api";
import { apiFetch, ClientApiError } from "@/lib/client/api";
import { s } from "@/components/home/classes";

interface Props {
  thoughtId: string;
  open: boolean;
  onClose: () => void;
}

type Phase = { kind: "form" } | { kind: "done"; status: CreateReportResponse["status"]; reason: ReportReason };

/** 신고 시트 — 메인의 작성 시트와 같은 낮/밤 유리 스타일 */
export function ReportDialog({ thoughtId, open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "form" });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    if (submitting) return;
    onClose();
    // 닫힌 뒤 초기화
    window.setTimeout(() => {
      setPhase({ kind: "form" });
      setReason(null);
      setError(null);
    }, 200);
  }

  async function submit() {
    if (!reason || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await apiFetch<CreateReportResponse>(`/api/thoughts/${thoughtId}/reports`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setPhase({ kind: "done", status: data.status, reason });
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "신고를 보내지 못했어요. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className={s.sheet}
      aria-labelledby="report-title"
      onClose={() => open && close()}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      {open && (
        <div className={`${s.glass} ${s.dialogPanel}`}>
          {phase.kind === "done" ? (
            <>
              <h2 id="report-title" className={s.dialogTitle}>
                {phase.status === "received" ? "신고가 접수되었어요" : "이미 신고한 글이에요"}
              </h2>
              <p className={s.dialogText}>
                신고 내용은 기록되었어요. 여러 사람의 신고가 쌓인 글은 하늘에서 잠시 내려가 검토를 기다려요.
              </p>
              <p className={s.dialogHint}>
                현재 운영자 검토 결과를 따로 안내해 드리는 기능은 없어요. 신고만으로 즉시 삭제되지는 않을 수 있어요.
              </p>
              {phase.reason === "safety" && <Safety />}
              <div className={s.row}>
                <button type="button" className={`${s.send} ${s.sheetSend}`} onClick={close}>
                  확인
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={s.sheetHead}>
                <h2 id="report-title" className={s.dialogTitle}>
                  이 글을 신고할까요?
                </h2>
                <button type="button" className={s.sheetClose} onClick={close} aria-label="닫기">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <p className={s.dialogHint}>신고자는 누구에게도 공개되지 않아요.</p>
              <fieldset className={s.options}>
                <legend className="sr-only">신고 사유</legend>
                {REPORT_REASONS.map((r) => (
                  <label key={r} className={s.option}>
                    <input
                      type="radio"
                      name="report-reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                    />
                    {REPORT_REASON_LABELS[r]}
                  </label>
                ))}
              </fieldset>
              {reason === "safety" && <Safety />}
              {error && (
                <p role="alert" className={s.sheetOver}>
                  {error}
                </p>
              )}
              <div className={s.row}>
                <button type="button" className={s.sheetCancel} onClick={close} disabled={submitting}>
                  취소
                </button>
                <button
                  type="button"
                  className={s.danger}
                  onClick={submit}
                  disabled={!reason || submitting}
                  aria-busy={submitting || undefined}
                >
                  {submitting ? "보내는 중…" : "신고하기"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}

function Safety() {
  return (
    <p className={s.safety}>
      지금 누군가 위험한 상황이라면 <strong>112</strong>·<strong>119</strong>에 바로 연락해주세요. 마음이 힘들 때는
      자살예방상담전화 <strong>109</strong>에서 24시간 이야기를 들어줘요.
    </p>
  );
}

/** 이용 안내 페이지(WebGL 하늘)에서 쓰는 기존 스타일의 안전 안내 */
export function SafetyNotice() {
  return (
    <p className="rounded-[var(--radius-sm)] bg-peach/70 px-4 py-3 text-sm leading-6">
      지금 누군가 위험한 상황이라면 <strong>112</strong>·<strong>119</strong>에 바로 연락해주세요. 마음이 힘들 때는
      자살예방상담전화 <strong>109</strong>에서 24시간 이야기를 들어줘요.
    </p>
  );
}
