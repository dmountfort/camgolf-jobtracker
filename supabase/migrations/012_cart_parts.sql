begin;
-- Replace parts atomically: a failed line must never erase existing job parts.
create or replace function public.replace_admin_job_parts(job_id_input uuid, lines jsonb)
returns void language plpgsql security invoker set search_path=public as $$
begin
 if not public.is_admin() or not exists(select 1 from public.profiles where id=auth.uid() and active) then
  raise exception 'Administrator access required';
 end if;
 perform 1 from public.jobs where id=job_id_input and removed_at is null for update;
 if not found then raise exception 'Job is unavailable'; end if;
 if lines is null or jsonb_typeof(lines)<>'array' then raise exception 'Parts must be a list'; end if;
 if exists(
  select 1 from jsonb_to_recordset(lines) as p(job_vehicle_id uuid)
  where p.job_vehicle_id is not null and not exists(
   select 1 from public.job_vehicles v where v.id=p.job_vehicle_id and v.job_id=job_id_input
  )
 ) then raise exception 'Each part must belong to a cart on this job'; end if;
 if exists(select 1 from jsonb_to_recordset(lines) as p(description text,quantity numeric,unit_cost numeric)
  where nullif(trim(p.description),'') is null or p.quantity is null or p.quantity<=0 or p.unit_cost is null or p.unit_cost<0
 ) then raise exception 'Check part description, quantity and cost'; end if;
 delete from public.job_parts where job_id=job_id_input;
 insert into public.job_parts(job_id,job_vehicle_id,part_id,description,quantity,unit_cost)
 select job_id_input,p.job_vehicle_id,p.part_id,trim(p.description),p.quantity,p.unit_cost
 from jsonb_to_recordset(lines) as p(job_vehicle_id uuid,part_id uuid,description text,quantity numeric,unit_cost numeric);
end $$;
revoke all on function public.replace_admin_job_parts(uuid,jsonb) from public;
grant execute on function public.replace_admin_job_parts(uuid,jsonb) to authenticated;
commit;
