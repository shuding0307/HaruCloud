import { hashString, seededRandom } from "./random";

export const CLOUD_ASPECT = 1.6; // 너비 / 높이

export interface CloudSlot {
  id: string;
  x: number;
  y: number;
  width: number;
  variant: 0 | 1 | 2;
  /** 부유 애니메이션 주기(초) 12~24 */
  floatDuration: number;
  /** 수직 부유 폭(px) */
  floatDistance: number;
  /** 수평 미세 이동(px, 음수면 왼쪽) */
  driftX: number;
  /** 등장 지연(초) */
  enterDelay: number;
}

export interface FieldGrid {
  cloudWidth: number;
  cols: number;
  rows: number;
  capacity: number;
}

/** 화면 크기에 따른 구름 크기와 격자. 모바일 6~12개, 데스크톱 15~30개를 목표로 한다. */
export function gridFor(width: number, height: number): FieldGrid {
  const cloudWidth = width < 640 ? 150 : width < 1024 ? 180 : 196;
  const floatMargin = 20;
  const cellW = cloudWidth * 1.08;
  const cellH = cloudWidth / CLOUD_ASPECT + floatMargin + 8;
  const cols = Math.max(2, Math.floor(width / cellW));
  const rows = Math.max(3, Math.floor(height / cellH));
  const max = width < 640 ? 12 : width < 1024 ? 18 : 30;
  return { cloudWidth, cols, rows, capacity: Math.min(cols * rows, max) };
}

/**
 * 격자 셀 하나에 구름 하나만 두고 셀 내부에서 흔들어(jitter) 배치한다.
 * → 불규칙해 보이지만 서로 겹쳐 글을 가리지 않는다.
 * 구름이 적을 때는 셀을 골고루 흩어 고른 여백을 유지한다.
 */
export function layoutClouds(
  items: { id: string; length: number }[],
  width: number,
  height: number,
): CloudSlot[] {
  if (width <= 0 || height <= 0 || items.length === 0) return [];
  const grid = gridFor(width, height);
  const visible = items.slice(0, grid.capacity);
  const cellW = width / grid.cols;
  const cellH = height / grid.rows;

  const rand = seededRandom(hashString(visible.map((v) => v.id).join("|")));

  // 셀 순서를 섞되, 구름 수가 적으면 띄엄띄엄 고르도록 간격을 둔다.
  const cells = Array.from({ length: grid.cols * grid.rows }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cells[i], cells[j]] = [cells[j]!, cells[i]!];
  }
  const chosen: number[] = [];
  const minGap = visible.length <= grid.cols * grid.rows / 2 ? 1 : 0;
  for (const cell of cells) {
    if (chosen.length >= visible.length) break;
    const cx = cell % grid.cols;
    const cy = Math.floor(cell / grid.cols);
    const tooClose = chosen.some((c) => {
      const dx = Math.abs((c % grid.cols) - cx);
      const dy = Math.abs(Math.floor(c / grid.cols) - cy);
      return minGap > 0 && dx <= minGap && dy === 0;
    });
    if (!tooClose) chosen.push(cell);
  }
  // 간격 조건 때문에 모자라면 남은 셀로 채운다.
  for (const cell of cells) {
    if (chosen.length >= visible.length) break;
    if (!chosen.includes(cell)) chosen.push(cell);
  }

  return visible.map((item, i) => {
    const cell = chosen[i]!;
    const col = cell % grid.cols;
    const row = Math.floor(cell / grid.cols);
    const r = seededRandom(hashString(item.id));

    // 글이 길수록 조금 더 큰 구름 (셀을 넘지 않도록 상한)
    const lengthScale = 0.88 + Math.min(item.length, 160) / 160 * 0.12;
    const cloudWidth = Math.min(grid.cloudWidth * lengthScale, cellW * 0.96);
    const cloudHeight = cloudWidth / CLOUD_ASPECT;
    const floatDistance = 5 + r() * 7;

    const slackX = Math.max(0, cellW - cloudWidth);
    const slackY = Math.max(0, cellH - cloudHeight - floatDistance * 2);

    return {
      id: item.id,
      x: Math.round(col * cellW + r() * slackX),
      y: Math.round(row * cellH + floatDistance + r() * slackY),
      width: Math.round(cloudWidth),
      variant: (Math.floor(r() * 3) % 3) as 0 | 1 | 2,
      floatDuration: 12 + r() * 12,
      floatDistance,
      driftX: (r() - 0.5) * 8,
      enterDelay: 0.05 + i * 0.045 + r() * 0.15,
    };
  });
}
