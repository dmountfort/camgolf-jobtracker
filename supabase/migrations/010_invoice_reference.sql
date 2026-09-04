begin;
alter table public.jobs add column invoice_number text;
create or replace function public.guard_technician_job() returns trigger
language plpgsql set search_path=public as $$
begin
 if auth.uid() is null or public.is_admin() then return new; end if;
 if not exists(select 1 from public.profiles where id=auth.uid() and active) then
  raise exception 'Account inactive';
 end if;
 if tg_op='INSERT' then
  if new.invoice_number is not null or new.removed_at is not null or new.technician_id<>auth.uid() or new.status<>'draft' then raise exception 'Technicians can only create their own open jobs'; end if;
 else
  if old.removed_at is not null or old.status='closed' or old.technician_id<>auth.uid() then raise exception 'Job is closed or not assigned to you'; end if;
  if new.invoice_number is distinct from old.invoice_number or new.job_number is distinct from old.job_number or new.removed_at is distinct from old.removed_at or new.status is distinct from old.status or new.technician_id is distinct from old.technician_id
   or new.report_number is distinct from old.report_number or new.closed_at is distinct from old.closed_at
   or new.closed_by is distinct from old.closed_by then raise exception 'Only admin can change job status, assignment or report number'; end if;
 end if;
 return new;
end $$;

commit;
