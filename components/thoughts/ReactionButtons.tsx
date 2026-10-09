"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { REACTION_LABELS, REACTION_TYPES, type ReactionType } from "@/types/thought";
import type { CreateReactionResponse } from "@/types/api";
import { apiFetch, ClientApiError } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";

const ICONS: Record<ReactionType, string> = { been_there: "🤝", lighter: "🎈" };

interface Props {
  thoughtId: string;
  initial: ReactionType[];
  onGone: (code: "EXPIRED" | "NOT_FOUND") => void;
}

export function ReactionButtons({ thoughtId, initial, onGone }: Props) {
  const toast = useToast();
  const [sent, setSent] = useState<Set<ReactionType>>(() => new Set(initial));
  const [pending, setPending] = useState<ReactionType | null>(null);
  const [burst, setBurst] = useState<{ type: ReactionType; key: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);
  const burstCount = useRef(0);

  async function react(type: ReactionType) {
    if (inFlight.current || sent.has(type)) return;
    inFlight.current = true;
    setPending(type);
    try {
      const { data } = await apiFetch<CreateReactionResponse>(`/api/thoughts/${thoughtId}/reactions`, {
        method: "POST",
        body: JSON.stringify({ type }),
      });
      // 서버가 확인한 뒤에만 완료 상태로 바꾼다. (애니메이션과 무관하게 결과는 즉시 확정)
      setSent((prev) => new Set(prev).add(data.type));
      setMessage(data.alreadyReacted ? "이미 마음을 보냈어요." : "따뜻한 마음이 전해졌어요.");
      if (!data.alreadyReacted) setBurst({ type, key: ++burstCount.current });
    } catch (err) {
      if (err instanceof ClientApiError && (err.code === "EXPIRED" || err.code === "NOT_FOUND" || err.code === "UNAVAILABLE")) {
        onGone(err.code === "EXPIRED" ? "EXPIRED" : "NOT_FOUND");
      } else {
        toast(err instanceof ClientApiError ? err.message : "공감을 보내지 못했어요. 다시 시도해주세요.", "error");
      }
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  return (
    <div>
      <div role="group" aria-label="공감 보내기" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {REACTION_TYPES.map((type) => (
          <ReactionButton
            key={type}
            type={type}
            done={sent.has(type)}
            loading={pending === type}
            disabled={pending !== null}
            burstKey={burst?.type === type ? burst.key : null}
            onClick={() => react(type)}
          />
        ))}
      </div>
      <p aria-live="polite" className="mt-3 min-h-6 text-center text-sm text-ink-soft">
        {message}
      </p>
    </div>
  );
}

function ReactionButton({
  type,
  done,
  loading,
  disabled,
  burstKey,
  onClick,
}: {
  type: ReactionType;
  done: boolean;
  loading: boolean;
  disabled: boolean;
  burstKey: number | null;
  onClick: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled && !done}
      aria-pressed={done}
      aria-busy={loading || undefined}
      whileTap={reduce || done ? undefined : { scale: 0.96 }}
      className={
        "relative flex min-h-14 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold " +
        "transition-colors duration-200 disabled:cursor-not-allowed " +
        (done
          ? "bg-lavender text-deep-sky ring-2 ring-[#c9bdea]"
          : "bg-white text-deep-sky shadow-soft hover:bg-sky disabled:opacity-60")
      }
    >
      <span aria-hidden>{ICONS[type]}</span>
      <span>{REACTION_LABELS[type]}</span>
      {done && <span className="sr-only">(보냄)</span>}
      {done && (
        <span aria-hidden className="text-xs font-medium text-ink-soft">
          ✓
        </span>
      )}
      <AnimatePresence>{burstKey !== null && <Sparkles key={burstKey} reduce={!!reduce} />}</AnimatePresence>
    </motion.button>
  );
}

/** 공감 성공 시 잠시 퍼지는 작은 별빛 */
function Sparkles({ reduce }: { reduce: boolean }) {
  if (reduce) {
    return (
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-[var(--color-glow)]"
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      />
    );
  }
  const stars = Array.from({ length: 7 }, (_, i) => {
    const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(angle) * 46, y: Math.sin(angle) * 30, delay: i * 0.02 };
  });
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {stars.map((s, i) => (
        <motion.span
          key={i}
          className="absolute text-[13px] text-[#f2c66d]"
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0], x: s.x, y: s.y, scale: [0.4, 1, 0.6] }}
          transition={{ duration: 0.8, delay: s.delay, ease: "easeOut" }}
        >
          ✦
        </motion.span>
      ))}
    </span>
  );
}
