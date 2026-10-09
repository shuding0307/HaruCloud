-- ════════════════════════════════════════════════════════════════════
-- HaruCloud 초기 스키마
--  - 모든 테이블에 RLS 를 켜고 공개 역할(anon, authenticated)에는 정책을 부여하지 않는다.
--    → 브라우저에서 anon key 로 테이블을 직접 읽거나 쓸 수 없다.
--  - 애플리케이션 서버는 service_role 로 아래 RPC 함수만 호출한다.
--  - 만료 판단은 항상 DB 의 now() 를 기준으로 한다.
-- ════════════════════════════════════════════════════════════════════

create type public.thought_status as enum ('published', 'under_review', 'deleted');
create type public.moderation_status as enum ('none', 'pending', 'approved', 'removed');
create type public.reaction_type as enum ('been_there', 'lighter');
create type public.report_reason as enum ('harassment', 'privacy', 'spam', 'safety', 'other');
create type public.report_status as enum ('received', 'reviewing', 'resolved');

-- ── thoughts ───────────────────────────────────────────────────────
create table public.thoughts (
  id                 uuid primary key default gen_random_uuid(),
  content            text not null
                     check (char_length(btrim(content)) between 1 and 500),
  -- 작성자 본인 확인용 익명 식별값의 HMAC 해시 (원본 토큰·IP 아님). 공개 응답에 포함하지 않는다.
  author_token_hash  text check (author_token_hash is null or char_length(author_token_hash) <= 128),
  created_at         timestamptz not null default now(),
  expires_at         timestamptz not null default (now() + interval '24 hours'),
  status             public.thought_status not null default 'published',
  moderation_status  public.moderation_status not null default 'none',
  deleted_at         timestamptz,
  -- 신고된 게시물에 한해 검토 목적의 제한적 보존 기한 (null 이면 만료 즉시 삭제 대상)
  retain_until       timestamptz,
  constraint thoughts_expiry_is_24h check (expires_at = created_at + interval '24 hours')
);

comment on table public.thoughts is '익명 고민. 공개 수명 24시간. 만료 후 purge_expired() 로 물리 삭제.';

-- 클라이언트가 어떤 값을 넘기더라도 작성·만료 시각은 서버가 정한다.
create or replace function public.thoughts_set_server_times()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := now();
  new.expires_at := new.created_at + interval '24 hours';
  return new;
end;
$$;

create trigger thoughts_server_times
  before insert on public.thoughts
  for each row execute function public.thoughts_set_server_times();

create or replace function public.thoughts_protect_times()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := old.created_at;
  new.expires_at := old.expires_at;
  return new;
end;
$$;

create trigger thoughts_protect_times
  before update on public.thoughts
  for each row execute function public.thoughts_protect_times();

create index thoughts_expires_at_idx on public.thoughts (expires_at);
create index thoughts_public_feed_idx on public.thoughts (created_at desc, id desc)
  where status = 'published' and deleted_at is null;

-- ── reactions ──────────────────────────────────────────────────────
create table public.reactions (
  id                uuid primary key default gen_random_uuid(),
  thought_id        uuid not null references public.thoughts (id) on delete cascade,
  reaction_type     public.reaction_type not null,
  actor_token_hash  text not null check (char_length(actor_token_hash) <= 128),
  created_at        timestamptz not null default now(),
  constraint reactions_unique_per_actor unique (thought_id, reaction_type, actor_token_hash)
);

create index reactions_thought_id_idx on public.reactions (thought_id);

-- ── reports ────────────────────────────────────────────────────────
create table public.reports (
  id                    uuid primary key default gen_random_uuid(),
  -- 게시물이 삭제되어도 신고 통계(사유·시각)는 보존 기간 동안 남되 원문과의 연결은 끊긴다.
  thought_id            uuid references public.thoughts (id) on delete set null,
  reason                public.report_reason not null,
  reporter_token_hash   text not null check (char_length(reporter_token_hash) <= 128),
  created_at            timestamptz not null default now(),
  status                public.report_status not null default 'received'
);

create unique index reports_unique_per_reporter
  on public.reports (thought_id, reporter_token_hash) where thought_id is not null;
create index reports_thought_id_idx on public.reports (thought_id);
create index reports_created_at_idx on public.reports (created_at);

