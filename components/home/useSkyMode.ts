"use client";

import { useSyncExternalStore } from "react";
import type { SkyMode } from "@/lib/sky/day-night";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-sky"] });
  return () => observer.disconnect();
}

const read = (): SkyMode => (document.documentElement.dataset.sky === "night" ? "night" : "day");

/** 현재 낮/밤. 서버 렌더·하이드레이션 중에는 "day" 로 고정되고 이후 실제 값으로 바뀐다. */
export function useSkyMode(): SkyMode {
  return useSyncExternalStore(subscribe, read, () => "day");
}
