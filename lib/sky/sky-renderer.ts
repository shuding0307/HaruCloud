import { FULLSCREEN_VERT, SKY_FRAG } from "./glsl";
import { getParallax, subscribeParallax } from "./parallax";
import { bindFullscreenTriangle, compileProgram, loseContext } from "./webgl";

export interface SkyRenderer {
  dispose(): void;
}

interface Options {
  onFirstFrame(): void;
  onLost(): void;
}

/**
 * 하늘 배경 렌더러 (React 와 분리된 순수 브라우저 코드).
 * - 낮은 해상도(화면의 약 42~50%)로 그린 뒤 CSS 로 늘린다: 구름은 부드러워 차이가 거의 보이지 않는다.
 * - 프레임 상한 30fps(모바일 24), 홈이 아니거나 15초간 입력이 없으면 15fps.
 * - 프레임이 계속 늦으면 해상도를 단계적으로 낮춘다.
 * - 탭이 숨겨지면 멈추고, 모션 감소 설정이면 정지 화면 한 장만 그린다.
 */
export function createSkyRenderer(canvas: HTMLCanvasElement, opts: Options): SkyRenderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  let program: WebGLProgram;
  let buffer: WebGLBuffer;
  try {
    program = compileProgram(gl, FULLSCREEN_VERT, SKY_FRAG);
    gl.useProgram(program);
    buffer = bindFullscreenTriangle(gl, program);
  } catch {
    loseContext(gl);
    return null;
  }

  const u = {
    res: gl.getUniformLocation(program, "uRes"),
    time: gl.getUniformLocation(program, "uTime"),
    par: gl.getUniformLocation(program, "uPar"),
    oct: gl.getUniformLocation(program, "uOct"),
    zoom: gl.getUniformLocation(program, "uZoom"),
  };

  const coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 640;
  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let scale = coarse ? 0.42 : 0.5;
  const minScale = 0.26;
  gl.uniform1f(u.oct, coarse ? 4 : 5);

  // 세션마다 다른 하늘이 되도록 시작 시각을 흩뜨린다 (클라이언트에서만 실행)
  const timeOffset = 200 + Math.random() * 400;
  let raf = 0;
  let last = 0;
  let slowFrames = 0;
  let firstDone = false;
  let lastInteraction = performance.now();
  let disposed = false;
  let lost = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const w = Math.max(2, Math.round(window.innerWidth * dpr * scale));
    const h = Math.max(2, Math.round(window.innerHeight * dpr * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl!.viewport(0, 0, w, h);
    gl!.uniform2f(u.res, w, h);
    gl!.uniform1f(u.zoom, w < h ? 1.35 : 1.0);
  }

  function draw(now: number) {
    if (lost) return;
    const par = getParallax();
    gl!.uniform1f(u.time, timeOffset + now / 1000);
    gl!.uniform2f(u.par, par.x, -par.y);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    if (!firstDone) {
      firstDone = true;
      opts.onFirstFrame();
    }
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const calm = window.location.pathname !== "/";
    const idle = now - lastInteraction > 15000;
    const fps = calm || idle ? 15 : coarse ? 24 : 30;
    const interval = 1000 / fps;
    const delta = now - last;
    if (delta < interval - 2) return;
    last = now;

    if (delta > interval * 1.7 && delta < 400) {
      if (++slowFrames > 24 && scale > minScale) {
        scale = Math.max(minScale, scale * 0.8);
        resize();
        slowFrames = 0;
      }
    } else if (slowFrames > 0) {
      slowFrames--;
    }
    draw(now);
  }

  function start() {
    if (disposed || lost || raf) return;
    if (reduceQuery.matches) {
      draw(performance.now());
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  const markInteraction = () => {
    lastInteraction = performance.now();
  };
  const onVisibility = () => (document.hidden ? stop() : start());
  let resizeTimer = 0;
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resize();
      if (!raf) draw(performance.now());
    }, 120);
  };
  const onMotionPref = () => {
    stop();
    start();
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    stop();
    opts.onLost();
  };
  const unsubscribeParallax = subscribeParallax(markInteraction);

  window.addEventListener("resize", onResize);
  window.addEventListener("pointerdown", markInteraction, { passive: true });
  window.addEventListener("scroll", markInteraction, { passive: true });
  window.addEventListener("keydown", markInteraction);
  document.addEventListener("visibilitychange", onVisibility);
  reduceQuery.addEventListener("change", onMotionPref);
  canvas.addEventListener("webglcontextlost", onLost);

  resize();
  // 첫 장면은 즉시 그린다: 백그라운드 탭에서 열려도 보이는 순간 하늘이 준비되어 있다.
  draw(performance.now());
  if (!document.hidden) start();

  return {
    dispose() {
      disposed = true;
      stop();
      window.clearTimeout(resizeTimer);
      unsubscribeParallax();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerdown", markInteraction);
      window.removeEventListener("scroll", markInteraction);
      window.removeEventListener("keydown", markInteraction);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceQuery.removeEventListener("change", onMotionPref);
      canvas.removeEventListener("webglcontextlost", onLost);
      if (!lost) {
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        loseContext(gl);
      }
    },
  };
}
