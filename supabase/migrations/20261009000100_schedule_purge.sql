-- ════════════════════════════════════════════════════════════════════
-- Supabase Cron(pg_cron)으로 10분마다 만료 데이터를 물리 삭제한다.
-- 공개 목록/상세/공감은 이미 now() 기준으로 만료를 거부하므로,
-- 이 작업은 "숨김"이 아니라 "실제 삭제"를 담당한다.
--
-- pg_cron 확장을 사용할 수 없는 환경이라면 Dashboard → Integrations → Cron 에서
-- 같은 SQL(select public.purge_expired();)을 예약 작업으로 등록하세요.
-- ════════════════════════════════════════════════════════════════════
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid)
  from cron.job
 where jobname = 'harucloud-purge-expired';

select cron.schedule(
  'harucloud-purge-expired',
  '*/10 * * * *',
  $$ select public.purge_expired(); $$
);
