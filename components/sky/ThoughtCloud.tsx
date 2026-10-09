"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useState, type MouseEvent } from "react";
import type { PublicThought } from "@/types/thought";
import type { CloudSlot } from "@/lib/sky/layout";
import { CloudShape } from "./CloudShape";

interface ThoughtCloudProps {
  thought: PublicThought;
  slot: CloudSlot;
}

export function ThoughtCloud({ thought, slot }: ThoughtCloudProps) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [selected, setSelected] = useState(false);
  const href = `/thoughts/${thought.id}`;
  const preview = thought.content.replace(/\s+/g, " ");

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (reduce || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    setSelected(true);
    // 살짝 커진 뒤 상세 화면으로 이동 (약 200ms)
    window.setTimeout(() => router.push(href), 200);
  }

  return (
    <motion.div
      className="absolute"
      style={{ left: slot.x, top: slot.y, width: slot.width }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduce ? 0.2 : 0.6, delay: reduce ? 0 : slot.enterDelay, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={
          reduce
            ? undefined
            : { y: [0, -slot.floatDistance, 0], x: [0, slot.driftX, 0] }
        }
        transition={
          reduce
            ? undefined
            : { duration: slot.floatDuration, repeat: Infinity, ease: "easeInOut", delay: slot.enterDelay }
        }
      >
        <Link
          href={href}
          prefetch={false}
          onClick={handleClick}
          aria-label={`고민 읽기: ${preview.slice(0, 80)}`}
          className="group block rounded-[40%] focus-visible:outline-offset-[-6px]"
        >
          <motion.div
            animate={{ scale: selected ? 1.08 : 1 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="transition-transform duration-200 ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
          >
            <CloudShape variant={slot.variant} textClassName="text-[13px] leading-[1.45] sm:text-sm">
              <span className="line-clamp-3">{preview}</span>
            </CloudShape>
          </motion.div>
        </Link>
      </motion.div>
    </motion.div>
  );
}
