import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

type OgFont = { name: string; data: ArrayBuffer | Buffer; weight: 400 | 700; style: "normal" };

/**
 * Google Fonts 에서 text 에 쓰인 글자만 담은 TTF 를 받아온다 (빌드 시 1회).
 * 브라우저 UA 없이 요청하면 woff2 가 아닌 truetype 을 돌려준다 — Satori 는 woff2 를 읽지 못한다.
 */
async function loadGoogleFont(family: string, weight: number, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
  if (!src) throw new Error(`글꼴을 찾지 못했습니다: ${family}`);
  const res = await fetch(src);
  if (!res.ok) throw new Error(`글꼴 다운로드 실패: ${family}`);
  return res.arrayBuffer();
}

/** 디자인 글꼴(Gowun Batang/Dodum)을 쓰고, 받지 못하면 저장소에 포함된 Pretendard 로 대신한다. */
export async function ogFonts(text: string): Promise<{ fonts: OgFont[]; display: string; body: string }> {
  try {
    const [batang, dodum] = await Promise.all([
      loadGoogleFont("Gowun Batang", 700, text),
      loadGoogleFont("Gowun Dodum", 400, text),
    ]);
    return {
      fonts: [
        { name: "Gowun Batang", data: batang, weight: 700, style: "normal" },
        { name: "Gowun Dodum", data: dodum, weight: 400, style: "normal" },
      ],
      display: "Gowun Batang",
      body: "Gowun Dodum",
    };
  } catch {
    const dir = join(process.cwd(), "assets/fonts");
    const [bold, regular] = await Promise.all([
      readFile(join(dir, "Pretendard-Bold.otf")),
      readFile(join(dir, "Pretendard-Regular.otf")),
    ]);
    return {
      fonts: [
        { name: "Pretendard", data: bold, weight: 700, style: "normal" },
        { name: "Pretendard", data: regular, weight: 400, style: "normal" },
      ],
      display: "Pretendard",
      body: "Pretendard",
    };
  }
}
