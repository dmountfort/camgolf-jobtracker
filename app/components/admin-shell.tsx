"use client";
import {useEffect,useState,type ReactNode} from "react";
import {usePathname} from "next/navigation";
import {createClient} from "@/lib/supabase";

export default function AdminShell({children}:{children:ReactNode}) {
 const path=usePathname();
 const [name,setName]=useState(""),[error,setError]=useState("");
 useEffect(()=>{let active=true;(async()=>{const db=createClient();const {data:{user}}=await db.auth.getUser();if(user){const {data}=await db.from("profiles").select("full_name").eq("id",user.id).single();if(active)setName(data?.full_name||"")}})();return()=>{active=false}},[]);
 const links=[{href:"/dashboard",label:"Job cards",icon:"▤",active:path.startsWith("/jobs")||path==="/dashboard"},{href:"/customers",label:"Customers",icon:"◎",active:path==="/customers"},{href:"/parts",label:"Parts",icon:"▦",active:path==="/parts"}];
 async function signOut(){const {error}=await createClient().auth.signOut();if(error){setError("Unable to sign out. Please try again.");return}window.location.assign("/")}
 return <div className="admin-layout"><aside className="admin-sidebar"><a href="/dashboard" className="app-brand"><span className="brand-badge">CG</span><span>CAM GOLF<small>Job tracker</small></span></a><nav aria-label="Main navigation">{links.map(link=><a key={link.href} href={link.href} aria-current={link.active?"page":undefined}><span aria-hidden="true">{link.icon}</span>{link.label}</a>)}</nav><div className="admin-account"><span className="avatar" aria-hidden="true">{name.split(" ").filter(Boolean).map(n=>n[0]).slice(0,2).join("")||"CG"}</span><div><strong>{name||"CAM Golf"}</strong><small>Administrator</small></div></div><button className="nav-signout" onClick={signOut}>Sign out</button>{error&&<p role="alert">{error}</p>}</aside><div className="admin-mobile-header"><a href="/dashboard" className="app-brand"><span className="brand-badge">CG</span><span>CAM GOLF</span></a><button className="nav-signout" onClick={signOut}>Sign out</button>{error&&<span role="alert">{error}</span>}</div><div className="admin-body">{children}</div><nav className="mobile-nav" aria-label="Mobile navigation">{links.map(link=><a key={link.href} href={link.href} aria-current={link.active?"page":undefined}><span aria-hidden="true">{link.icon}</span>{link.label}</a>)}</nav></div>;
}
