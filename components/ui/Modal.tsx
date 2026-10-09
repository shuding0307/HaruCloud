"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * 네이티브 <dialog> 기반 모달.
 * showModal() 로 포커스 가두기·배경 비활성화·Esc 닫기를 브라우저가 처리한다.
 * 모바일에서는 하단 시트, 넓은 화면에서는 가운데 카드로 표시된다.
 */
export function Modal({ open, onClose, title, description, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const reduce = useReducedMotion();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={
        "m-0 mt-auto h-fit max-h-[92dvh] w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-deep-sky/25 backdrop:backdrop-blur-sm " +
        "sm:m-auto sm:max-w-lg"
      }
    >
      {open && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.1 : 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="max-h-[92dvh] overflow-y-auto rounded-t-[var(--radius-lg)] bg-white px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-float sm:rounded-[var(--radius-lg)] sm:p-8"
        >
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-cloud-blue/50 sm:hidden" aria-hidden />
          <h2 id={titleId} className="text-xl font-bold text-deep-sky">
            {title}
          </h2>
          {description && (
            <p id={descId} className="mt-1 text-sm text-ink-soft">
              {description}
            </p>
          )}
          <div className="mt-5">{children}</div>
        </motion.div>
      )}
    </dialog>
  );
}
