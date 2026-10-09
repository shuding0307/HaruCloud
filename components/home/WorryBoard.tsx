"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import type { PublicThought } from "@/types/thought";
import type { CreateThoughtResponse, ListThoughtsResponse } from "@/types/api";
import { apiFetch, ClientApiError, serverOffset } from "@/lib/client/api";
import { boardHeight, placeBySeq } from "@/lib/sky/worry-layout";
import { useToast } from "@/components/ui/Toast";
import { s } from "./classes";
import { SKY_COPY } from "./HomeHeader";
import { useSkyMode } from "./useSkyMode";
import { ComposerSheet, type SheetStep } from "./ComposerSheet";
import { ReleaseOverlay } from "./ReleaseOverlay";
import { figureClass, SkyFigure } from "./SkyFigure";

/** 한 번에 불러오는 고민 수 */
const PAGE_SIZE = 12;
const REFRESH_MS = 5 * 60_000;
/** 화면 위쪽 끝에서 이 거리 안으로 들어오면 이전 고민을 미리 불러온다 */
const PRELOAD_MARGIN = 400;

type Status = "loading" | "ready" | "error";

/** 고민 + 화면 자리를 정하는 고정 순번 (작을수록 오래된 고민) */
interface Entry {
  thought: PublicThought;
  seq: number;
}

/**
 * 메인 하늘: 처음에는 맨 아래(입력창 바로 위)의 최신 고민부터 보이고, 위로 스크롤하면 이전 고민을 이어서 불러온다.
 * 서버 저장이 성공한 새 고민만 아래에서 떠오른다.
 */
