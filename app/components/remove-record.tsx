"use client";
import {useState} from "react";
import {createClient} from "@/lib/supabase";
export default function RemoveRecord({table,id,label,onRemoved}:{table:"jobs"|"customers"|"parts";id:string;label:string;onRemoved?:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function remove(){if(!confirm("Remove "+label+"? It will be hidden from active lists. Historical data and photos will be retained."))return;setBusy(true);setError("");const result=await createClient().from(table).update({removed_at:new Date().toISOString()}).eq("id",id).select("id").single();if(result.error){setError(result.error.message);setBusy(false)}else if(onRemoved)onRemoved();else window.location.reload()}
 return <span><button type="button" className="secondary" disabled={busy} onClick={remove}>{busy?"Removing…":"Remove"}</button>{error&&<span role="alert">{error}</span>}</span>;
}
