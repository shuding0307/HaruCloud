import { Gowun_Batang, Gowun_Dodum } from "next/font/google";

// 한글 글리프 전체를 셀프 호스팅한다 (빌드 시 다운로드, 런타임 외부 요청 없음)
export const gowunBatang = Gowun_Batang({
  weight: ["400", "700"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-gowun-batang",
});
export const gowunDodum = Gowun_Dodum({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-gowun-dodum",
});
