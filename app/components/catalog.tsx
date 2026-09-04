"use client";
import {FormEvent,useEffect,useState} from "react";
import AdminShell from "./admin-shell";
import RemoveRecord from "./remove-record";
import {createClient} from "@/lib/supabase";
type Row={id:string;name?:string;address?:string;telephone?:string;email?:string;part_number?:string;description?:string;default_cost?:number|null};
export default function Catalog({kind}:{kind:"customers"|"parts"}){
 const [rows,setRows]=useState<Row[]>([]),[selected,setSelected]=useState<Row>({id:""}),[message,setMessage]=useState(""),[ready,setReady]=useState(false),[saving,setSaving]=useState(false),[query,setQuery]=useState(""),[formOpen,setFormOpen]=useState(false);
 const fields=kind==="customers"?["name","address","telephone","email"]:["part_number","description","default_cost"];
 const labels:Record<string,string>={name:"Customer name",address:"Customer address",telephone:"Telephone",email:"Email",part_number:"Part number",description:"Description",default_cost:"Unit cost"};
 async function load(){const {data,error}=await createClient().from(kind).select("*").is("removed_at",null).order(kind==="customers"?"name":"description");if(error)setMessage(error.message);else setRows(data||[])}
 useEffect(()=>{(async()=>{const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user){window.location.href="/";return}const {data}=await db.from("profiles").select("role").eq("id",user.id).single();if(data?.role!=="admin"){setMessage("Administrator access required.");return}setReady(true);await load()})()},[kind]);
 async function save(e:FormEvent){e.preventDefault();setSaving(true);setMessage("");try{const values:Record<string,unknown>={};for(const field of fields){const raw=selected[field as keyof Row];values[field]=field==="default_cost"?(raw==null||raw===""?null:Number(raw)):String(raw??"").trim()||null}const db=createClient();const result=selected.id?await db.from(kind).update(values).eq("id",selected.id).select("id").single():await db.from(kind).insert(values).select("id").single();if(result.error)throw result.error;await load();setSelected({id:""});setFormOpen(false);setMessage("Saved successfully.")}catch(e){setMessage((e as {message?:string}).message||"Unable to save.")}finally{setSaving(false)}}

 const title=kind==="customers"?"Customers":"Parts",singular=kind==="customers"?"customer":"part";
 const filtered=rows.filter(row=>fields.some(field=>String(row[field as keyof Row]??"").toLowerCase().includes(query.toLowerCase())));
 return <AdminShell><main className="content catalog-page">
 <header><div><p className="eyebrow">YOUR CATALOGUE</p><h1>{title}</h1><p className="muted">{kind==="customers"?"Saved customer details fill in automatically on job cards.":"Your parts list, ready to use on the next job."}</p></div><button disabled={!ready} onClick={()=>{setSelected({id:""});setFormOpen(true)}}>+ Add {singular}</button></header>
 {message&&<div className="notice" role="status">{message}</div>}
 {!ready&&!message&&<p role="status">Loading {kind}…</p>}
 {ready&&<>
 {formOpen&&<form onSubmit={save} className="form-section catalog-form">
 <div className="section-heading"><h2>{selected.id?"Edit":"New"} {singular}</h2><button type="button" className="secondary" disabled={saving} onClick={()=>{setSelected({id:""});setFormOpen(false)}}>Cancel</button></div>
 <div className="grid">{fields.map((field,i)=><label key={field}>{labels[field]}{(field==="name"||field==="description")?" *":""}<input autoFocus={i===0} disabled={saving} required={field==="name"||field==="description"} type={field==="default_cost"?"number":field==="email"?"email":field==="telephone"?"tel":"text"} min={field==="default_cost"?0:undefined} step={field==="default_cost"?"0.01":undefined} value={selected[field as keyof Row]??""} onChange={e=>setSelected({...selected,[field]:e.target.value})}/></label>)}</div>
 {kind==="parts"&&<p className="muted">Changing a catalogue price does not change costs on existing jobs.</p>}
 <div className="submit-row"><button disabled={saving}>{saving?"Saving…":"Save "+singular}</button></div></form>}
 <label className="catalog-search">Search {kind}<input type="search" placeholder={"Search "+kind+"…"} value={query} onChange={e=>setQuery(e.target.value)}/></label>
 <p className="result-count" role="status">{filtered.length} {kind} shown</p>
 <section className="catalog-list" aria-label={title}>{filtered.map(row=><article key={row.id} className="catalog-row"><div className="catalog-details"><strong>{row.name||row.description}</strong><p className="muted">{kind==="customers"?row.address||"No address added":[row.part_number,row.default_cost!=null?"R "+Number(row.default_cost).toFixed(2):""].filter(Boolean).join(" · ")}</p>{kind==="customers"&&<div className="catalog-contact">{row.telephone&&<a href={"tel:"+row.telephone}>{row.telephone}</a>}{row.email&&<a href={"mailto:"+row.email}>{row.email}</a>}</div>}</div><div className="table-actions"><button className="secondary" onClick={()=>{setSelected(row);setFormOpen(true);window.scrollTo({top:0,behavior:"smooth"})}}>Edit</button><RemoveRecord table={kind} id={row.id} label={row.name||row.description||"record"} onRemoved={()=>{if(selected.id===row.id){setSelected({id:""});setFormOpen(false)}load()}}/></div></article>)}{!filtered.length&&<div className="empty-table">{rows.length?"No matches. Try a different search.":"No "+kind+" added yet. Use Add "+singular+" to get started."}</div>}</section>
 </>}</main></AdminShell>;
}
