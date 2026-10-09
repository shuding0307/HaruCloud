import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] bg-pearl/75 p-6 shadow-glass ring-1 ring-white/70 backdrop-blur-xl sm:p-8 ${className}`}
      {...props}
    />
  );
}