-- ── rate_limits (해시 키만 저장, 짧은 기간 후 삭제) ──────────────────
create table public.rate_limits (
  key           text not null check (char_length(key) <= 200),
  window_start  timestamptz not null,
  count         integer not null default 0,
  primary key (key, window_start)
);
create index rate_limits_window_idx on public.rate_limits (window_start);

-- ════════════════════════════════════════════════════════════════════
-- 권한: RLS 활성화 + 공개 역할의 테이블 권한 회수
-- ════════════════════════════════════════════════════════════════════
alter table public.thoughts    enable row level security;
alter table public.reactions   enable row level security;
alter table public.reports     enable row level security;
alter table public.rate_limits enable row level security;

alter table public.thoughts    force row level security;
alter table public.reactions   force row level security;
alter table public.reports     force row level security;
alter table public.rate_limits force row level security;

revoke all on public.thoughts, public.reactions, public.reports, public.rate_limits
  from anon, authenticated, public;

-- 정책을 만들지 않으므로 anon/authenticated 는 어떤 행도 볼 수 없다.
-- service_role 은 BYPASSRLS 속성으로 서버 측 RPC 에서만 접근한다.

-- ════════════════════════════════════════════════════════════════════
-- RPC 함수 (service_role 전용)
-- ════════════════════════════════════════════════════════════════════

create or replace function public.server_now()
returns timestamptz
language sql
stable
set search_path = ''
as $$ select now() $$;

