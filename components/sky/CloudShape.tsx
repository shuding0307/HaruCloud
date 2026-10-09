"use client";

import type { ReactNode } from "react";
import { cloudLobes, SPRITE_HALF, SPRITE_VARIANTS } from "@/lib/sky/cloud-lobes";
import { useCloudSprites } from "./useCloudSprites";

interface CloudShapeProps {
  variant?: number;
  /** 좌우 반전으로 실루엣 다양성 확보 (조명은 스프라이트에 구워져 있어 거의 티 나지 않는다) */
  flip?: boolean;
  children?: ReactNode;
  className?: string;
  textClassName?: string;
}

const VB_W = 290;
const VB_H = 200;
const toVbX = (x: number) => ((x + SPRITE_HALF.x) / (SPRITE_HALF.x * 2)) * VB_W;
const toVbY = (y: number) => ((SPRITE_HALF.y - y) / (SPRITE_HALF.y * 2)) * VB_H;
const toVbR = (r: number) => (r / (SPRITE_HALF.x * 2)) * VB_W;

/**
 * 입체 구름. WebGL 로 미리 그린 스프라이트를 쓰고, 준비 전이나 WebGL 이 없을 때는
 * 같은 실루엣의 SVG(로브별 빛 방향 그라디언트)로 대체한다. 본문 텍스트는 HTML 이라 회전·왜곡되지 않는다.
 */
export function CloudShape({ variant = 0, flip = false, children, className = "", textClassName = "" }: CloudShapeProps) {
  const sprites = useCloudSprites();
  const v = ((variant % SPRITE_VARIANTS) + SPRITE_VARIANTS) % SPRITE_VARIANTS;
  const url = sprites.status === "ready" ? sprites.urls[v] : null;
  const pending = sprites.status === "idle" || sprites.status === "loading";

  return (
    <div
      className={`relative aspect-[1.45] w-full transition-opacity duration-500 ease-out ${className}`}
      // 스프라이트 생성(보통 수백 ms) 동안은 숨겼다가, 준비되거나 실패하면 나타난다.
      style={{ opacity: pending ? 0 : 1 }}
    >
      {!url && <FallbackCloud variant={v} flip={flip} />}
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 생성한 blob URL 이라 next/image 최적화 대상이 아니다
        <img
          src={url}
          alt=""
          aria-hidden
          draggable={false}
          decoding="async"
          className="cloud-sprite pointer-events-none absolute inset-0 h-full w-full select-none"
          style={flip ? { transform: "scaleX(-1)" } : undefined}
        />
      )}
      {children !== undefined && (
        <div
          className={`absolute inset-x-[16%] top-[31%] bottom-[25%] flex items-center justify-center text-center text-ink [text-shadow:0_0_10px_rgb(250_252_255/0.95),0_0_2px_rgb(250_252_255/0.9)] ${textClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function FallbackCloud({ variant, flip }: { variant: number; flip: boolean }) {
  const lobes = cloudLobes(variant);
  const id = `fc-${variant}`;
  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="absolute inset-0 h-full w-full overflow-visible"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${id}-lobe`} cx="62%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f6f8fe" />
          <stop offset="100%" stopColor="#d9e0f2" />
        </radialGradient>
        <radialGradient id={`${id}-shadow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#34516b" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#34516b" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-base`}>
          <rect x="0" y="0" width={VB_W} height={toVbY(-0.64)} />
        </clipPath>
      </defs>
      <ellipse cx={VB_W / 2} cy={toVbY(-0.76)} rx={VB_W * 0.42} ry={VB_H * 0.12} fill={`url(#${id}-shadow)`} />
      <g clipPath={`url(#${id}-base)`}>
        {lobes.map((l, i) => (
          <circle key={i} cx={toVbX(l.x)} cy={toVbY(l.y)} r={toVbR(l.r)} fill={`url(#${id}-lobe)`} />
        ))}
      </g>
    </svg>
  );
}
