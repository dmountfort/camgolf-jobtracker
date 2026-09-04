"use client";
import {useEffect,useRef,useState} from "react";
import {createClient} from "@/lib/supabase";
export default function RemoveRecord({table,id,label,onRemoved}:{table:"jobs"|"customers"|"parts";id:string;label:string;onRemoved?:()=>void}){
 const menu=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const close=(e:PointerEvent)=>{if(menu.current&&!menu.current.contains(e.target as Node))menu.current.open=false};const escape=(e:KeyboardEvent)=>{if(e.key==="Escape"&&menu.current?.open){menu.current.open=false;menu.current.querySelector("summary")?.focus()}};document.addEventListener("pointerdown",close);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",escape)}},[]);
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function remove(){if(!confirm("Remove "+label+"? It will be hidden from active lists. Historical data and photos will be retained."))return;setBusy(true);setError("");const result=await createClient().from(table).update({removed_at:new Date().toISOString()}).eq("id",id).select("id").single();if(result.error){setError(result.error.message);setBusy(false)}else if(onRemoved)onRemoved();else window.location.reload()}
 return <details ref={menu} className="record-menu"><summary aria-label={"More options for "+label} title="More options">···</summary><div className="record-menu-panel"><button type="button" className="danger-action" disabled={busy} onClick={remove}>{busy?"Removing…":"Remove"}</button>{error&&<span role="alert">{error}</span>}</div></details>;
}
