begin;
-- Technician requests cannot change assignment, numbering or job status.
create or replace function public.guard_technician_job() returns trigger
language plpgsql set search_path=public as $$
begin
 if auth.uid() is null or public.is_admin() then return new; end if;
 if not exists(select 1 from public.profiles where id=auth.uid() and active) then
  raise exception 'Account inactive';
 end if;
 if tg_op='INSERT' then
  if new.technician_id<>auth.uid() or new.status<>'draft' then raise exception 'Technicians can only create their own open jobs'; end if;
 else
  if old.status='closed' or old.technician_id<>auth.uid() then raise exception 'Job is closed or not assigned to you'; end if;
  if new.status is distinct from old.status or new.technician_id is distinct from old.technician_id
   or new.report_number is distinct from old.report_number or new.closed_at is distinct from old.closed_at
   or new.closed_by is distinct from old.closed_by then raise exception 'Only admin can change job status, assignment or report number'; end if;
 end if;
 return new;
end $$;
create trigger guard_technician_job before insert or update on public.jobs for each row execute function public.guard_technician_job();

drop policy "job parts access" on public.job_parts;
create policy "job parts readable" on public.job_parts for select using(exists(select 1 from public.jobs j where j.id=job_id and (j.technician_id=auth.uid() or public.is_admin())));
create policy "job parts writable" on public.job_parts for all using(exists(select 1 from public.jobs j where j.id=job_id and ((j.technician_id=auth.uid() and j.status<>'closed') or public.is_admin()))) with check(exists(select 1 from public.jobs j where j.id=job_id and ((j.technician_id=auth.uid() and j.status<>'closed') or public.is_admin())));
drop policy "job photos access" on public.job_photos;
create policy "job photos readable" on public.job_photos for select using(exists(select 1 from public.jobs j where j.id=job_id and (j.technician_id=auth.uid() or public.is_admin())));
create policy "job photos writable" on public.job_photos for all using(exists(select 1 from public.jobs j where j.id=job_id and ((j.technician_id=auth.uid() and j.status<>'closed') or public.is_admin()))) with check(exists(select 1 from public.jobs j where j.id=job_id and ((j.technician_id=auth.uid() and j.status<>'closed') or public.is_admin())));

-- Atomic save: a failure rolls back the whole job, including every car.
create or replace function public.save_field_job(payload jsonb) returns uuid
language plpgsql security invoker set search_path=public as $$
declare
 jid uuid := (payload->>'id')::uuid;
 uid uuid := auth.uid();
 existing public.jobs%rowtype;
 cid uuid; sid uuid; cname text := trim(payload->>'customer_name');
 address_value text; car jsonb; car_id uuid; car_ids uuid[] := '{}'; position integer := 0;
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and role='technician' and active) then raise exception 'Active technician login required'; end if;
 if jid is null or coalesce(cname,'')='' or coalesce(payload->>'service_date','')='' then raise exception 'Customer and date are required'; end if;
 if jsonb_typeof(payload->'cars') is distinct from 'array' then raise exception 'Add at least one car'; end if;
 if jsonb_array_length(payload->'cars')=0 then raise exception 'Add at least one car'; end if;
 if coalesce((payload->>'travelling_km')::numeric,0)<0 or coalesce((payload->>'duration_hours')::numeric,0)<0 then raise exception 'Travel and duration cannot be negative'; end if;
 -- Serialize repeat submissions of the same new-job ID.
 perform pg_advisory_xact_lock(hashtextextended(jid::text,0));
 select * into existing from public.jobs where id=jid for update;
 if found and (existing.technician_id<>uid or existing.status='closed') then raise exception 'Job is closed or not assigned to you'; end if;
 select id,address into cid,address_value from public.customers where lower(name)=lower(cname) limit 1;
 if cid is null then insert into public.customers(name) values(cname) returning id into cid; end if;
 select id into sid from public.sites where customer_id=cid and name=coalesce(address_value,'') limit 1;
 if sid is null then insert into public.sites(customer_id,name,address) values(cid,coalesce(address_value,''),address_value) returning id into sid; end if;
 if existing.id is null then
  insert into public.jobs(id,customer_id,site_id,technician_id,service_date,travelling_km,duration_hours,general_notes)
  values(jid,cid,sid,uid,(payload->>'service_date')::date,(payload->>'travelling_km')::numeric,(payload->>'duration_hours')::numeric,payload->>'general_notes');
 else
  update public.jobs set customer_id=cid,site_id=sid,service_date=(payload->>'service_date')::date,
  travelling_km=(payload->>'travelling_km')::numeric,duration_hours=(payload->>'duration_hours')::numeric,general_notes=payload->>'general_notes' where id=jid;
 end if;
 for car in select value from jsonb_array_elements(payload->'cars') loop
  if coalesce(trim(car->>'unit_number'),'')='' or coalesce(trim(car->>'work_performed'),'')='' then raise exception 'Each car needs a unit number and work performed'; end if;
  car_id:=(car->>'id')::uuid;
  if car_id is null or car_id=any(car_ids) then raise exception 'Invalid car identifier'; end if;
  car_ids:=array_append(car_ids,car_id);
  if exists(select 1 from public.job_vehicles where id=car_id and job_id<>jid) then raise exception 'Car belongs to another job'; end if;
  insert into public.job_vehicles(id,job_id,unit_number,serial_number,work_performed,attention_notes,sort_order)
  values(car_id,jid,trim(car->>'unit_number'),nullif(trim(car->>'serial_number'),''),trim(car->>'work_performed'),car->>'attention_notes',position)
  on conflict(id) do update set unit_number=excluded.unit_number,serial_number=excluded.serial_number,
   work_performed=excluded.work_performed,attention_notes=excluded.attention_notes,sort_order=excluded.sort_order
  where job_vehicles.job_id=jid;
  position:=position+1;
 end loop;
 delete from public.job_vehicles where job_id=jid and not(id=any(car_ids));
 return jid;
end $$;
revoke all on function public.save_field_job(jsonb) from public;
grant execute on function public.save_field_job(jsonb) to authenticated;
commit;
