"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { REACTION_LABELS, REACTION_TYPES } from "@/types/thought";
import type { GetThoughtResponse } from "@/types/api";
import { apiFetch, ClientApiError, serverOffset } from "@/lib/client/api";
import { formatElapsed, formatRemaining } from "@/lib/time";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CloudShape } from "@/components/sky/CloudShape";
import { ReactionButtons } from "./ReactionButtons";
import { ReportDialog } from "./ReportDialog";

type State =
  | { kind: "loading" }
  | { kind: "ready"; data: GetThoughtResponse; offset: number }
  | { kind: "gone"; reason: "EXPIRED" | "NOT_FOUND" }
  | { kind: "error"; message: string };

export function ThoughtDetail({ id }: { id: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [now, setNow] = useState(0); // 응답을 받은 시점에 채운다 (프리렌더 시 시각 고정 방지)
  const [reportOpen, setReportOpen] = useState(false);
  const reduce = useReducedMotion();

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const { data } = await apiFetch<GetThoughtResponse>(`/api/thoughts/${id}`);
      setNow(Date.now());
      setState({ kind: "ready", data, offset: serverOffset(data.serverNow) });
    } catch (err) {
      if (err instanceof ClientApiError && err.code === "EXPIRED") setState({ kind: "gone", reason: "EXPIRED" });
      else if (err instanceof ClientApiError && (err.code === "NOT_FOUND" || err.code === "UNAVAILABLE"))
        setState({ kind: "gone", reason: "NOT_FOUND" });
      else setState({ kind: "error", message: err instanceof ClientApiError ? err.message : "고민을 불러오지 못했어요." });
    }
  }, [id]);

  useEffect(() => {
    // 마운트 시 1회 데이터를 불러온다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  // 읽는 도중 만료되면 본문과 공감 기능을 거둔다.
  const expiresAt = state.kind === "ready" ? Date.parse(state.data.thought.expiresAt) : null;
  const serverNow = state.kind === "ready" ? now + state.offset : now;
  const expiredWhileReading = expiresAt !== null && expiresAt <= serverNow;
  const lastGone = useRef(false);
  useEffect(() => {
    if (expiredWhileReading && !lastGone.current) {
      lastGone.current = true;
      setState({ kind: "gone", reason: "EXPIRED" });
    }
  }, [expiredWhileReading]);

  if (state.kind === "loading") {
    return (
      <Card aria-busy className="mt-4 animate-pulse">
        <div className="h-4 w-32 rounded bg-sky" />
        <div className="mt-6 space-y-3">
          <div className="h-4 rounded bg-sky" />
          <div className="h-4 rounded bg-sky" />
          <div className="h-4 w-2/3 rounded bg-sky" />
        </div>
        <span className="sr-only">고민을 불러오는 중이에요</span>
      </Card>
    );
  }

  if (state.kind === "gone") {
    return (
      <div className="mt-10 flex flex-col items-center text-center">
        <div className="w-40 opacity-70">
          <CloudShape variant={1} />
        </div>
        <h1 className="mt-5 text-xl font-bold text-deep-sky">
          {state.reason === "EXPIRED" ? "이 구름은 하늘에서 사라졌어요" : "찾을 수 없는 구름이에요"}
        </h1>
        <p className="mt-2 max-w-xs text-[15px] text-ink-soft">
          {state.reason === "EXPIRED"
            ? "공개된 지 24시간이 지나 더 이상 볼 수 없어요. 마음이 조금은 가벼워졌기를 바라요."
            : "삭제되었거나 검토 중인 글, 또는 잘못된 주소일 수 있어요."}
        </p>
        <ButtonLink href="/" variant="secondary" className="mt-6">
          하늘로 돌아가기
        </ButtonLink>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="mt-10 flex flex-col items-center text-center">
        <p role="alert" className="text-[15px] text-ink">{state.message}</p>
        <Button variant="secondary" className="mt-4" onClick={load}>
          다시 불러오기
        </Button>
      </div>
    );
  }

  const { thought, viewer } = state.data;
  const elapsed = serverNow - Date.parse(thought.createdAt);
  const remaining = Date.parse(thought.expiresAt) - serverNow;

  return (
    <motion.article
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mt-4"
      aria-labelledby="thought-heading"
    >
      <Card className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 id="thought-heading" className="text-sm font-semibold text-ink-soft">
              익명으로 띄워진 고민
            </h1>
            <p className="mt-0.5 text-[13px] text-ink-soft">
              <time dateTime={thought.createdAt}>{formatElapsed(elapsed)}</time> 띄워졌어요 ·{" "}
              {formatRemaining(remaining)} 사라져요
            </p>
          </div>
          <MoreMenu onReport={() => setReportOpen(true)} />
        </div>

        <p className="mt-6 whitespace-pre-wrap text-[17px] leading-8 text-ink">{thought.content}</p>

        {viewer.isAuthor && viewer.receivedReactions && (
          <div className="mt-6 rounded-[var(--radius-md)] bg-sky/70 px-4 py-3 text-sm">
            <p className="font-semibold text-deep-sky">내가 띄운 구름이에요</p>
            <p className="mt-1 text-ink-soft">
              받은 마음:{" "}
              {REACTION_TYPES.map((t) => `${REACTION_LABELS[t]} ${viewer.receivedReactions![t]}`).join(" · ")}
            </p>
            <p className="mt-1 text-xs text-ink-soft">이 숫자는 이 기기에서 글을 쓴 나에게만 보여요.</p>
          </div>
        )}
      </Card>

      {!viewer.isAuthor && (
        <section className="mt-6" aria-label="공감">
          <p className="mb-3 text-center text-[15px] text-ink">이 마음에 조용히 공감을 보내볼까요?</p>
          <ReactionButtons
            thoughtId={thought.id}
            initial={viewer.reactions}
            onGone={(reason) => setState({ kind: "gone", reason })}
          />
        </section>
      )}

      <p className="mt-6 text-center text-[13px] leading-5 text-ink-soft">
        HaruCloud의 모든 글은 익명이에요. 작성자의 프로필을 보거나 개인 메시지를 보낼 수 없어요.
      </p>

      <ReportDialog thoughtId={thought.id} open={reportOpen} onClose={() => setReportOpen(false)} />
    </motion.article>
  );
}

function MoreMenu({ onReport }: { onReport: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative -mt-2 -mr-2">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="더보기 메뉴"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-ink-soft hover:bg-sky"
      >
        ⋯
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-[var(--radius-sm)] bg-white shadow-float ring-1 ring-cloud-blue/30">
          <button
            type="button"
            role="menuitem"
            autoFocus
            onClick={() => {
              setOpen(false);
              onReport();
            }}
            className="flex min-h-11 w-full items-center px-4 text-left text-[15px] text-danger hover:bg-sky/60"
          >
            신고하기
          </button>
        </div>
      )}
    </div>
  );
}
