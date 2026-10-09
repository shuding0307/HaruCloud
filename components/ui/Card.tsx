import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] bg-white/80 p-6 shadow-soft backdrop-blur-md sm:p-8 ${className}`}
      {...props}
    />
  );
}
