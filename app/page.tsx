"use client";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [settingPassword,setSettingPassword]=useState(false);
  useEffect(()=>{const supabase=createClient();const check=async()=>{const {data:{session}}=await supabase.auth.getSession();if(session&&(/type=(invite|recovery)/.test(window.location.hash)||window.location.search.includes("code=")))setSettingPassword(true)};check();const {data}=supabase.auth.onAuthStateChange((event)=>{if(event==="PASSWORD_RECOVERY"||event==="SIGNED_IN"&&/type=invite/.test(window.location.hash))setSettingPassword(true)});return()=>data.subscription.unsubscribe()},[]);
  async function submit(e: FormEvent) {
    e.preventDefault(); setMessage("Signing in…");
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message); else window.location.href = "/dashboard";
  }
  async function setNewPassword(e:FormEvent){e.preventDefault();if(password.length<8){setMessage("Use at least 8 characters.");return}setMessage("Saving password…");const {error}=await createClient().auth.updateUser({password});if(error)setMessage(error.message);else window.location.href="/dashboard"}
  return <main className="login-shell">
    <section className="brand-panel"><div className="brand-mark">CG</div><p>CAM GOLF</p><h1>Every job card.<br/>Complete and accounted for.</h1><p className="muted">Offline field capture, admin review and client-ready EZGO reports.</p></section>
    <section className="login-card"><p className="eyebrow">STAFF ACCESS</p><h2>{settingPassword?"Create your password":"Welcome back"}</h2><p className="muted">{settingPassword?"Choose a secure password for your CAM Golf account.":"Sign in with your CAM Golf account."}</p>
      {settingPassword?<form onSubmit={setNewPassword}><label>New password<input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></label><button>Save password</button><p className="form-message">{message}</p></form>:<form onSubmit={submit}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@camgolf.co.za"/></label><label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button>Sign in</button><p className="form-message">{message}</p></form>}
    </section>
  </main>;
}
