import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og-fonts";

// 링크 공유 미리보기 카드 — 모든 페이지가 이 이미지를 함께 쓴다.
// 고민 본문은 넣지 않는다: 메신저가 미리보기를 캐시하면 24시간 뒤 사라져야 할 익명 글이 남기 때문.
export const alt = "HaruCloud 하루구름 — 오늘의 고민을 띄워두세요. 내일이면 조금 가벼워질지도.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "HaruCloud";
const KO = "하루구름";
const LINE1 = "오늘의 고민을 띄워두세요.";
const LINE2 = "내일이면 조금 가벼워질지도.";
const CHIP = "익명으로 띄우고, 24시간 뒤 흩어져요";

const PUFF = "radial-gradient(circle at 36% 28%, #FFFFFF 0%, #FBF9FF 34%, #E6E2F7 70%, #C9C8EA 100%)";

/** 레퍼런스의 3D 구름(.cloud3d)과 같은 구성 — 받침 + 둥근 뭉게 3개 */
function Cloud({ x, y, scale, opacity = 1 }: { x: number; y: number; scale: number; opacity?: number }) {
  const u = (n: number) => n * scale;
  const puff = (left: number, top: number, w: number, h: number, radius = "50%") => (
    <div
      style={{
        position: "absolute",
        left: u(left),
        top: u(top),
        width: u(w),
        height: u(h),
        borderRadius: radius,
        backgroundImage: PUFF,
      }}
    />
  );
  return (
    <div style={{ position: "absolute", left: x, top: y, width: u(230), height: u(104), display: "flex", opacity }}>
      {puff(0, 50, 230, 54, "999px")}
      {puff(24, 22, 82, 82)}
      {puff(90, 0, 104, 104)}
      {puff(168, 34, 58, 58)}
    </div>
  );
}

export default async function OpengraphImage() {
  const { fonts, display, body } = await ogFonts(TITLE + KO + LINE1 + LINE2 + CHIP);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundImage: "linear-gradient(180deg, #B4C6F4 0%, #D8CDF4 38%, #F4D6E6 72%, #FCEEE6 100%)",
          fontFamily: body,
        }}
      >
        {/* 햇빛 */}
        <div
          style={{
            position: "absolute",
            right: -200,
            top: -220,
            width: 620,
            height: 620,
            borderRadius: "50%",
            backgroundImage:
              "radial-gradient(circle, rgba(255,246,222,.95) 0%, rgba(255,236,214,.55) 28%, rgba(255,226,236,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 70,
            top: 56,
            width: 96,
            height: 96,
            borderRadius: "50%",
            backgroundImage: "radial-gradient(circle at 40% 38%, #FFFFFF 0%, #FFF6DC 55%, #FFE3B8 100%)",
            boxShadow: "0 0 50px 22px rgba(255,240,205,.8)",
          }}
        />

        {/* 먼 구름 → 가까운 구름 */}
        <Cloud x={-60} y={430} scale={1.1} opacity={0.55} />
        <Cloud x={980} y={420} scale={0.9} opacity={0.6} />
        <Cloud x={790} y={150} scale={1.05} opacity={0.7} />
        <Cloud x={700} y={330} scale={2.1} />

        {/* 글 */}
        <div
          style={{
            position: "absolute",
            left: 88,
            top: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span
              style={{
                fontFamily: display,
                fontWeight: 700,
                fontSize: 96,
                color: "#26244D",
                letterSpacing: "-0.01em",
              }}
            >
              {TITLE}
            </span>
            <span style={{ marginLeft: 22, fontSize: 38, color: "#4B4880", letterSpacing: "0.12em" }}>{KO}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 26, fontSize: 38, lineHeight: 1.5, color: "#4B4880" }}>
            <span>{LINE1}</span>
            <span>{LINE2}</span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 40,
              padding: "14px 26px",
              borderRadius: 999,
              alignSelf: "flex-start",
              fontSize: 26,
              color: "#46437A",
              background: "rgba(255,255,255,.55)",
              border: "1px solid rgba(255,255,255,.85)",
            }}
          >
            {CHIP}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
