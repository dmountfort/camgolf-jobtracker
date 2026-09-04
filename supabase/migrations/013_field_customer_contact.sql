begin;
-- Narrow permission: technicians may edit only contact fields for a customer
-- attached to their own open job. The normal job save remains security invoker.
create or replace function public.save_field_customer_contact(job_id_input uuid, contact jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.jobs%rowtype; address_value text; sid uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='technician' and active) then raise exception 'Active technician login required'; end if;
 select * into j from public.jobs where id=job_id_input for update;
 if not found or j.technician_id<>auth.uid() or j.status='closed' or j.removed_at is not null then raise exception 'Job is closed or not assigned to you'; end if;
 if jsonb_typeof(contact) is distinct from 'object' then raise exception 'Invalid contact details'; end if;
 if exists(select 1 from jsonb_each(contact) e where e.key not in ('telephone','email','address') or jsonb_typeof(e.value) not in ('string','null')) then raise exception 'Only phone, email and address can be changed'; end if;
 if contact='{}'::jsonb then return; end if;
 if length(contact->>'telephone')>100 or length(contact->>'email')>254 or length(contact->>'address')>2000 then raise exception 'Contact details are too long'; end if;
 update public.customers set
  telephone=case when contact ? 'telephone' then nullif(trim(contact->>'telephone'),'') else telephone end,
  email=case when contact ? 'email' then nullif(trim(contact->>'email'),'') else email end,
  address=case when contact ? 'address' then nullif(trim(contact->>'address'),'') else address end
 where id=j.customer_id and removed_at is null returning address into address_value;
 if not found then raise exception 'Customer is unavailable'; end if;
 if contact ? 'address' then
  select id into sid from public.sites where customer_id=j.customer_id and name=coalesce(address_value,'') limit 1;
  if sid is null then insert into public.sites(customer_id,name,address) values(j.customer_id,coalesce(address_value,''),address_value) returning id into sid; end if;
  update public.jobs set site_id=sid where id=j.id;
 end if;
end $$;
revoke all on function public.save_field_customer_contact(uuid,jsonb) from public;
grant execute on function public.save_field_customer_contact(uuid,jsonb) to authenticated;

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
 if found and (existing.removed_at is not null or existing.technician_id<>uid or existing.status='closed') then raise exception 'Job is closed or not assigned to you'; end if;
 select id,address into cid,address_value from public.customers where lower(name)=lower(cname) and (removed_at is null or id=existing.customer_id) limit 1;
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
  if nullif(car->>'amp_hours','')::numeric < 0 then raise exception 'AMP hours cannot be negative'; end if;
  insert into public.job_vehicles(id,job_id,unit_number,serial_number,work_performed,attention_notes,sort_order,model,amp_hours)
  values(car_id,jid,trim(car->>'unit_number'),nullif(trim(car->>'serial_number'),''),trim(car->>'work_performed'),car->>'attention_notes',position,nullif(trim(car->>'model'),''),nullif(car->>'amp_hours','')::numeric)
  on conflict(id) do update set unit_number=excluded.unit_number,serial_number=excluded.serial_number,
   work_performed=excluded.work_performed,attention_notes=excluded.attention_notes,sort_order=excluded.sort_order,model=excluded.model,amp_hours=excluded.amp_hours
  where job_vehicles.job_id=jid;
  position:=position+1;
 end loop;
 delete from public.job_vehicles where job_id=jid and not(id=any(car_ids));
 if payload ? 'customer_contact' then perform public.save_field_customer_contact(jid,payload->'customer_contact'); end if;
 return jid;
end $$;
revoke all on function public.save_field_job(jsonb) from public;
grant execute on function public.save_field_job(jsonb) to authenticated;

commit;
