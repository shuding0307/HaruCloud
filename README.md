# HaruCloud · 하루 구름

> 오늘의 고민을 띄워두세요. 내일이면 조금 가벼워질지도.

익명으로 고민을 쓰면 하늘 위 구름이 되어 떠다니고, 다른 사람이 읽고 조용히 공감을 보낼 수 있는 모바일 우선 웹 서비스입니다. 모든 고민은 **공개 후 24시간**이 지나면 하늘에서 사라지고 삭제됩니다.

- Next.js 16 (App Router, Cache Components) · React 19 · TypeScript strict
- Tailwind CSS v4 · Motion for React (`motion`) · Pretendard (npm 로컬 웹폰트)
- Supabase PostgreSQL (서버 전용 service role + RPC) · Zod · Vitest

---

## 빠른 시작 (Mock 모드)

Supabase 없이 바로 UI와 핵심 흐름을 확인할 수 있습니다.

```bash
npm install
```

```bash
npm run dev
```

http://localhost:3000 을 엽니다. 개발 환경에서 `DATA_MODE` 가 비어 있으면 **Mock 모드**로 동작하며, 화면 상단에 “체험 모드” 배너가 표시됩니다.

> Mock 모드의 데이터는 서버 프로세스 메모리에만 있습니다. 재시작하면 사라지고, 다른 사용자·다른 서버 인스턴스와 공유되지 않습니다. 시연을 위해 예시 고민 12개가 미리 들어 있습니다.

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드 / 실행 |
| `npm run typecheck` | 라우트 타입 생성 후 `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest 단위·API 통합 테스트 (Mock 저장소 사용) |

## 환경변수

`.env.example` 을 `.env.local` 로 복사해 채웁니다. **어떤 키도 `NEXT_PUBLIC_` 접두사를 쓰지 않으며, 브라우저로 전달되지 않습니다.**

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `DATA_MODE` | 권장 | `supabase` 또는 `mock`. 비우면 dev=mock, production=supabase |
| `ALLOW_MOCK_IN_PRODUCTION` | 아니오 | 프로덕션에서 mock 을 **의도적으로** 쓸 때만 `true` (데모용). 없으면 프로덕션 mock 은 오류로 차단 |
| `SUPABASE_URL` | supabase 모드 | 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | supabase 모드 | 서버 전용 키. `server-only` 모듈에서만 사용 |
| `ANON_TOKEN_SECRET` | 프로덕션 | 32자 이상 무작위 문자열. 익명 쿠키 서명·식별값/IP 해시에 사용 (`openssl rand -base64 48`) |

## Supabase 연결

1. [Supabase](https://supabase.com)에서 프로젝트를 만듭니다.
2. 마이그레이션을 적용합니다. 둘 중 하나를 고르세요.
   - **SQL Editor**: `supabase/migrations/` 의 파일을 이름 순서대로 붙여 넣고 실행합니다.
   - **Supabase CLI**: 아래 명령으로 프로젝트를 연결하고 적용합니다.

     ```bash
     npx supabase link --project-ref <project-ref>
     ```

     ```bash
     npx supabase db push
     ```
3. `20261009000100_schedule_purge.sql` 은 `pg_cron` 으로 10분마다 `purge_expired()` 를 실행합니다. 확장 설치가 막혀 있다면 Dashboard → Integrations → Cron 에서 `select public.purge_expired();` 를 10분 주기로 등록하세요.
4. Project Settings → API 에서 URL 과 `service_role` 키를 복사해 `.env.local` 에 넣고 `DATA_MODE=supabase` 로 설정합니다.

### 데이터베이스 구조 요약

| 테이블 | 주요 컬럼 | 비고 |
| --- | --- | --- |
| `thoughts` | `id`, `content`(1~500자 CHECK), `created_at`, `expires_at`, `status`, `moderation_status`, `deleted_at`, `retain_until`, `author_token_hash` | 작성·만료 시각은 트리거가 `now()` 기준으로 강제. `expires_at = created_at + 24h` CHECK |
| `reactions` | `thought_id`(FK, cascade), `reaction_type`, `actor_token_hash`, `created_at` | `UNIQUE(thought_id, reaction_type, actor_token_hash)` |
| `reports` | `thought_id`(FK, set null), `reason`, `reporter_token_hash`, `status`, `created_at` | 신고자당 게시물 1회 (부분 UNIQUE) |
| `rate_limits` | `key`(해시), `window_start`, `count` | 1일 후 삭제 |

- 모든 테이블에 **RLS 활성화(+FORCE)**, `anon`/`authenticated` 권한 회수, 정책 없음 → 공개 키로는 어떤 행도 읽거나 쓸 수 없습니다.
- 앱 서버는 `service_role` 로 **RPC 함수만** 호출합니다 (`list_active_thoughts`, `create_thought`, `get_thought_view`, `add_reaction`, `create_report`, `hit_rate_limit`, `purge_expired`, `server_now`). 함수 실행 권한도 `service_role` 에만 부여됩니다.
- 인덱스: `expires_at`, 공개 피드용 부분 인덱스 `(created_at desc, id desc) where status='published'`, `reactions.thought_id`, `reports.thought_id/created_at`.

## Vercel 배포

1. 저장소를 Vercel 에 import 합니다 (Framework: Next.js, 빌드 명령 기본값).
2. Project → Settings → Environment Variables 에 `DATA_MODE=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANON_TOKEN_SECRET` 을 등록합니다.
3. 배포합니다. 프로덕션에서 `DATA_MODE` 가 없으면 자동으로 `supabase` 모드가 되며, 필요한 키가 없으면 API 가 500 을 반환합니다(실수로 Mock 이 켜지지 않음).

---

## 화면

| 경로 | 내용 |
| --- | --- |
| `/` | 하늘 홈. 화면 크기에 맞춰 모바일 최대 12개·데스크톱 최대 30개 구름을 겹치지 않게 배치, “다른 구름 보기”로 순환, 빈 하늘/오류/로딩 상태 |
| `/write` | 고민 작성 (500자, 실시간 글자 수, 익명·24시간 안내, 미리보기, 게시 전 공개 범위 확인, 기기 내 임시 저장) |
| `/sent` | 게시 완료: 구름이 하늘로 올라가는 1.6초 애니메이션 + 안내 문구 |
| `/thoughts/[id]` | 상세: 본문, 경과/남은 시간, 공감 2종(별빛 피드백), ⋯ 메뉴 → 신고, 만료·삭제 안내, 작성자에게만 받은 공감 수 |
| `/about` | 익명성·24시간·신고/보존·남용 방지 정책, 위기 상황 연락처 |

## API

모든 오류는 `{ "error": { "code", "message", "fields?" } }` 형식이며 `Cache-Control: no-store` 입니다.

| 메서드·경로 | 성공 | 주요 실패 |
| --- | --- | --- |
| `GET /api/thoughts?limit=1..50&cursor=` | 200 `{ thoughts, nextCursor, serverNow }` | 400 |
| `POST /api/thoughts` `{ content }` | 201 `{ thought }` | 403 교차 출처, 415, 422 검증, 429 |
| `GET /api/thoughts/:id` | 200 `{ thought, viewer, serverNow }` | 404 없음/비공개, 410 만료 |
| `POST /api/thoughts/:id/reactions` `{ type: "been_there" \| "lighter" }` | 201 신규 / 200 `alreadyReacted: true` | 404, 410, 422, 429 |
| `POST /api/thoughts/:id/reports` `{ reason }` | 201 `received` / 200 `already_reported` | 404, 410, 422, 429 |

운영자 전용 API 는 공개 라우트에 존재하지 않습니다.

## 익명성 · 보안

- **입력 검증**: Zod 로 서버에서 재검증 (NFC 정규화, 제어문자·보이지 않는 문자 제거, 공백만 입력 거부, 코드 포인트 기준 500자). 본문 8KB 상한, JSON 만 허용.
- **XSS**: 본문은 항상 React 텍스트 노드로 렌더링 (`dangerouslySetInnerHTML` 미사용). 보안 헤더(`nosniff`, `X-Frame-Options: DENY` 등) 적용.
- **CSRF**: 쓰기 요청은 `Origin` 이 호스트와 다르면 403, 쿠키는 `SameSite=Lax; HttpOnly; Secure(프로덕션)`.
- **익명 식별값**: 서버가 `랜덤ID.HMAC서명` 쿠키를 발급·검증합니다. DB 에는 원본이 아닌 별도 HMAC 해시만 저장됩니다. localStorage 에 의존하지 않습니다.
- **요청 제한**: 작성(10분 5회/식별값, 10회/IP), 공감(10분 40/80회), 신고(1시간 10/20회). Supabase 모드에서는 DB 기반이라 서버리스 인스턴스 간에 공유됩니다. IP 는 HMAC 해시로만, 최대 1일 보관됩니다.
- **로그**: 예상치 못한 오류는 메시지만 기록하며 본문·토큰·IP 를 남기지 않습니다.
- **서비스 키**: `lib/supabase/server.ts` 는 `server-only` 로 보호되어 클라이언트 번들에 포함될 수 없습니다.

## 24시간 만료 및 데이터 보존 정책

| 대상 | 공개 화면 | 실제 삭제 |
| --- | --- | --- |
| 일반 고민 원문 | `expires_at`(서버 `now()`) 이후 목록·상세·공감·신고 모두 거부 | 만료 후 다음 정리 작업(≤10분)에서 삭제 |
| 공감 기록 | — | 게시물 삭제 시 `ON DELETE CASCADE` |
| 신고된 고민 원문 | 3건 이상 신고 시 즉시 비공개(`under_review`), 만료 시 비공개 | 검토 목적에 한해 **만료 후 최대 7일** 보존 후 삭제 |
| 신고 기록 (사유·시각·신고자 해시) | 비공개 | 30일 후 삭제. 게시물 삭제 시 원문과의 연결 해제(`SET NULL`) |
| 요청 제한 기록 (해시) | 비공개 | 1일 후 삭제 |

원문은 다른 테이블이나 로그로 복사되지 않습니다.

## 테스트

`npm test` — 5개 파일, 38개 테스트 (Mock 저장소와 실제 Route Handler 를 직접 호출)

- 검증: 정상 작성, 빈/공백/보이지 않는 문자 거부, 500자 경계(한글·이모지), 잘못된 유형·사유
- API: 201 작성·쿠키 발급, 클라이언트 만료 시각 무시, 422/400/415/403/429, 목록 노출·만료 후 제외, 상세 200/410/404, 중복·동시 공감 비집계, 위조 쿠키 무시, 신고 접수·중복, 작성자에게만 공감 수 노출
- 저장소: 24시간 경계, 신고 3건 비공개, 신고 글 7일 보존 후 삭제, 커서 페이지네이션·크기 상한
- 배치: 360~1920px 에서 구름 겹침 없음·영역 내 배치·부유 주기 12~24초

**실행하지 못한 검증**: 실제 Supabase 인스턴스에 대한 마이그레이션 적용·RLS·RPC 통합 테스트는 접속 정보가 없어 실행하지 않았습니다. 연결 후 SQL Editor 에서 `anon` 역할로 `select * from thoughts` 가 거부되는지 확인하는 것을 권장합니다.

## 아직 구현되지 않은 것 · 운영 시 주의

- **운영자 검토 도구 없음**: 신고는 DB 에 기록되고 3건 이상이면 자동 비공개되지만, 검토·복구·삭제 UI 와 운영자 인증은 아직 없습니다. 현재는 Supabase Dashboard 에서 직접 `status`/`moderation_status` 를 변경해야 합니다. 화면에서도 “즉시 처리되지 않을 수 있다”고 안내합니다.
- **익명 중복 방지의 한계**: 쿠키를 지우거나 다른 브라우저를 쓰면 새 식별값이 발급됩니다. IP 해시 기반 요청 제한으로 남용을 완화할 뿐 완전히 막지는 못합니다.
- **IP 신뢰**: `x-forwarded-for` 첫 값을 사용합니다. Vercel 처럼 프록시가 이 헤더를 덮어쓰는 환경을 전제로 합니다.
- **콘텐츠 필터 없음**: 욕설·개인정보 자동 감지는 없습니다. 위기 표현 감지 시 도움 안내 같은 기능도 향후 과제입니다.
- **작성자 삭제 기능 없음**: 작성자가 직접 글을 내리는 기능은 없습니다(24시간 후 자동 삭제).
- Mock 모드는 단일 프로세스 메모리 기반이라 시연 용도로만 사용하세요.

## 디렉터리 구조

```
app/                    페이지 및 API 라우트
components/sky/         하늘 배경, 구름 모양, 구름 배치·부유
components/thoughts/    작성 폼, 미리보기, 상세, 공감, 신고, 완료 화면
components/ui/          Button, Card, Modal, Textarea, Toast
components/layout/      페이지 셸, 체험 모드 배너
lib/validation/         Zod 스키마
lib/repositories/       저장소 인터페이스 + Supabase / Mock 구현
lib/security/           익명 토큰, 요청 제한
lib/supabase/           서버 전용 Supabase 클라이언트
lib/sky/                구름 배치 알고리즘
types/                  도메인·API 타입
supabase/migrations/    SQL 마이그레이션
tests/                  Vitest
```
