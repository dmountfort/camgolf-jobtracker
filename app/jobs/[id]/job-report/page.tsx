"use client";
import {useEffect,useRef,useState} from "react";
import {useParams} from "next/navigation";
import {createClient} from "@/lib/supabase";
import {createJobCardPdf,type JobCardData} from "@/lib/job-card-pdf";
export default function JobCardReport(){
 const {id}=useParams<{id:string}>(),[url,setUrl]=useState(""),[number,setNumber]=useState(""),[error,setError]=useState("");
 const frame=useRef<HTMLIFrameElement>(null);
 useEffect(()=>{let active=true,blobUrl="";(async()=>{try{const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user){window.location.replace("/");return}const {data:profile}=await db.from("profiles").select("role,active").eq("id",user.id).single();if(!profile?.active||profile.role!=="admin"){window.location.replace("/field");return}
 const {data,error}=await db.from("jobs").select("job_number,report_number,service_date,travelling_km,duration_hours,general_notes,customers(name,address,telephone,email),profiles!jobs_technician_id_fkey(full_name),job_vehicles(model,unit_number,serial_number,amp_hours,work_performed,attention_notes,sort_order),job_parts(description,quantity,unit_cost,parts(part_number))").eq("id",id).is("removed_at",null).single();if(error)throw error;
 const job=data as unknown as JobCardData;job.job_vehicles.sort((a:any,b:any)=>a.sort_order-b.sort_order);const bytes=await createJobCardPdf(job);blobUrl=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:"application/pdf"}));if(active){setUrl(blobUrl);setNumber(String(job.job_number))}else URL.revokeObjectURL(blobUrl);
 }catch(e){if(active)setError((e as Error).message)}})();return()=>{active=false;if(blobUrl)URL.revokeObjectURL(blobUrl)}},[id]);
 function print(){try{frame.current?.contentWindow?.focus();frame.current?.contentWindow?.print()}catch{window.open(url,"_blank","noopener,noreferrer")}}
 return <main className="report-shell"><div className="report-toolbar"><div><a href="/dashboard">← Job cards</a><h1>Job card #{number}</h1><p className="muted">The preview below is the exact downloadable PDF.</p></div><div className="report-actions"><a className="secondary button-link" href={"/jobs/"+id}>Edit job</a>{url&&<><button type="button" onClick={print}>Print</button><a className="button" href={url} download={"CAMGolf-Job-"+number+".pdf"}>Download PDF</a></>}</div></div>{error?<p className="notice error">{error}</p>:url?<><iframe ref={frame} title="CAM Golf job card PDF preview" src={url} style={{width:"100%",height:"85vh",border:"1px solid #ccc"}}/><p><a href={url} target="_blank" rel="noreferrer">Open PDF in a new tab</a> if your browser does not show the preview or print dialog.</p></>:<p role="status">Preparing job card PDF…</p>}</main>
}
