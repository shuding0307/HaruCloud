"use client";

import { useEffect, useRef, useState } from "react";
import { createSkyRenderer } from "@/lib/sky/sky-renderer";

/** WebGL 하늘. 첫 프레임이 그려지면 CSS 하늘 위로 서서히 나타나고, 실패하면 CSS 하늘이 그대로 남는다. */
export function SkyCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const renderer = createSkyRenderer(canvas, {
      onFirstFrame: () => setVisible(true),
      onLost: () => setVisible(false),
    });
    return () => renderer?.dispose();
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 h-full w-full transition-opacity duration-[1400ms] ease-out"
      style={{ opacity: visible ? 1 : 0 }}
    />
  );
}
