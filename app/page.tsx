"use client";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); setMessage("Signing in…");
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message); else window.location.href = "/dashboard";
  }
  return <main className="login-shell">
    <section className="brand-panel"><div className="brand-mark">CG</div><p>CAM GOLF</p><h1>Every job card.<br/>Complete and accounted for.</h1><p className="muted">Offline field capture, admin review and client-ready EZGO reports.</p></section>
    <section className="login-card"><p className="eyebrow">STAFF ACCESS</p><h2>Welcome back</h2><p className="muted">Sign in with your CAM Golf account.</p>
      <form onSubmit={submit}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@camgolf.co.za"/></label><label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button>Sign in</button><p className="form-message">{message}</p></form>
    </section>
  </main>;
}
