"use client";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/app/components/admin-shell";
import StatusFilter from "@/app/components/status-filter";
import RemoveRecord from "@/app/components/remove-record";
import { createClient } from "@/lib/supabase";

type Status="draft"|"completed"|"returned"|"under_review"|"closed";
type JobRow={id:string;job_number:number;invoice_number:string|null;status:Status;service_date:string;updated_at:string;customers:{name:string;address:string|null}|null;sites:{name:string}|null;profiles:{full_name:string}|null;job_vehicles:{count:number}[]};
const labels:Record<Status,string>={draft:"Open",completed:"Open",returned:"Open",under_review:"Open",closed:"Closed"};

export default function Dashboard(){
 const [jobs,setJobs]=useState<JobRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[query,setQuery]=useState(""),[filter,setFilter]=useState("all");
 useEffect(()=>{(async()=>{const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/";return}const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();if(profile?.role!=="admin"){window.location.replace("/field");return}const {data,error}=await supabase.from("jobs").select("id,job_number,invoice_number,status,service_date,updated_at,customers(name,address),sites(name),profiles!jobs_technician_id_fkey(full_name),job_vehicles(count)").is("removed_at",null).order("updated_at",{ascending:false});if(error)setError(error.message);else setJobs((data||[]) as unknown as JobRow[]);setLoading(false)})()},[]);
 const shown=useMemo(()=>jobs.filter(j=>(filter==="all"||(filter==="open"?j.status!=="closed":j.status==="closed"))&&`${j.job_number} ${j.invoice_number||""} ${j.customers?.name} ${j.sites?.name} ${j.profiles?.full_name}`.toLowerCase().includes(query.toLowerCase())),[jobs,query,filter]);
 const open=jobs.filter(j=>j.status!=="closed").length,closed=jobs.filter(j=>j.status==="closed").length;

 return <AdminShell><main className="content"><header><div><p className="eyebrow">OPERATIONS</p><h1>Job cards</h1><p className="muted">Your field visits, most recently updated first.</p></div><a className="button" href="/jobs/new">+ New job card</a></header>
  <div className="stats two-stats"><button className="stat-card" aria-pressed={filter==="open"} onClick={()=>setFilter("open")}><span>Open jobs</span><strong>{loading?"—":open}</strong></button><button className="stat-card" aria-pressed={filter==="closed"} onClick={()=>setFilter("closed")}><span>Closed jobs</span><strong>{loading?"—":closed}</strong></button></div>
  <div className="toolbar"><input type="search" aria-label="Search job cards" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer, job number or invoice"/><StatusFilter value={filter} onChange={setFilter}/></div>
  {error?<div className="notice error">{error}</div>:loading?<div className="notice">Loading job cards…</div>:<div className="table"><div className="row job-row heading"><span>Job card</span><span>Customer / address</span><span>Date</span><span>Cars</span><span>Status</span><span>Actions</span></div>{shown.length===0?<div className="empty-table">No job cards match this view.</div>:shown.map(job=><div className="row job-row" key={job.id}><a className="job-link" href={`/jobs/${job.id}`}><strong>#{String(job.job_number)}</strong></a><a className="job-link job-customer" href={`/jobs/${job.id}`}>{job.customers?.name||"Unknown customer"}<small>{[job.customers?.address,job.profiles?.full_name].filter(Boolean).join(" · ")}</small></a><span className="job-date">{new Date(job.service_date+"T12:00:00").toLocaleDateString("en-ZA",{day:"2-digit",month:"short",year:"numeric"})}</span><span className="job-count">{job.job_vehicles?.[0]?.count||0}<span className="mobile-only"> cars</span></span><span className="job-status"><em className={`pill ${job.status.replace("_","-")}`}>{labels[job.status]}</em></span><div className="table-actions"><a className="table-action" href={`/jobs/${job.id}`}>Edit</a><a className="table-action report" href={`/jobs/${job.id}/job-report`}>View PDF</a><RemoveRecord table="jobs" id={job.id} label={`job card #${job.job_number}`} onRemoved={()=>setJobs(all=>all.filter(j=>j.id!==job.id))}/></div></div>)}</div>}
  </main></AdminShell>
}
