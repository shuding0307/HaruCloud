"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicThought } from "@/types/thought";
import type { ListThoughtsResponse } from "@/types/api";
import { apiFetch, serverOffset } from "@/lib/client/api";
import { gridFor, layoutClouds } from "@/lib/sky/layout";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CloudShape } from "./CloudShape";
import { ThoughtCloud } from "./ThoughtCloud";

type Status = "loading" | "ready" | "error";

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      // 작은 변화(모바일 주소창 등)로 배치가 흔들리지 않도록 반올림
      setSize((prev) => {
        const next = { width: Math.round(width / 8) * 8, height: Math.round(height / 24) * 24 };
        return prev.width === next.width && prev.height === next.height ? prev : next;
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export function SkyField() {
  const [thoughts, setThoughts] = useState<PublicThought[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [page, setPage] = useState(0);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(0); // 첫 응답을 받은 시점에 채운다 (프리렌더 시 시각 고정 방지)
  const [ref, size] = useElementSize<HTMLDivElement>();

  const load = useCallback(async (cursor?: string) => {
    const qs = new URLSearchParams({ limit: "50" });
    if (cursor) qs.set("cursor", cursor);
    const { data } = await apiFetch<ListThoughtsResponse>(`/api/thoughts?${qs}`);
    setOffset(serverOffset(data.serverNow));
    setNow(Date.now());
    setNextCursor(data.nextCursor);
    setThoughts((prev) => {
      if (!cursor) return data.thoughts;
      const seen = new Set(prev.map((t) => t.id));
      return [...prev, ...data.thoughts.filter((t) => !seen.has(t.id))];
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    // 마운트 시 1회 하늘 데이터를 불러온다 (외부 시스템 동기화).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
      .then(() => !cancelled && setStatus("ready"))
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [load]);

  // 1분마다 서버 시각 기준으로 만료된 구름을 화면에서 내린다.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const alive = useMemo(
    () => thoughts.filter((t) => Date.parse(t.expiresAt) > now + offset),
    [thoughts, now, offset],
  );

  const capacity = size.width > 0 ? gridFor(size.width, size.height).capacity : 0;
  const pageCount = capacity > 0 ? Math.max(1, Math.ceil(alive.length / capacity)) : 1;
  const safePage = Math.min(page, pageCount - 1);
  const visible = useMemo(
    () => (capacity > 0 ? alive.slice(safePage * capacity, safePage * capacity + capacity) : []),
    [alive, capacity, safePage],
  );
  const slots = useMemo(
    () =>
      layoutClouds(
        visible.map((t) => ({ id: t.id, length: t.content.length })),
        size.width,
        size.height,
      ),
    [visible, size.width, size.height],
  );
  const byId = useMemo(() => new Map(visible.map((t) => [t.id, t])), [visible]);
  const hasMore = alive.length > capacity || nextCursor !== null;

  async function showOtherClouds() {
    const nextPage = safePage + 1;
    if (nextPage < pageCount) return setPage(nextPage);
    if (nextCursor) {
      try {
        await load(nextCursor);
        return setPage(nextPage);
      } catch {
        /* 더 불러오지 못하면 처음으로 */
      }
    }
    setPage(0);
  }

  async function retry() {
    setStatus("loading");
    try {
      await load();
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section aria-label="하늘에 떠 있는 고민들" className="relative flex flex-1 flex-col">
      <div ref={ref} className="relative mx-auto w-full max-w-6xl flex-1" aria-busy={status === "loading"}>
        {status === "loading" && <LoadingSky />}

        {status === "error" && (
          <CenterMessage title="하늘을 불러오지 못했어요" body="잠시 후 다시 시도해주세요.">
            <Button variant="secondary" onClick={retry}>
              다시 불러오기
            </Button>
          </CenterMessage>
        )}

        {status === "ready" && alive.length === 0 && (
          <CenterMessage title="아직 하늘이 맑게 비어 있어요" body="첫 번째 구름을 띄워볼까요? 누군가 읽고 마음을 보내줄 거예요.">
            <ButtonLink href="/write" variant="primary">
              첫 고민 띄우기
            </ButtonLink>
          </CenterMessage>
        )}

        {status === "ready" && (
          <ul className="contents">
            {slots.map((slot) => {
              const thought = byId.get(slot.id);
              return thought ? (
                <li key={slot.id} className="contents">
                  <ThoughtCloud thought={thought} slot={slot} />
                </li>
              ) : null;
            })}
          </ul>
        )}
      </div>

      {status === "ready" && hasMore && (
        <div className="relative z-10 flex justify-center pt-2">
          <Button variant="ghost" onClick={showOtherClouds} className="text-sm">
            다른 구름 보기 <span aria-hidden>↻</span>
          </Button>
        </div>
      )}
    </section>
  );
}

function CenterMessage({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
    >
      <div className="w-44 opacity-90">
        <CloudShape variant={1} />
      </div>
      <h2 className="mt-4 text-lg font-bold text-deep-sky">{title}</h2>
      <p className="mt-1 max-w-xs text-[15px] text-ink-soft">{body}</p>
      <div className="mt-5">{children}</div>
    </motion.div>
  );
}

function LoadingSky() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <p className="animate-pulse text-[15px] text-ink-soft">구름을 모으는 중이에요…</p>
    </div>
  );
}
