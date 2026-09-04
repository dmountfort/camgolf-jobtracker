begin;
-- Keep existing cards unchanged. New cards begin at 2338, or above any later
-- number already assigned. Reapplying this migration never rewinds the counter.
lock table public.jobs in share row exclusive mode;
create or replace function public.next_job_card_number() returns bigint
language plpgsql security definer set search_path=pg_catalog,public as $$
declare candidate bigint; highest bigint;
begin
 perform pg_advisory_xact_lock(2338,11001);
 select coalesce(max(job_number),0) into highest from public.jobs;
 candidate := nextval('public.job_card_number_seq');
 if candidate <= highest or candidate < 2338 then
  candidate := greatest(highest+1,2338);
  perform setval('public.job_card_number_seq',candidate,true);
 end if;
 return candidate;
end $$;
revoke all on function public.next_job_card_number() from public;
grant execute on function public.next_job_card_number() to authenticated;
alter table public.jobs alter column job_number set default public.next_job_card_number();
select setval('public.job_card_number_seq',
 greatest(2338,coalesce((select max(job_number)+1 from public.jobs),2338),
 (select last_value+case when is_called then 1 else 0 end from public.job_card_number_seq)),false);
commit;
