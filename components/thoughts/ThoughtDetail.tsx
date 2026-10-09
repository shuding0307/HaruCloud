"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { REACTION_LABELS, REACTION_TYPES } from "@/types/thought";
import type { GetThoughtResponse } from "@/types/api";
import { apiFetch, ClientApiError, serverOffset } from "@/lib/client/api";
import { formatElapsed, formatRemaining } from "@/lib/time";
import { s } from "@/components/home/classes";
import { SkyMark } from "@/components/home/SkyMark";
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
      <div className={`${s.glass} ${s.card}`} aria-busy="true">
        <div className={s.skel} style={{ width: "40%" }} />
        <div className={s.skel} style={{ marginTop: 28 }} />
        <div className={s.skel} />
        <div className={s.skel} style={{ width: "65%" }} />
        <span className="sr-only">고민을 불러오는 중이에요</span>
      </div>
    );
  }

  if (state.kind === "gone") {
    return (
      <div className={s.gone}>
        <SkyMark />
        <h1 className={s.goneTitle}>
          {state.reason === "EXPIRED" ? "이 고민은 하늘에서 흩어졌어요" : "찾을 수 없는 고민이에요"}
        </h1>
        <p className={s.sub}>
          {state.reason === "EXPIRED"
            ? "띄워진 지 24시간이 지나 더 이상 볼 수 없어요. 마음이 조금은 가벼워졌기를 바라요."
            : "삭제되었거나 검토 중인 글, 또는 잘못된 주소일 수 있어요."}
        </p>
        <Link href="/" className={s.pill}>
          하늘로 돌아가기
        </Link>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className={s.gone}>
        <p role="alert" className={s.sub}>
          {state.message}
        </p>
        <button type="button" className={s.pill} onClick={() => void load()}>
          다시 불러오기
        </button>
      </div>
    );
  }

  const { thought, viewer } = state.data;
  const elapsed = serverNow - Date.parse(thought.createdAt);
  const remaining = Date.parse(thought.expiresAt) - serverNow;

  return (
    <article className={s.detail} aria-labelledby="thought-heading">
      <div className={`${s.glass} ${s.card}`}>
        <div className={s.cardHead}>
          <div>
            <h1 id="thought-heading" className={s.cardLabel}>
              익명으로 띄워진 고민
            </h1>
            <p className={s.cardMeta}>
              <time dateTime={thought.createdAt}>{formatElapsed(elapsed)}</time> 띄워졌어요 ·{" "}
              {formatRemaining(remaining)} 흩어져요
            </p>
          </div>
          <MoreMenu onReport={() => setReportOpen(true)} />
        </div>

        <p className={s.cardBody}>{thought.content}</p>

        {viewer.isAuthor && viewer.receivedReactions && (
          <div className={s.author}>
            <p className={s.authorTitle}>내가 띄운 고민이에요</p>
            <p>
              받은 마음:{" "}
              {REACTION_TYPES.map((t) => `${REACTION_LABELS[t]} ${viewer.receivedReactions![t]}`).join(" · ")}
            </p>
            <p className={s.authorHint}>이 숫자는 이 기기에서 글을 쓴 나에게만 보여요.</p>
          </div>
        )}
      </div>

      {!viewer.isAuthor && (
        <section aria-label="공감">
          <p className={s.prompt}>이 마음에 조용히 공감을 보내볼까요?</p>
          <ReactionButtons
            thoughtId={thought.id}
            initial={viewer.reactions}
            onGone={(reason) => setState({ kind: "gone", reason })}
          />
        </section>
      )}

      <p className={s.footNote}>
        HaruCloud의 모든 글은 익명이에요. 작성자의 프로필을 보거나 개인 메시지를 보낼 수 없어요.
      </p>

      <ReportDialog thoughtId={thought.id} open={reportOpen} onClose={() => setReportOpen(false)} />
    </article>
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
    <div ref={ref} className={s.menuWrap}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="더보기 메뉴"
        onClick={() => setOpen((v) => !v)}
        className={s.iconBtn}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      {open && (
        <div role="menu" className={s.menu}>
          <button
            type="button"
            role="menuitem"
            autoFocus
            onClick={() => {
              setOpen(false);
              onReport();
            }}
            className={s.menuItem}
          >
            신고하기
          </button>
        </div>
      )}
    </div>
  );
}
