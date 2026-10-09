/**
 * GLSL ES 1.0 셰이더 소스 (WebGL1 — 가장 넓은 브라우저 호환).
 * 하늘 배경과 구름 스프라이트가 노이즈 함수를 공유한다.
 */

export const FULLSCREEN_VERT = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const PRECISION = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

// sin 없는 해시(Dave Hoskins) + 값 노이즈 + 회전 FBM
const NOISE = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p, float octaves) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 6; i++) {
    if (float(i) >= octaves) break;
    v += a * vnoise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}
`;

/**
 * 하늘 배경: 그라디언트 → 햇빛 → 구름 층(높은 새털구름, 먼 적운, 중간 적운, 가까운 구름 바닥) → 지평선 안개.
 * 구름 층마다 태양 방향으로 밀도를 두 번 더 샘플링해 빛이 닿는 윗면과 그늘진 아랫면을 만든다.
 */
export const SKY_FRAG = /* glsl */ `
${PRECISION}
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPar;
uniform float uOct;
uniform float uZoom;
${NOISE}

const vec3 SUN_COL = vec3(1.0, 0.93, 0.84);
const vec3 LIT = vec3(1.0, 0.958, 0.935);

// 해 질 녘 파스텔: 라벤더 보랏빛 윗하늘 → 라일락 → 복숭아빛 노을 → 장밋빛 구름 바다
vec3 skyGradient(vec2 uv) {
  vec3 top   = vec3(0.690, 0.655, 0.855);
  vec3 upper = vec3(0.780, 0.776, 0.925);
  vec3 mid   = vec3(0.886, 0.850, 0.930);
  vec3 glow  = vec3(0.985, 0.872, 0.815);
  vec3 low   = vec3(0.905, 0.815, 0.872);
  float y = uv.y + (vnoise(uv * vec2(2.2, 1.4) + 3.1) - 0.5) * 0.06;
  vec3 c = mix(low, glow, smoothstep(0.10, 0.34, y));
  c = mix(c, mid, smoothstep(0.36, 0.60, y));
  c = mix(c, upper, smoothstep(0.58, 0.82, y));
  c = mix(c, top, smoothstep(0.80, 1.05, y));
  return c;
}

float bandMask(float y, float center, float height) {
  float d = (y - center) / height;
  return exp(-d * d);
}

// 뭉게구름 밀도: 도메인 워프로 덩어리를 굴리고, 작은 퍼프 노이즈로 가장자리를 몽글몽글하게
float layerDensity(vec2 p, float scale, vec2 stretch, vec2 drift, float bandY, float bandH, float xMask) {
  vec2 q = (p * stretch) * scale + drift;
  q += (vec2(vnoise(q * 1.7), vnoise(q * 1.7 + 5.2)) - 0.5) * 0.9;
  float puff = vnoise(q * 3.1) * 0.6 + vnoise(q * 6.3) * 0.4;
  return (fbm(q, uOct) + (puff - 0.5) * 0.22) * bandMask(p.y, bandY, bandH) * xMask;
}

vec3 cloudLayer(vec3 base, vec2 p, vec2 sun, float scale, vec2 stretch, vec2 drift,
                float coverage, float softness, float bandY, float bandH,
                float haze, float shade, float opacity, vec3 hazeCol, float xMask) {
  float band = bandMask(p.y, bandY, bandH) * xMask;
  if (band < 0.03) return base;
  float dens = layerDensity(p, scale, stretch, drift, bandY, bandH, xMask);
  float a = smoothstep(coverage, coverage + softness, dens);
  if (a < 0.004) return base;

  vec2 L = normalize(sun - p);
  vec2 p1 = p + L * 0.035;
  vec2 p2 = p + L * 0.09;
  float d1 = layerDensity(p1, scale, stretch, drift, bandY, bandH, xMask);
  float d2 = layerDensity(p2, scale, stretch, drift, bandY, bandH, xMask);
  float occl = max(d1 - coverage, 0.0) * 0.6 + max(d2 - coverage, 0.0) * 0.4;
  float light = clamp(1.0 - occl * shade, 0.0, 1.0);

  float under = smoothstep(bandY + bandH * 0.25, bandY - bandH * 0.9, p.y);
  vec3 shadowC = mix(vec3(0.640, 0.630, 0.800), base, 0.30);
  vec3 c = mix(shadowC, LIT, light * (1.0 - under * 0.30));
  // 아랫면에는 노을빛 장미색 반사
  c = mix(c, vec3(0.960, 0.820, 0.850), under * 0.18);

  float edge = 1.0 - smoothstep(0.0, softness * 1.3, dens - coverage);
  c += SUN_COL * edge * light * 0.25;
  c = mix(c, hazeCol, haze);
  return mix(base, c, a * opacity * (1.0 - haze * 0.3));
}

