begin;
insert into storage.buckets(id,name,public) values('job-evidence','job-evidence',false)
on conflict(id) do update set public=false;
-- Read by assigned job, not just the original uploader (jobs can be reassigned).
drop policy if exists "users read own job evidence" on storage.objects;
create policy "users read own job evidence" on storage.objects for select to authenticated using(
 bucket_id='job-evidence' and (public.is_admin() or exists(
 select 1 from public.jobs j where j.id::text=(storage.foldername(name))[2] and j.technician_id=auth.uid()
 )));
drop policy if exists "users upload own job evidence" on storage.objects;
create policy "users upload own job evidence" on storage.objects for insert to authenticated with check(
 bucket_id='job-evidence' and (storage.foldername(name))[1]=auth.uid()::text and exists(
 select 1 from public.jobs j where j.id::text=(storage.foldername(name))[2]
 and (public.is_admin() or (j.technician_id=auth.uid() and j.status<>'closed'))));
drop policy if exists "users update own job evidence" on storage.objects;
create policy "users update own job evidence" on storage.objects for update to authenticated using(
 bucket_id='job-evidence' and exists(select 1 from public.jobs j where j.id::text=(storage.foldername(name))[2]
 and (public.is_admin() or (j.technician_id=auth.uid() and j.status<>'closed'))))
 with check(bucket_id='job-evidence' and exists(select 1 from public.jobs j where j.id::text=(storage.foldername(name))[2]
 and (public.is_admin() or (j.technician_id=auth.uid() and j.status<>'closed'))));
drop policy if exists "users delete own job evidence" on storage.objects;
create policy "users delete own job evidence" on storage.objects for delete to authenticated using(
 bucket_id='job-evidence' and exists(select 1 from public.jobs j where j.id::text=(storage.foldername(name))[2]
 and (public.is_admin() or (j.technician_id=auth.uid() and j.status<>'closed'))));
commit;
