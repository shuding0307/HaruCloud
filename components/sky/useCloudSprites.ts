"use client";

import { useSyncExternalStore } from "react";
import { getSpriteState, SERVER_SPRITE_STATE, subscribeSprites } from "@/lib/sky/cloud-sprites";

/** 공유 구름 스프라이트 상태. 서버·하이드레이션 중에는 항상 idle 이라 마크업이 어긋나지 않는다. */
export function useCloudSprites() {
  return useSyncExternalStore(subscribeSprites, getSpriteState, () => SERVER_SPRITE_STATE);
}
