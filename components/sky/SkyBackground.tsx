/** 고정 배경: 파스텔 하늘 그라디언트 + 은은한 햇빛 + 아주 느리게 흐르는 먼 구름 (CSS 전용) */
export function SkyBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #d3e9fc 0%, var(--color-sky) 38%, #e6e6f8 72%, var(--color-lavender) 86%, var(--color-peach) 100%)",
        }}
      />
      <div
        className="sun-breathe absolute -top-24 -right-20 h-80 w-80 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgb(255 248 222 / 0.95) 0%, rgb(255 240 214 / 0.55) 35%, rgb(255 240 214 / 0) 70%)",
        }}
      />
      {[
        { top: "14%", left: "-8%", w: 340, o: 0.55, d: "90s" },
        { top: "46%", left: "62%", w: 420, o: 0.45, d: "120s" },
        { top: "74%", left: "6%", w: 380, o: 0.5, d: "100s" },
      ].map((c, i) => (
        <div
          key={i}
          className="bg-drift absolute rounded-full bg-white blur-3xl"
          style={{
            top: c.top,
            left: c.left,
            width: c.w,
            height: c.w * 0.38,
            opacity: c.o,
            ["--drift-duration" as string]: c.d,
          }}
        />
      ))}
    </div>
  );
}