create or replace function public.list_active_thoughts(
  p_limit integer,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (id uuid, content text, created_at timestamptz, expires_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select t.id, t.content, t.created_at, t.expires_at
  from public.thoughts t
  where t.status = 'published'
    and t.deleted_at is null
    and t.expires_at > now()
    and (
      p_before_created_at is null
      or (t.created_at, t.id) < (p_before_created_at, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
    )
  order by t.created_at desc, t.id desc
  limit least(greatest(coalesce(p_limit, 30), 1), 51);
$$;

create or replace function public.create_thought(p_content text, p_author_hash text)
returns table (id uuid, content text, created_at timestamptz, expires_at timestamptz)
language sql
volatile
set search_path = ''
as $$
  insert into public.thoughts (content, author_token_hash)
  values (p_content, p_author_hash)
  returning thoughts.id, thoughts.content, thoughts.created_at, thoughts.expires_at;
$$;

-- 상세 조회: 상태 판별 + 본인 공감 + (작성자 본인에게만) 받은 공감 수
create or replace function public.get_thought_view(p_id uuid, p_actor_hash text)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  t public.thoughts%rowtype;
  v_is_author boolean;
begin
  select * into t from public.thoughts where thoughts.id = p_id;
  if not found then
    return jsonb_build_object('state', 'not_found');
  end if;
  if t.status <> 'published' or t.deleted_at is not null then
    return jsonb_build_object('state', 'unavailable');
  end if;
  if t.expires_at <= now() then
    return jsonb_build_object('state', 'expired');
  end if;

  v_is_author := p_actor_hash is not null and t.author_token_hash = p_actor_hash;

  return jsonb_build_object(
    'state', 'active',
    'thought', jsonb_build_object(
      'id', t.id, 'content', t.content,
      'created_at', t.created_at, 'expires_at', t.expires_at
    ),
    'viewer', jsonb_build_object(
      'reactions', coalesce((
        select jsonb_agg(r.reaction_type)
        from public.reactions r
        where r.thought_id = t.id and p_actor_hash is not null and r.actor_token_hash = p_actor_hash
      ), '[]'::jsonb),
      'is_author', v_is_author,
      'received', case when v_is_author then jsonb_build_object(
        'been_there', (select count(*) from public.reactions r where r.thought_id = t.id and r.reaction_type = 'been_there'),
        'lighter',    (select count(*) from public.reactions r where r.thought_id = t.id and r.reaction_type = 'lighter')
      ) else null end
    )
  );
end;
$$;

-- 공감 등록: 서버 시각 기준 만료 검증 + 고유 제약으로 동시·중복 요청 처리
create or replace function public.add_reaction(p_thought_id uuid, p_type public.reaction_type, p_actor_hash text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  t public.thoughts%rowtype;
  v_inserted integer;
begin
  -- 공유 잠금으로 동시 삭제/상태 변경과 경합하지 않도록 한다.
  select * into t from public.thoughts where thoughts.id = p_thought_id for share;
  if not found then return 'not_found'; end if;
  if t.status <> 'published' or t.deleted_at is not null then return 'unavailable'; end if;
  if t.expires_at <= now() then return 'expired'; end if;

  insert into public.reactions (thought_id, reaction_type, actor_token_hash)
  values (p_thought_id, p_type, p_actor_hash)
  on conflict on constraint reactions_unique_per_actor do nothing;
  get diagnostics v_inserted = row_count;

  return case when v_inserted = 1 then 'created' else 'duplicate' end;
end;
$$;

-- 신고 접수: 중복 신고 방지, 신고된 글은 검토용으로 제한 보존, 누적 신고 시 임시 비공개
create or replace function public.create_report(p_thought_id uuid, p_reason public.report_reason, p_reporter_hash text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  t public.thoughts%rowtype;
  v_inserted integer;
  v_total integer;
begin
  select * into t from public.thoughts where thoughts.id = p_thought_id for update;
  if not found then return 'not_found'; end if;
  if t.status <> 'published' or t.deleted_at is not null then return 'unavailable'; end if;
  if t.expires_at <= now() then return 'expired'; end if;

  insert into public.reports (thought_id, reason, reporter_token_hash)
  values (p_thought_id, p_reason, p_reporter_hash)
  on conflict (thought_id, reporter_token_hash) where thought_id is not null do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return 'duplicate'; end if;

  select count(*) into v_total from public.reports where thought_id = p_thought_id;

  update public.thoughts
     set moderation_status = 'pending',
         retain_until = t.expires_at + interval '7 days',
         status = case when v_total >= 3 then 'under_review'::public.thought_status else status end
   where id = p_thought_id;

  return 'created';
end;
$$;

-- 고정 윈도 요청 제한. 허용되면 true.
create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
-- 만료 데이터 정리 (Supabase Cron 에서 주기적으로 호출)
--  1) 만료 + 보존 기한 없음/경과 → 원문 삭제 (reactions 는 cascade 삭제)
--  2) 신고 기록은 30일 후 삭제 (원문과의 연결은 게시물 삭제 시 이미 끊김)
--  3) 요청 제한 기록은 1일 후 삭제
-- ════════════════════════════════════════════════════════════════════
create or replace function public.purge_expired()
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_thoughts integer;
  v_reports integer;
  v_limits integer;
begin
  delete from public.thoughts
   where expires_at <= now()
     and (retain_until is null or retain_until <= now());
  get diagnostics v_thoughts = row_count;

  delete from public.reports where created_at < now() - interval '30 days';
  get diagnostics v_reports = row_count;

  delete from public.rate_limits where window_start < now() - interval '1 day';
  get diagnostics v_limits = row_count;

  return jsonb_build_object('thoughts', v_thoughts, 'reports', v_reports, 'rate_limits', v_limits);
end;
$$;

-- 함수 실행 권한: service_role 만 허용
revoke execute on function
  public.server_now(),
  public.list_active_thoughts(integer, timestamptz, uuid),
  public.create_thought(text, text),
  public.get_thought_view(uuid, text),
  public.add_reaction(uuid, public.reaction_type, text),
  public.create_report(uuid, public.report_reason, text),
  public.hit_rate_limit(text, integer, integer),
  public.purge_expired(),
  public.thoughts_set_server_times(),
  public.thoughts_protect_times()
from public, anon, authenticated;

grant execute on function
  public.server_now(),
  public.list_active_thoughts(integer, timestamptz, uuid),
  public.create_thought(text, text),
  public.get_thought_view(uuid, text),
  public.add_reaction(uuid, public.reaction_type, text),
  public.create_report(uuid, public.report_reason, text),
  public.hit_rate_limit(text, integer, integer),
  public.purge_expired()
to service_role;

grant select, insert, update, delete on public.thoughts, public.reactions, public.reports, public.rate_limits
  to service_role;
grant usage on type public.thought_status, public.moderation_status, public.reaction_type,
  public.report_reason, public.report_status to service_role;
