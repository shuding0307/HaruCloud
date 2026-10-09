import { cloudLobes, SPRITE_HALF, SPRITE_VARIANTS } from "./cloud-lobes";
import { FULLSCREEN_VERT, MAX_LOBES, SPRITE_FRAG } from "./glsl";
import { bindFullscreenTriangle, compileProgram, loseContext } from "./webgl";

/**
 * 구름 스프라이트 저장소.
 * 세션마다 한 번, 임시 WebGL 컨텍스트로 SPRITE_VARIANTS 개의 입체 구름을 그려 PNG blob URL 로 만들고
 * 모든 구름 컴포넌트가 이를 공유한다. WebGL 이 없으면 "failed" 가 되어 SVG 대체 구름이 유지된다.
 */
export type SpriteState =
  | { status: "idle" | "loading" | "failed"; urls: null }
  | { status: "ready"; urls: string[] };

let state: SpriteState = { status: "idle", urls: null };
const listeners = new Set<() => void>();

function setState(next: SpriteState) {
  state = next;
  listeners.forEach((l) => l());
}

export function getSpriteState(): SpriteState {
  return state;
}

export const SERVER_SPRITE_STATE: SpriteState = { status: "idle", urls: null };

export function subscribeSprites(listener: () => void): () => void {
  listeners.add(listener);
  if (state.status === "idle") {
    setState({ status: "loading", urls: null });
    // 첫 화면 렌더를 막지 않도록 다음 유휴 시점에 생성
    const start = () =>
      generateSprites()
        .then((urls) => setState(urls ? { status: "ready", urls } : { status: "failed", urls: null }))
        .catch(() => setState({ status: "failed", urls: null }));
    if ("requestIdleCallback" in window) window.requestIdleCallback(start, { timeout: 600 });
    else setTimeout(start, 50);
  }
  return () => listeners.delete(listener);
}

async function generateSprites(): Promise<string[] | null> {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const width = coarse ? 448 : 560;
  const height = Math.round(width / (SPRITE_HALF.x / SPRITE_HALF.y));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl) return null;

  try {
    const program = compileProgram(gl, FULLSCREEN_VERT, SPRITE_FRAG);
    gl.useProgram(program);
    bindFullscreenTriangle(gl, program);
    gl.viewport(0, 0, width, height);
    const uLobes = gl.getUniformLocation(program, "uLobes");
    const uCount = gl.getUniformLocation(program, "uCount");
    const uSeed = gl.getUniformLocation(program, "uSeed");
    gl.uniform2f(gl.getUniformLocation(program, "uHalf"), SPRITE_HALF.x, SPRITE_HALF.y);

    const urls: string[] = [];
    for (let v = 0; v < SPRITE_VARIANTS; v++) {
      const lobes = cloudLobes(v).slice(0, MAX_LOBES);
      const data = new Float32Array(MAX_LOBES * 3);
      lobes.forEach((l, i) => data.set([l.x, l.y, l.r], i * 3));
      gl.uniform3fv(uLobes, data);
      gl.uniform1f(uCount, lobes.length);
      gl.uniform1f(uSeed, 11.3 + v * 7.77);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return null;
      urls.push(URL.createObjectURL(blob));
    }
    return urls;
  } finally {
    loseContext(gl);
  }
}