// 윗하늘에만 드물게, 천천히 반짝이는 별빛
float stars(vec2 frag, float t) {
  vec2 g = frag / uRes.y * 110.0;
  vec2 cell = floor(g);
  float h = hash12(cell);
  if (h < 0.993) return 0.0;
  vec2 pos = vec2(hash12(cell + 3.7), hash12(cell + 9.1)) * 0.6 + 0.2;
  float d = length(fract(g) - pos);
  float tw = 0.55 + 0.45 * sin(t * (0.4 + h * 0.6) + h * 40.0);
  return smoothstep(0.22, 0.0, d) * tw;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 uv = vUv;
  vec2 p = vec2(uv.x * aspect, uv.y) * uZoom;
  float t = uTime;

  vec3 col = skyGradient(uv);

  // 윗하늘의 서늘한 푸른 기운 (성운처럼 아주 옅게)
  vec2 nb = vec2(0.42 * aspect, 0.86);
  float nd = length(vec2(uv.x * aspect, uv.y) - nb);
  col = mix(col, vec3(0.780, 0.875, 0.950), 0.30 * exp(-nd * nd * 6.0) * (0.7 + 0.3 * vnoise(uv * 3.0 + t * 0.01)));

  float st = stars(gl_FragCoord.xy, t) * smoothstep(0.58, 0.92, uv.y);
  col = mix(col, vec3(1.0, 0.98, 0.95), st * 0.8);

  // 구름 바다 너머 지평선의 노을빛 광원
  vec2 sun = vec2(0.62 * aspect, 0.40) * uZoom;
  float sd = length(p - sun) / uZoom;
  float breathe = 0.94 + 0.06 * sin(t * 0.07);
  float glow = clamp((0.30 * exp(-sd * 2.4) + 0.24 * exp(-sd * 7.0) + 0.20 * exp(-sd * 22.0)) * breathe, 0.0, 0.85);
  col = mix(col, vec3(1.0, 0.925, 0.835), glow);

  vec3 haze = mix(vec3(0.930, 0.900, 0.955), SUN_COL, 0.22);
  float cx = (p.x / uZoom) / aspect - 0.5;
  float sides = smoothstep(0.12, 0.42, abs(cx));

  // 높은 새털구름
  col = cloudLayer(col, p + uPar * 0.004, sun, 2.0, vec2(0.42, 2.8), vec2(t * 0.004, 1.7),
                   0.54, 0.18, 0.78 * uZoom, 0.08 * uZoom, 0.38, 1.6, 0.45, haze, 1.0);
  // 노을빛을 받은 먼 구름 둑 — 양옆에만
  col = cloudLayer(col, p + uPar * 0.005, sun, 3.0, vec2(1.0, 1.5), vec2(t * 0.005, 21.3),
                   0.44, 0.10, 0.52 * uZoom, 0.13 * uZoom, 0.48, 4.0, 0.9, haze, sides);
  // 먼 적운 띠
  col = cloudLayer(col, p + uPar * 0.007, sun, 3.6, vec2(1.0, 1.5), vec2(t * 0.006, 9.3),
                   0.42, 0.10, 0.33 * uZoom, 0.10 * uZoom, 0.44, 4.0, 1.0, haze, 1.0);
  // 구름 바다 (중간)
  col = cloudLayer(col, p + uPar * 0.012, sun, 2.2, vec2(1.0, 1.4), vec2(t * 0.009, 4.1),
                   0.33, 0.10, 0.20 * uZoom, 0.13 * uZoom, 0.22, 5.0, 1.0, haze, 1.0);
  // 구름 바다 (가까이) — 대비가 가장 강하다
  col = cloudLayer(col, p + uPar * 0.024, sun, 1.5, vec2(1.0, 1.25), vec2(t * 0.014, 12.7),
                   0.28, 0.09, 0.03 * uZoom, 0.19 * uZoom, 0.04, 6.0, 1.0, haze, 1.0);

  col = mix(col, vec3(0.965, 0.905, 0.920), smoothstep(0.30, 0.0, uv.y) * 0.12);
  vec2 vc = uv - 0.5;
  col *= 1.0 - dot(vc, vc) * 0.10;
  col += (hash12(gl_FragCoord.xy + fract(t) * 61.0) - 0.5) * (2.0 / 255.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const MAX_LOBES = 24;

/**
 * 구름 스프라이트: 반구 로브들의 부드러운 합집합을 높이장(height field)으로 보고
 * 법선·감싸기 조명·높이장 자기 그림자·곡률 기반 앰비언트 오클루전·림 라이트·바닥 그림자를 계산한다.
 * 결과는 프리멀티플라이드 알파.
 */
export const SPRITE_FRAG = /* glsl */ `
${PRECISION}
varying vec2 vUv;
uniform vec3 uLobes[${MAX_LOBES}];
uniform float uCount;
uniform float uSeed;
uniform vec2 uHalf;
${NOISE}

const vec3 L = vec3(0.52, 0.68, 0.52);

float smax(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return max(a, b) + h * h * k * 0.25;
}

// 로브만으로 만든 매끈한 높이 (노이즈 없음) — 큰 굴곡과 오클루전 계산용
float baseHeight(vec2 q) {
  float h = 0.0;
  for (int i = 0; i < ${MAX_LOBES}; i++) {
    if (float(i) >= uCount) break;
    vec3 l = uLobes[i];
    vec2 d = q - l.xy;
    float hi = sqrt(max(l.z * l.z - dot(d, d), 0.0));
    // 둘 중 하나라도 0 이면 일반 max — 구름 밖에서 높이가 생기지 않게 한다.
    float k = 0.32 * clamp(min(h, hi) * 5.0, 0.0, 1.0);
    h = k > 1e-4 ? smax(h, hi, k) : max(h, hi);
  }
  return h * smoothstep(-0.76, -0.48, q.y);
}

vec2 warp(vec2 p) {
  vec2 w = vec2(fbm(p * 2.1 + uSeed, 3.0), fbm(p * 2.1 + uSeed + 7.1, 3.0)) - 0.5;
  return p + w * 0.10;
}

float heightAt(vec2 p) {
  vec2 q = warp(p);
  float h = baseHeight(q);
  // 표면의 잔잔한 뭉게짐 (화면 픽셀보다 충분히 큰 주파수만 사용해 반짝임 방지)
  h += (fbm(q * 3.4 + uSeed * 1.7, 3.0) - 0.5) * 0.07 * smoothstep(0.0, 0.25, h);
  return max(h, 0.0);
}

float shadowField(vec2 p) {
  float s = 0.0;
  for (int i = 0; i < ${MAX_LOBES}; i++) {
    if (float(i) >= uCount) break;
    vec3 l = uLobes[i];
    vec2 d = p - vec2(l.x, l.y - 0.16);
    d.y *= 1.7;
    s = max(s, smoothstep(l.z + 0.20, l.z - 0.30, length(d)));
  }
  return s;
}

void main() {
  vec2 p = (vUv * 2.0 - 1.0) * uHalf;
  float e = 0.016;
  float h = heightAt(p);
  float hx1 = heightAt(p + vec2(e, 0.0));
  float hx0 = heightAt(p - vec2(e, 0.0));
  float hy1 = heightAt(p + vec2(0.0, e));
  float hy0 = heightAt(p - vec2(0.0, e));

  vec3 N = normalize(vec3(-(hx1 - hx0) / (2.0 * e), -(hy1 - hy0) / (2.0 * e), 1.15));
  // 로브 사이 골짜기의 앰비언트 오클루전: 매끈한 높이장의 넓은 라플라시안
  vec2 qw = warp(p);
  float E = 0.12;
  float b0 = baseHeight(qw);
  float lap = (baseHeight(qw + vec2(E, 0.0)) + baseHeight(qw - vec2(E, 0.0)) +
               baseHeight(qw + vec2(0.0, E)) + baseHeight(qw - vec2(0.0, E)) - 4.0 * b0) / (E * E);
  vec3 Ld = normalize(L);

  // 높이장 위에서 태양 쪽으로 진행하며 가려짐을 누적 (부드러운 자기 그림자)
  float sh = 1.0;
  for (int i = 1; i <= 6; i++) {
    float t = float(i) * 0.075;
    float hs = heightAt(p + Ld.xy * t);
    float ray = h + Ld.z * t * 1.25;
    sh *= 1.0 - clamp((hs - ray) * 3.0, 0.0, 1.0) * 0.38;
  }

  float diff = pow(clamp((dot(N, Ld) + 0.12) / 1.12, 0.0, 1.0), 0.8);
  float ao = 1.0 - clamp(lap * 0.016, 0.0, 0.16);

  // 레퍼런스 톤: 따뜻한 흰 하이라이트, 깊은 청회색 그림자, 노을빛 장밋색 아래 반사
  vec3 lit = vec3(1.0, 0.978, 0.958);
  vec3 shadowC = vec3(0.520, 0.585, 0.765);
  vec3 skyUp = vec3(0.780, 0.800, 0.950);
  vec3 bounce = vec3(0.990, 0.840, 0.860);

  float light = diff * mix(0.34, 1.0, sh);
  vec3 col = mix(shadowC, lit, light);
  col += skyUp * 0.08 * clamp(N.y, 0.0, 1.0);
  col = mix(col, bounce, 0.45 * clamp(-N.y, 0.0, 1.0) * (1.0 - light * 0.4));
  col *= ao;

  float rimDir = clamp(dot(normalize(N.xy + 1e-4), normalize(Ld.xy)), 0.0, 1.0);
  float rim = pow(1.0 - N.z, 3.0) * rimDir;
  col += vec3(1.0, 0.96, 0.9) * rim * 0.35;
  float thin = 1.0 - smoothstep(0.0, 0.16, h);
  col = mix(col, skyUp, thin * 0.22);
  // 하늘빛 반사: 해가 있는 오른쪽 위는 따뜻하게, 왼쪽 아래는 서늘하게
  float warmth = clamp(vUv.x * 0.6 + vUv.y * 0.6 - 0.2, 0.0, 1.0);
  col *= mix(vec3(0.975, 0.975, 1.0), vec3(1.0, 0.988, 0.968), warmth);
  col = min(col, vec3(1.0));

  // 가장자리는 노이즈로 흐트러뜨려 솜털처럼 부드럽게
  float fringe = fbm(p * 6.0 + uSeed * 3.1, 3.0) - 0.5;
  float a = smoothstep(0.0, 0.11, h + fringe * 0.07) * mix(0.78, 1.0, smoothstep(0.0, 0.3, h));
  float sa = shadowField(p) * 0.17 * (1.0 - a);
  vec3 shadowColor = vec3(0.204, 0.318, 0.420);

  gl_FragColor = vec4(col * a + shadowColor * sa, a + sa);
}
`;
