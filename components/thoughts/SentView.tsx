"use client";

import { motion, useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";
import { sentStore } from "@/lib/client/storage";
import { CloudShape } from "@/components/sky/CloudShape";
import { ButtonLink } from "@/components/ui/Button";

const noopSubscribe = () => () => {};

/** 게시 완료 화면. 서버 저장 성공 후 WriteForm 이 남긴 표시가 있을 때만 완료 문구를 보여준다. */
export function SentView() {
  const reduce = useReducedMotion();
  // 서버 렌더 시에는 undefined, 브라우저에서는 sessionStorage 값
  const sentId = useSyncExternalStore(
    noopSubscribe,
    () => {
      const id = sentStore.read();
      return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
    },
    () => undefined,
  );

  if (sentId === undefined) return <div className="flex-1" aria-busy />;

  if (!sentId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-[15px] text-ink-soft">띄워 보낸 구름 정보가 없어요.</p>
        <ButtonLink href="/" variant="secondary" className="mt-4">
          하늘로 돌아가기
        </ButtonLink>
      </div>
    );
  }

  const rise = reduce ? 0 : 1.6;

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="relative h-56 w-full overflow-visible" aria-hidden>
        <motion.div
          className="absolute left-1/2 w-44 -translate-x-1/2"
          initial={reduce ? { opacity: 1, top: "20%" } : { opacity: 0, top: "100%", scale: 0.9 }}
          animate={
            reduce
              ? { opacity: 1 }
              : { opacity: [0, 1, 1, 0.9], top: ["100%", "55%", "20%", "8%"], scale: [0.9, 1, 1, 0.92] }
          }
          transition={{ duration: rise, ease: [0.22, 1, 0.36, 1], times: [0, 0.3, 0.75, 1] }}
        >
          <CloudShape variant={2} />
          {!reduce &&
            [0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full bg-[var(--color-glow)] shadow-[0_0_10px_4px_rgba(255,240,200,0.9)]"
                style={{ left: `${20 + i * 20}%`, bottom: "-6px" }}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], y: [0, 40 + i * 8] }}
                transition={{ duration: 1.2, delay: 0.3 + i * 0.12 }}
              />
            ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.2 : 0.6, delay: reduce ? 0 : rise - 0.2 }}
        className="mt-2"
      >
        <h1 className="text-[28px] font-bold text-deep-sky sm:text-[32px]">잘 띄워 보냈어요.</h1>
        <p className="mt-3 text-base leading-7 text-ink">당신의 마음이 이제 하늘에 떠 있어요.</p>
        <p className="mt-1 text-[15px] leading-6 text-ink-soft">
          앞으로 24시간 동안 다른 누군가가 읽고 공감할 수 있어요.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <ButtonLink href="/" size="lg">
            하늘로 돌아가기
          </ButtonLink>
          <ButtonLink href={`/thoughts/${sentId}`} variant="secondary" size="lg">
            내 구름 다시 보기
          </ButtonLink>
        </div>
      </motion.div>
    </div>
  );
}
