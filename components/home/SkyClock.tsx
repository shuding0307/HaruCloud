"use client";

import { useEffect } from "react";
import { resolveSky } from "@/lib/sky/day-night";

/** 1분마다 낮/밤을 다시 판단해 <html data-sky> 를 갱신한다. (첫 판단은 인라인 스크립트가 한다) */
export function SkyClock() {
  useEffect(() => {
    const apply = () => {
      const sky = resolveSky(new Date().getHours(), window.location.search);
      if (document.documentElement.dataset.sky !== sky) document.documentElement.dataset.sky = sky;
    };
    apply();
    const id = window.setInterval(apply, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return null;
}
