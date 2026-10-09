import "server-only";

export interface RateLimitRule {
  /** 버킷 이름 (예: "thought:create:actor") */
  name: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimiter {
  /** 허용되면 true. key 는 이미 해시된 값이어야 한다. */
  hit(rule: RateLimitRule, key: string): Promise<boolean>;
}

/** 고정 윈도 방식의 프로세스 메모리 제한기 (mock 모드 / 테스트용) */
export class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, { windowStart: number; count: number }>();

  async hit(rule: RateLimitRule, key: string): Promise<boolean> {
    const now = Date.now();
    const windowMs = rule.windowSeconds * 1000;
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const bucketKey = `${rule.name}:${key}`;
    const bucket = this.buckets.get(bucketKey);

    if (!bucket || bucket.windowStart !== windowStart) {
      this.buckets.set(bucketKey, { windowStart, count: 1 });
      this.sweep(now);
      return true;
    }
    bucket.count += 1;
    return bucket.count <= rule.limit;
  }

  private sweep(now: number) {
    if (this.buckets.size < 5000) return;
    for (const [k, b] of this.buckets) {
      if (now - b.windowStart > 60 * 60 * 1000) this.buckets.delete(k);
    }
  }
}

export const RATE_LIMITS = {
  createThoughtActor: { name: "thought:create:actor", limit: 5, windowSeconds: 600 },
  createThoughtIp: { name: "thought:create:ip", limit: 10, windowSeconds: 600 },
  reactionActor: { name: "reaction:actor", limit: 40, windowSeconds: 600 },
  reactionIp: { name: "reaction:ip", limit: 80, windowSeconds: 600 },
  reportActor: { name: "report:actor", limit: 10, windowSeconds: 3600 },
  reportIp: { name: "report:ip", limit: 20, windowSeconds: 3600 },
} satisfies Record<string, RateLimitRule>;
