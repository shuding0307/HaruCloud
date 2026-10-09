/**
 * 마우스 포인터 시차(parallax) 저장소. 정밀 포인터 + hover 가능한 기기에서만 켜진다.
 * React 상태를 쓰지 않고, 구독자가 값(-1~1, 부드럽게 보간)을 직접 받아 DOM/셰이더에 반영한다.
 */
type Listener = (x: number, y: number) => void;

const listeners = new Set<Listener>();
const target = { x: 0, y: 0 };
const current = { x: 0, y: 0 };
let raf = 0;
let attached = false;

function tick() {
  current.x += (target.x - current.x) * 0.05;
  current.y += (target.y - current.y) * 0.05;
  listeners.forEach((l) => l(current.x, current.y));
  const settled = Math.abs(target.x - current.x) < 0.001 && Math.abs(target.y - current.y) < 0.001;
  raf = settled ? 0 : requestAnimationFrame(tick);
}

function kick() {
  if (!raf) raf = requestAnimationFrame(tick);
}

function onMove(e: PointerEvent) {
  if (e.pointerType !== "mouse") return;
  target.x = (e.clientX / window.innerWidth) * 2 - 1;
  target.y = (e.clientY / window.innerHeight) * 2 - 1;
  kick();
}

function onLeave() {
  target.x = 0;
  target.y = 0;
  kick();
}

function attach() {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || reduce) return;
  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  attached = true;
}

function detach() {
  if (!attached) return;
  window.removeEventListener("pointermove", onMove);
  document.documentElement.removeEventListener("pointerleave", onLeave);
  cancelAnimationFrame(raf);
  raf = 0;
  attached = false;
}

export function subscribeParallax(listener: Listener): () => void {
  listeners.add(listener);
  if (listeners.size === 1) attach();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) detach();
  };
}

export function getParallax(): { x: number; y: number } {
  return current;
}
