import type { ReactNode } from "react";

// 세 가지 실루엣. viewBox 240×150 (비율 1.6) 안에서 원과 둥근 사각형을 합쳐 만든다.
const VARIANTS: { circles: [number, number, number][]; body: [number, number, number, number] }[] = [
  { circles: [[78, 66, 40], [140, 54, 48], [192, 80, 32], [46, 92, 28]], body: [16, 70, 208, 70] },
  { circles: [[64, 74, 34], [118, 52, 46], [176, 62, 40], [208, 94, 24]], body: [14, 74, 212, 66] },
  { circles: [[86, 58, 44], [152, 66, 40], [44, 88, 30], [200, 92, 26]], body: [18, 72, 206, 68] },
];

interface CloudShapeProps {
  variant?: 0 | 1 | 2;
  children?: ReactNode;
  className?: string;
  /** 본문 영역 글자 크기 등 추가 클래스 */
  textClassName?: string;
}

/** 흰 구름 실루엣 위에 텍스트를 얹는다. 텍스트는 HTML 이라 회전·왜곡되지 않는다. */
export function CloudShape({ variant = 0, children, className = "", textClassName = "" }: CloudShapeProps) {
  const v = VARIANTS[variant]!;
  return (
    <div className={`relative aspect-[1.6] w-full ${className}`}>
      <svg
        viewBox="0 0 240 150"
        className="absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_10px_18px_rgba(52,91,122,0.16)]"
        aria-hidden
      >
        <defs>
          <linearGradient id={`cloud-fill-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f6f9fe" />
          </linearGradient>
        </defs>
        <g fill={`url(#cloud-fill-${variant})`}>
          {v.circles.map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} />
          ))}
          <rect x={v.body[0]} y={v.body[1]} width={v.body[2]} height={v.body[3]} rx={v.body[3] / 2} />
        </g>
      </svg>
      {children !== undefined && (
        <div
          className={`absolute inset-x-[14%] top-[34%] bottom-[12%] flex items-center justify-center text-center text-ink ${textClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
