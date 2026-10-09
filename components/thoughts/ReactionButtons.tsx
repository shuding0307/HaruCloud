"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { REACTION_LABELS, REACTION_TYPES, type ReactionType } from "@/types/thought";
import type { CreateReactionResponse } from "@/types/api";
import { apiFetch, ClientApiError } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { s } from "@/components/home/classes";
import { useSkyMode } from "@/components/home/useSkyMode";
import { ReactionIcon } from "./ReactionIcons";

/** 누른 뒤 바뀌는 버튼 문구 */
const SENT_LABELS: Record<ReactionType, string> = { been_there: "나도 그랬어요", lighter: "마음 보냈어요" };

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
  // 아이콘이 -sent 버전으로 바뀔 때 한 번 톡 커지는 효과
  const [pop, setPop] = useState<{ type: ReactionType; key: number } | null>(null);
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
      const key = ++burstCount.current;
      setPop({ type, key });
      if (!data.alreadyReacted) setBurst({ type, key });
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
      <div role="group" aria-label="공감 보내기" className={s.reactGrid}>
        {REACTION_TYPES.map((type) => (
          <ReactionButton
            key={type}
            type={type}
            done={sent.has(type)}
            loading={pending === type}
            disabled={pending !== null}
            burstKey={burst?.type === type ? burst.key : null}
            popKey={pop?.type === type ? pop.key : null}
            onClick={() => react(type)}
          />
        ))}
      </div>
      <p aria-live="polite" className={s.reactMsg}>
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
  popKey,
  onClick,
}: {
  type: ReactionType;
  done: boolean;
  loading: boolean;
  disabled: boolean;
  burstKey: number | null;
  popKey: number | null;
  onClick: () => void;
}) {
  const reduce = useReducedMotion();
  const sky = useSkyMode();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled && !done}
      aria-pressed={done}
      aria-busy={loading || undefined}
      whileTap={reduce || done ? undefined : { scale: 0.96 }}
      className={s.react}
    >
      <span key={popKey ?? "idle"} className={`${s.reactIcon} ${popKey !== null ? s.reactPop : ""}`}>
        <ReactionIcon type={type} sky={sky} sent={done} />
      </span>
      <span>{done ? SENT_LABELS[type] : REACTION_LABELS[type]}</span>
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
