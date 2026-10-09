-- ════════════════════════════════════════════════════════════════════
-- 건의·문의·피드백 의견함
--  - 익명: 연락처를 받지 않고, 보낸 사람은 익명 식별값의 HMAC 해시로만 남긴다 (중복·남용 확인용)
--  - 공개 역할(anon, authenticated)은 접근 불가, 서버(service_role)는 RPC 로만 쓴다
--  - 180일 뒤 purge_expired() 에서 자동 삭제
-- ════════════════════════════════════════════════════════════════════

create type public.feedback_category as enum ('suggestion', 'question', 'bug', 'other');

create table public.feedback (
  id                 uuid primary key default gen_random_uuid(),
  category           public.feedback_category not null,
  message            text not null check (char_length(btrim(message)) between 1 and 1000),
  sender_token_hash  text check (sender_token_hash is null or char_length(sender_token_hash) <= 128),
  created_at         timestamptz not null default now()
);

comment on table public.feedback is '건의·문의·피드백. 운영자만 확인. 180일 뒤 삭제.';

create index feedback_created_at_idx on public.feedback (created_at);

alter table public.feedback enable row level security;
alter table public.feedback force row level security;
revoke all on public.feedback from anon, authenticated, public;
grant select, insert, update, delete on public.feedback to service_role;
grant usage on type public.feedback_category to service_role;

create or replace function public.create_feedback(
  p_category public.feedback_category,
  p_message text,
  p_sender_hash text
)
returns void
language sql
volatile
set search_path = ''
as $$
  insert into public.feedback (category, message, sender_token_hash)
  values (p_category, p_message, p_sender_hash);
$$;

revoke execute on function public.create_feedback(public.feedback_category, text, text) from public, anon, authenticated;
grant execute on function public.create_feedback(public.feedback_category, text, text) to service_role;

-- 정리 작업에 의견함 보존 기한(180일)을 추가한다 (반환 형식에 feedback 개수 추가)
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
  v_feedback integer;
begin
  delete from public.thoughts
   where expires_at <= now()
     and (retain_until is null or retain_until <= now());
  get diagnostics v_thoughts = row_count;

  delete from public.reports where created_at < now() - interval '30 days';
  get diagnostics v_reports = row_count;

  delete from public.rate_limits where window_start < now() - interval '1 day';
  get diagnostics v_limits = row_count;

  delete from public.feedback where created_at < now() - interval '180 days';
  get diagnostics v_feedback = row_count;

  return jsonb_build_object('thoughts', v_thoughts, 'reports', v_reports, 'rate_limits', v_limits, 'feedback', v_feedback);
end;
$$;

revoke execute on function public.purge_expired() from public, anon, authenticated;
grant execute on function public.purge_expired() to service_role;
