import Link, { type LinkProps } from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

const base =
  "inline-flex min-h-11 min-w-11 select-none items-center justify-center gap-2 rounded-full font-semibold " +
  "transition-[background-color,color,box-shadow,transform,opacity] duration-[var(--duration-fast)] ease-[var(--ease-soft)] " +
  "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary:
    "bg-deep-sky text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_14px_32px_-14px_rgb(52_81_107/0.7)] hover:bg-[#2b455c]",
  secondary: "bg-pearl/80 text-deep-sky shadow-glass ring-1 ring-white/70 backdrop-blur-md hover:bg-pearl",
  ghost: "bg-transparent text-deep-sky hover:bg-pearl/55",
  danger: "bg-danger text-white hover:bg-[#913a4e]",
};

const sizes: Record<Size, string> = {
  md: "px-5 py-2.5 text-[15px]",
  lg: "px-7 py-3.5 text-base",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant, size, className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function ButtonLink({ variant, size, className = "", ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
