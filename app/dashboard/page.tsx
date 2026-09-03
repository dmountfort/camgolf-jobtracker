"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type Status="draft"|"completed"|"returned"|"under_review"|"closed";
type JobRow={id:string;report_number:string;status:Status;service_date:string;updated_at:string;customers:{name:string}|null;sites:{name:string}|null;profiles:{full_name:string}|null;job_vehicles:{count:number}[]};
const labels:Record<Status,string>={draft:"Draft",completed:"Completed",returned:"Returned",under_review:"Under review",closed:"Closed"};

export default function Dashboard(){
 const [jobs,setJobs]=useState<JobRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[query,setQuery]=useState(""),[filter,setFilter]=useState("all");
 useEffect(()=>{(async()=>{const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/";return}const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();if(profile?.role!=="admin"){setError("This dashboard is available to administrators only.");setLoading(false);return}const {data,error}=await supabase.from("jobs").select("id,report_number,status,service_date,updated_at,customers(name),sites(name),profiles!jobs_technician_id_fkey(full_name),job_vehicles(count)").order("updated_at",{ascending:false});if(error)setError(error.message);else setJobs((data||[]) as unknown as JobRow[]);setLoading(false)})()},[]);
 const shown=useMemo(()=>jobs.filter(j=>(filter==="all"||j.status===filter)&&`${j.report_number} ${j.customers?.name} ${j.sites?.name} ${j.profiles?.full_name}`.toLowerCase().includes(query.toLowerCase())),[jobs,query,filter]);
 const open=jobs.filter(j=>j.status!=="closed").length,closed=jobs.filter(j=>j.status==="closed").length;
 async function signOut(){await createClient().auth.signOut();window.location.href="/"}
 return <main className="app-shell">
  <aside><div className="logo">CG <span>CAM GOLF</span></div><nav><a className="active">Job cards</a><a>Customers</a><a>Vehicles</a><a>Parts</a><a>Team</a></nav><button className="nav-signout" onClick={signOut}>Sign out</button></aside>
  <section className="content"><header><div><p className="eyebrow">OPERATIONS</p><h1>Job cards</h1><p className="muted">Live field work from Supabase.</p></div><a className="button" href="/jobs/new">+ New job card</a></header>
  <div className="stats two-stats"><article><span>Open jobs</span><strong>{open}</strong></article><article><span>Closed</span><strong>{closed}</strong></article></div>
  <div className="toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer, site, technician or report"/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All statuses</option>{Object.entries(labels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></div>
  {error?<div className="notice error">{error}</div>:loading?<div className="notice">Loading live job cards…</div>:<div className="table"><div className="row job-row heading"><span>Report</span><span>Customer / site</span><span>Date</span><span>Cars</span><span>Status</span><span>Actions</span></div>{shown.length===0?<div className="empty-table">No job cards match this view.</div>:shown.map(job=><div className="row job-row" key={job.id}><a className="job-link" href={`/jobs/${job.id}`}><strong>#{String(job.report_number)}</strong></a><a className="job-link" href={`/jobs/${job.id}`}>{job.customers?.name||"Unknown customer"}<small>{job.sites?.name||"Unknown site"} · {job.profiles?.full_name||"Technician"}</small></a><span>{new Date(job.service_date).toLocaleDateString("en-ZA",{day:"2-digit",month:"short",year:"numeric"})}</span><span>{job.job_vehicles?.[0]?.count||0}</span><span><em className={`pill ${job.status.replace("_","-")}`}>{labels[job.status]}</em></span><div className="table-actions"><a className="table-action" href={`/jobs/${job.id}`}>Edit</a><a className="table-action report" href={`/jobs/${job.id}/report`}>EZGO report</a></div></div>)}</div>}
  </section>
 </main>
}
