"use client";

import { useState } from "react";
import { REPORT_REASONS, REPORT_REASON_LABELS, type ReportReason } from "@/types/thought";
import type { CreateReportResponse } from "@/types/api";
import { apiFetch, ClientApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface Props {
  thoughtId: string;
  open: boolean;
  onClose: () => void;
}

type Phase = { kind: "form" } | { kind: "done"; status: CreateReportResponse["status"]; reason: ReportReason };

export function ReportDialog({ thoughtId, open, onClose }: Props) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "form" });

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

  if (phase.kind === "done") {
    return (
      <Modal open={open} onClose={close} title={phase.status === "received" ? "신고가 접수되었어요" : "이미 신고한 글이에요"}>
        <div className="space-y-3 text-[15px] leading-7">
          <p>
            신고 내용은 기록되었어요. 여러 사람의 신고가 쌓인 글은 하늘에서 잠시 내려가 검토를 기다려요.
          </p>
          <p className="text-sm text-ink-soft">
            현재 운영자 검토 결과를 따로 안내해 드리는 기능은 없어요. 신고만으로 즉시 삭제되지는 않을 수 있어요.
          </p>
          {phase.reason === "safety" && <SafetyNotice />}
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={close}>확인</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={close} title="이 글을 신고할까요?" description="신고자는 누구에게도 공개되지 않아요.">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">신고 사유</legend>
        <div className="space-y-2">
          {REPORT_REASONS.map((r) => (
            <label
              key={r}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] px-4 py-2 text-[15px] ring-1 transition-colors ${
                reason === r ? "bg-sky ring-deep-sky/40" : "bg-white ring-cloud-blue/40 hover:bg-sky/50"
              }`}
            >
              <input
                type="radio"
                name="report-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="h-4 w-4 accent-[var(--color-deep-sky)]"
              />
              {REPORT_REASON_LABELS[r]}
            </label>
          ))}
        </div>
      </fieldset>
      {reason === "safety" && <div className="mt-4"><SafetyNotice /></div>}
      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={close} disabled={submitting}>
          취소
        </Button>
        <Button variant="danger" onClick={submit} disabled={!reason || submitting} aria-busy={submitting}>
          {submitting ? "보내는 중…" : "신고하기"}
        </Button>
      </div>
    </Modal>
  );
}

export function SafetyNotice() {
  return (
    <p className="rounded-[var(--radius-sm)] bg-peach/70 px-4 py-3 text-sm leading-6">
      지금 누군가 위험한 상황이라면 <strong>112</strong>·<strong>119</strong>에 바로 연락해주세요. 마음이 힘들 때는
      자살예방상담전화 <strong>109</strong>에서 24시간 이야기를 들어줘요.
    </p>
  );
}
