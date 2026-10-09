/** 공유 링크(Open Graph)에 쓰는 사이트 기본 정보 */
export const SITE_NAME = "HaruCloud 하루구름";
export const SITE_TAGLINE = "오늘의 고민을 띄워두세요. 내일이면 조금 가벼워질지도.";
export const SITE_DESCRIPTION =
  "이름 없이 고민을 하늘에 띄우고, 누군가의 고민에 조용히 공감을 보내는 곳. 모든 고민은 24시간 뒤 흩어져요.";

/**
 * 절대 URL 의 기준 주소.
 * NEXT_PUBLIC_SITE_URL(직접 지정) → Vercel 운영 도메인 → Vercel 배포 URL → 로컬 순서로 고른다.
 * (VERCEL_* 는 Vercel 이 빌드·런타임에 자동으로 넣어주는 시스템 환경변수)
 */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelHost) return new URL(`https://${vercelHost}`);
  return new URL("http://localhost:3000");
}
