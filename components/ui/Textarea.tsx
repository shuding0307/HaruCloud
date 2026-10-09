import { forwardRef, type TextareaHTMLAttributes } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={
          "block w-full resize-none rounded-[var(--radius-md)] bg-white/90 px-5 py-4 text-base leading-7 text-ink " +
          "shadow-soft outline-none ring-1 ring-cloud-blue/40 transition-shadow placeholder:text-ink-soft/70 " +
          `focus:ring-2 focus:ring-deep-sky/60 ${className}`
        }
        {...props}
      />
    );
  },
);
