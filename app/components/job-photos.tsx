"use client";
import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from "react";
import {createClient} from "@/lib/supabase";
type Pending={id:string;file:Blob;url:string;name:string;path?:string;uploaded?:boolean;done?:boolean};
type Photo={id:string;storage_path:string;url:string;caption:string|null};
export type PhotoHandle={upload:(jobId:string)=>Promise<void>};
async function prepare(file:File):Promise<Blob>{
 if(file.size>30*1024*1024)throw new Error(file.name+": image is too large (maximum 30 MB).");
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;await img.decode();
  const scale=Math.min(1,2048/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement("canvas");canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);
  const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Image processing unavailable.");
  ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Image conversion failed.")),"image/jpeg",.85));
 }catch{throw new Error(file.name+": this image could not be opened. Try a JPEG photo or screenshot.");}
 finally{URL.revokeObjectURL(url)}
}
const JobPhotos=forwardRef<PhotoHandle,{jobId?:string;readOnly?:boolean;disabled?:boolean;onDirty?:()=>void;onBusy?:(busy:boolean)=>void}>(function JobPhotos({jobId,readOnly=false,disabled=false,onDirty,onBusy},ref){
 const [photos,setPhotos]=useState<Photo[]>([]),[pending,setPending]=useState<Pending[]>([]),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const queue=useRef<Pending[]>([]),camera=useRef<HTMLInputElement>(null),gallery=useRef<HTMLInputElement>(null);
 function changeQueue(items:Pending[]){queue.current=items;setPending([...items])}
 useEffect(()=>()=>{queue.current.forEach(p=>URL.revokeObjectURL(p.url))},[]);
 useEffect(()=>{if(!jobId)return;let active=true;(async()=>{const db=createClient();const {data,error}=await db.from("job_photos").select("id,storage_path,caption").eq("job_id",jobId).order("captured_at");if(error){if(active)setMessage(error.message);return}const items=await Promise.all((data||[]).map(async p=>{const signed=await db.storage.from("job-evidence").createSignedUrl(p.storage_path,3600);return {...p,url:signed.data?.signedUrl||""}}));if(active)setPhotos(items)})();return()=>{active=false}},[jobId]);
 async function select(files:FileList|null){if(!files?.length)return;setBusy(true);onBusy?.(true);setMessage("Preparing photos…");const errors:string[]=[];try{for(const file of Array.from(files)){try{const blob=await prepare(file);changeQueue([...queue.current,{id:crypto.randomUUID(),file:blob,url:URL.createObjectURL(blob),name:file.name}]);onDirty?.()}catch(e){errors.push((e as Error).message)}}setMessage(errors.length?errors.join(" "):"Photos ready. Tap Save Job to upload them.")}finally{setBusy(false);onBusy?.(false);if(camera.current)camera.current.value="";if(gallery.current)gallery.current.value=""}}
 useImperativeHandle(ref,()=>({async upload(id:string){
  const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user)throw new Error("Please sign in again before uploading photos.");
  setBusy(true);onBusy?.(true);
  try{const remaining=queue.current.filter(p=>!p.done);for(let i=0;i<remaining.length;i++){
   const p=remaining[i];setMessage("Uploading photo "+(i+1)+" of "+remaining.length+"…");
   p.path=p.path||user.id+"/"+id+"/"+p.id+".jpg";
   if(!p.uploaded){const result=await db.storage.from("job-evidence").upload(p.path,p.file,{contentType:"image/jpeg",upsert:true});if(result.error)throw result.error;p.uploaded=true}
   const linked=await db.from("job_photos").upsert({id:p.id,job_id:id,storage_path:p.path,caption:p.name},{onConflict:"id"}).select("id").single();if(linked.error)throw linked.error;p.done=true;setPending([...queue.current]);
  }setMessage("All photos saved.");
  }catch(e){const detail=(e as {message?:string}).message||"Connection failed";setMessage("Photo upload failed: "+detail);throw new Error("Job details saved, but some photos are not uploaded. Keep this page open and tap Save Job to retry. "+detail)}
  finally{setBusy(false);onBusy?.(false)}
 }}));
 return <section className="form-section"><h2>Job photos {photos.length+pending.length>0?"("+ (photos.length+pending.length)+")":""}</h2>{!readOnly&&<><p className="muted">Optional. Take a photo or choose several from your gallery. Photos upload when you save the job.</p><div className="photo-controls"><button type="button" className="secondary" disabled={disabled||busy} onClick={()=>camera.current?.click()}>Take photo</button><button type="button" className="secondary" disabled={disabled||busy} onClick={()=>gallery.current?.click()}>Choose photos</button></div><input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={e=>select(e.target.files)}/><input ref={gallery} type="file" accept="image/*" multiple hidden onChange={e=>select(e.target.files)}/></>}{message&&<p role="status" className="notice">{message}</p>}<div className="job-photo-grid">{photos.map(p=><figure key={p.id}>{p.url?<a href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt={p.caption||"Job photo"} loading="lazy"/></a>:<p>Preview unavailable. Refresh to retry.</p>}<figcaption>{p.caption||"Saved photo"}</figcaption></figure>)}{pending.map(p=><figure key={p.id}><img src={p.url} alt={p.name}/><figcaption>{p.done?"Saved":"Not uploaded yet"}</figcaption>{!p.uploaded&&!p.done&&<button type="button" className="secondary" disabled={disabled||busy} onClick={()=>{URL.revokeObjectURL(p.url);changeQueue(queue.current.filter(item=>item.id!==p.id));onDirty?.()}}>Remove</button>}</figure>)}</div>{!photos.length&&!pending.length&&<p className="muted">No photos added.</p>}</section>;
});
export default JobPhotos;
