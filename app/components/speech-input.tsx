"use client";
import {useEffect,useId,useRef,useState} from "react";
import {startDictation,type Recognition,type Phase} from "@/lib/dictation";

export default function SpeechInput({label,value,onChange,required=false,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;required?:boolean;disabled?:boolean}){
 const id=useId(),area=useRef<HTMLTextAreaElement|null>(null);
 const session=useRef<ReturnType<typeof startDictation>|null>(null);
 const current=useRef({value,onChange});current.current={value,onChange};
 const mounted=useRef(true);
 const [phase,setPhase]=useState<Phase>("idle"),[message,setMessage]=useState("");
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;session.current?.cancel()}},[]);
 useEffect(()=>{if(disabled)session.current?.cancel()},[disabled]);
 function toggle(){
  if(phase!=="idle"){session.current?.stop();return}
  const browser=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
  const Speech=browser.SpeechRecognition||browser.webkitSpeechRecognition;
  if(!Speech){setMessage("This browser does not support in-page dictation. Tap Keyboard below, then the microphone on your phone’s keyboard.");return}
  if(!navigator.onLine){setMessage("You appear to be offline. Browser dictation may need internet; try your keyboard microphone.");return}
  session.current=startDictation({
   recognition:new Speech(),initialText:current.current.value,
   onText:text=>{if(mounted.current)current.current.onChange(text)},
   onState:(next,note)=>{if(mounted.current){setPhase(next);setMessage(note)}}
  });
 }
 function keyboard(){session.current?.cancel();area.current?.focus();setMessage("Tap the microphone on your phone’s keyboard to dictate, or type here.");}
 return <div><div className="speech-label"><label htmlFor={id}>{label}{required?" *":""}</label>{!disabled&&<button type="button" className="speech-button" aria-label={phase==="idle"?"Dictate "+label:"Stop dictating "+label} aria-pressed={phase!=="idle"} disabled={phase==="finishing"} onClick={toggle}><svg width="18" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg>{phase==="idle"?"Speak":phase==="finishing"?"Finishing…":"Stop"}</button>}</div>
 <textarea ref={area} id={id} value={value} required={required} readOnly={disabled} aria-describedby={id+"-speech"} onChange={e=>{session.current?.cancel();onChange(e.target.value)}}/>
 <div id={id+"-speech"}>{message&&<p className="speech-note" role="status">{message}</p>}{!disabled&&<button type="button" className="secondary" onClick={keyboard}>Keyboard / phone dictation</button>}</div></div>;
}