export function WorryBoard() {
  const sky = useSkyMode();
  const toast = useToast();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState(false);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStep, setSheetStep] = useState<SheetStep>("write");
  // 서버 저장에 성공해 띄워 보내기 연출 중인 고민
  const [released, setReleased] = useState<PublicThought | null>(null);
  const releasedRef = useRef<PublicThought | null>(null);
  const sendingRef = useRef(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingOlderRef = useRef(false);
  // 이전 고민을 위에 붙이기 직전의 문서 높이·스크롤 — 붙인 뒤 보던 고민이 제자리에 보이도록 보정한다
  const anchorRef = useRef<{ height: number; y: number } | null>(null);
  const initialScrollDone = useRef(false);
  // 내가 띄운 고민이 추가되면 맨 아래로 내려가 떠오르는 모습을 보여준다
  const revealNewestRef = useRef(false);

  /** 처음 불러오기: 최신 PAGE_SIZE 개 (API 는 최신순 → 오래된 것이 위로 가도록 순번을 매긴다) */
  const loadInitial = useCallback(async () => {
    try {
      const { data } = await apiFetch<ListThoughtsResponse>(`/api/thoughts?limit=${PAGE_SIZE}`);
      const n = data.thoughts.length;
      // entries 는 항상 순번 오름차순(오래된 → 최신)으로 유지한다
      setEntries(data.thoughts.map((thought, i) => ({ thought, seq: n - 1 - i })).reverse());
      setOlderCursor(data.nextCursor);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  /** 위로 스크롤: 지금 가장 오래된 고민보다 이전 고민을 불러와 위에 붙인다 */
  const loadOlder = useCallback(async () => {
    if (!olderCursor || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    setOlderError(false);
    try {
      const { data } = await apiFetch<ListThoughtsResponse>(
        `/api/thoughts?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(olderCursor)}`,
      );
      anchorRef.current = { height: document.documentElement.scrollHeight, y: window.scrollY };
      setEntries((prev) => {
        const seen = new Set(prev.map((e) => e.thought.id));
        const minSeq = prev.length ? prev[0]!.seq : 0;
        const older = data.thoughts
          .filter((t) => !seen.has(t.id))
          .map((thought, i) => ({ thought, seq: minSeq - 1 - i }))
          .reverse();
        return [...older, ...prev];
      });
      setOlderCursor(data.nextCursor);
    } catch {
      setOlderError(true);
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [olderCursor]);

  /** 주기적 새로 고침: 다른 사람이 새로 띄운 고민은 아래에 붙이고, 만료된 고민은 내린다 */
  const refresh = useCallback(async () => {
    try {
      const { data } = await apiFetch<ListThoughtsResponse>(`/api/thoughts?limit=${PAGE_SIZE}`);
      const now = Date.now() + serverOffset(data.serverNow);
      setEntries((prev) => {
        const alive = prev.filter((e) => Date.parse(e.thought.expiresAt) > now);
        const seen = new Set(alive.map((e) => e.thought.id));
        const newest = alive.length ? Date.parse(alive[alive.length - 1]!.thought.createdAt) : 0;
        let maxSeq = alive.length ? alive[alive.length - 1]!.seq : -1;
        const fresh = data.thoughts
          .filter((t) => !seen.has(t.id) && Date.parse(t.createdAt) > newest)
          .reverse()
          .map((thought) => ({ thought, seq: ++maxSeq }));
        return fresh.length || alive.length !== prev.length ? [...alive, ...fresh] : prev;
      });
    } catch {
      /* 다음 주기에 다시 시도 */
    }
  }, []);

  useEffect(() => {
    // 마운트 시 불러오고, 주기적으로 새로 고친다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInitial();
    const id = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [loadInitial, refresh]);

  // 렌더 직후(페인트 전) 스크롤 위치 조정
  useLayoutEffect(() => {
    if (anchorRef.current) {
      // 위에 이전 고민이 붙은 만큼 내려서 보던 고민이 제자리에 있게 한다
      const { height, y } = anchorRef.current;
      anchorRef.current = null;
      window.scrollTo(0, y + (document.documentElement.scrollHeight - height));
    } else if (revealNewestRef.current) {
      revealNewestRef.current = false;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: reduce ? "auto" : "smooth" });
    } else if (!initialScrollDone.current && entries.length > 0) {
      // 처음에는 맨 아래의 최신 고민부터 보여준다
      initialScrollDone.current = true;
      window.scrollTo(0, document.documentElement.scrollHeight);
    }
  }, [entries]);

  // 목록 위 감시 지점이 화면 가까이 오면 이전 고민을 불러온다.
  // (고민 수가 바뀔 때마다 다시 관찰해서, 불러온 뒤에도 화면이 비어 있으면 이어서 불러온다)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || status !== "ready" || !olderCursor || olderError) return;
    const io = new IntersectionObserver(
      (records) => {
        if (records.some((r) => r.isIntersecting) && initialScrollDone.current) void loadOlder();
      },
      { rootMargin: `${PRELOAD_MARGIN}px 0px 0px 0px` },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [status, olderCursor, olderError, loadOlder, entries.length]);

  async function send() {
    const content = text.trim();
    if (!content || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const { data } = await apiFetch<CreateThoughtResponse>("/api/thoughts", {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      // 연출이 끝난 뒤 하늘에 추가된다 (finishRelease)
      setText("");
      closeSheet();
      releasedRef.current = data.thought;
      setReleased(data.thought);
    } catch (err) {
      // 실패하면 입력한 글을 그대로 두고 알려준다
      toast(err instanceof ClientApiError ? err.message : "고민을 띄우지 못했어요. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function openSheet(step: SheetStep) {
    setSheetStep(step);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setSheetStep("write");
  }

  const finishRelease = useCallback(() => {
    const thought = releasedRef.current;
    if (!thought) return;
    releasedRef.current = null;
    setReleased(null);
    setEntries((prev) => {
      if (prev.some((e) => e.thought.id === thought.id)) return prev;
      const maxSeq = prev.length ? prev[prev.length - 1]!.seq : -1;
      return [...prev, { thought, seq: maxSeq + 1 }];
    });
    revealNewestRef.current = true;
    setEnteringId(thought.id);
    setStatus("ready");
  }, []);

  // 오래된 고민이 위, 최신 고민이 아래 (순번 오름차순)
  const minSeq = entries[0]?.seq ?? 0;
  const maxSeq = entries[entries.length - 1]?.seq ?? 0;
  const minHeight = entries.length ? boardHeight(minSeq, maxSeq) : undefined;

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" />
      {status === "ready" && entries.length > 0 && (olderCursor || loadingOlder || olderError) && (
        <p className={s.older} role={olderError ? "alert" : "status"}>
          {olderError ? (
            <>
              이전 고민을 불러오지 못했어요.
              <button type="button" className={s.retry} onClick={() => void loadOlder()}>
                다시 불러오기
              </button>
            </>
          ) : loadingOlder ? (
            "이전 고민을 불러오는 중이에요…"
          ) : (
            "위로 올리면 이전 고민이 보여요"
          )}
        </p>
      )}

      <section className={s.worries} aria-label="떠 있는 고민 (아래쪽이 최신)" style={{ minHeight }}>
        {status === "ready" && entries.length === 0 && (
          <p className={s.notice}>아직 하늘이 비어 있어요. 첫 번째 고민을 띄워보세요.</p>
        )}
        {status === "error" && (
          <p className={s.notice} role="alert">
            하늘을 불러오지 못했어요.
            <button type="button" className={s.retry} onClick={() => void loadInitial()}>
              다시 불러오기
            </button>
          </p>
        )}
        {entries.map(({ thought: t, seq }) => {
          const pos = placeBySeq(seq, minSeq);
          const entering = t.id === enteringId;
          const preview = t.content.replace(/\s+/g, " ");
          const style = {
            left: `${pos.x}%`,
            top: `${pos.y}px`,
            ...(entering ? {} : { animationDelay: `${-(((seq % 6) + 6) % 6) * 1.5}s` }),
          };
          return (
            <Link
              key={t.id}
              href={`/thoughts/${t.id}`}
              prefetch={false}
              className={`${figureClass(sky)} ${entering ? s.enter : ""}`}
              style={style}
              aria-label={`고민: ${preview}`}
            >
              <SkyFigure sky={sky} text={preview} />
            </Link>
          );
        })}
      </section>


      <div className={s.dock}>
        <form
          className={`${s.composer} ${s.glass}`}
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            // 쓴 글이 있으면 미리보기로, 비어 있으면 작성 시트로
            openSheet(text.trim() ? "preview" : "write");
          }}
        >
          <label htmlFor="worry">
            <span className={s.onlyDay}>{SKY_COPY.day.label}</span>
            <span className={s.onlyNight}>{SKY_COPY.night.label}</span>
          </label>
          <div className={s.row}>
            <button
              id="worry"
              type="button"
              className={s.trigger}
              onClick={() => openSheet("write")}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              aria-describedby="worry-hint"
            >
              <span className={text.trim() ? undefined : s.triggerEmpty}>
                {text.trim() ? text.replace(/\s+/g, " ") : "어떤 고민을 띄워볼까요?"}
              </span>
            </button>
            <button type="submit" className={s.send} disabled={sending} aria-busy={sending || undefined}>
              띄우기
            </button>
          </div>
          <p id="worry-hint" className="sr-only">
            누르면 고민을 쓸 수 있는 큰 입력창이 열려요. 이름 없이 익명으로 공개되고, 24시간이 지나면 사라져요.
          </p>
        </form>

        <nav className={s.links} aria-label="더 보기">
          <Link href="/about">이용 안내 · 신고 정책</Link>
        </nav>
      </div>

      <ComposerSheet
        open={sheetOpen}
        step={sheetStep}
        text={text}
        sending={sending}
        onChange={setText}
        onStep={setSheetStep}
        onSubmit={() => void send()}
        onClose={closeSheet}
      />

      {released && <ReleaseOverlay text={released.content.replace(/\s+/g, " ")} onDone={finishRelease} />}

    </>
  );
}
