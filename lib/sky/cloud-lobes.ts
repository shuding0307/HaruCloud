import { seededRandom } from "./random";

/** 구름 실루엣 종류 수. 스프라이트는 이 수만큼만 만들고 재사용한다. */
export const SPRITE_VARIANTS = 6;

/** 스프라이트 좌표계 반폭·반높이 (가로세로비 1.45) */
export const SPRITE_HALF = { x: 1.45, y: 1 } as const;

/** 로브 전체 배율 — 셰이더의 평평한 바닥 높이(BASE_CUT)와 함께 맞춘다 */
const LOBE_SCALE = 1.1;

export interface Lobe {
  x: number;
  y: number;
  r: number;
}

/**
 * 결정적인 구름 로브 배치: 아래쪽 받침 로브 줄 + 위쪽 크게 솟은 왕관 로브 + 옆 장식.
 * 가운데(본문 텍스트 영역)는 항상 두껍게 채워지도록 한다.
 */
export function cloudLobes(variant: number): Lobe[] {
  const rand = seededRandom(0x9e3779b1 ^ Math.imul(variant + 1, 2654435761));
  const lobes: Lobe[] = [];

  const baseCount = 4 + Math.floor(rand() * 2);
  for (let i = 0; i < baseCount; i++) {
    const t = i / (baseCount - 1);
    lobes.push({
      x: -0.84 + 1.68 * t + (rand() - 0.5) * 0.08,
      y: -0.3 + (rand() - 0.5) * 0.06,
      r: 0.36 + rand() * 0.08 - Math.abs(t - 0.5) * 0.08,
    });
  }

  const peak = (rand() - 0.5) * 0.5;
  const crown: Lobe[] = [];
  for (let i = 0; i < 3; i++) {
    const x = -0.6 + 0.6 * i + peak * 0.35 + (rand() - 0.5) * 0.14;
    const r = 0.5 + rand() * 0.12 - Math.abs(x - peak) * 0.12;
    crown.push({ x, y: 0.02 + r * 0.3 + rand() * 0.05, r });
  }
  lobes.push(...crown);

  // 왕관 둘레의 작은 뭉게 덩어리 — 콜리플라워처럼 겹겹이 솟은 적운의 질감
  for (const c of crown) {
    const count = 2 + Math.floor(rand() * 2);
    for (let j = 0; j < count; j++) {
      const angle = Math.PI * (0.2 + 0.6 * ((j + rand() * 0.6) / count));
      lobes.push({
        x: c.x + Math.cos(angle) * c.r * 0.72,
        y: c.y + Math.sin(angle) * c.r * 0.62,
        r: c.r * (0.34 + rand() * 0.12),
      });
    }
  }

  for (const side of [-1, 1]) {
    if (rand() < 0.75) {
      lobes.push({ x: side * (0.8 + rand() * 0.12), y: -0.08 + rand() * 0.1, r: 0.26 + rand() * 0.06 });
    }
  }
  // 스프라이트 영역을 넉넉히 채우도록 전체를 키운다 (본문 글이 구름 몸통 안에 들어오게)
  return lobes.map((l) => ({ x: l.x * LOBE_SCALE, y: l.y * LOBE_SCALE, r: l.r * LOBE_SCALE }));
}
