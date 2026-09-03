"use client";
import {useEffect,useId,useRef,useState} from "react";
type Recognition={lang:string;continuous:boolean;interimResults:boolean;onresult:((event:any)=>void)|null;onerror:((event:any)=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void;abort:()=>void};
export default function SpeechInput({label,value,onChange,required=false,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;required?:boolean;disabled?:boolean}){
 const id=useId(),recognition=useRef<Recognition|null>(null),latest=useRef(value);latest.current=value;
 const [listening,setListening]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>()=>{if(recognition.current){recognition.current.onend=null;recognition.current.onresult=null;recognition.current.onerror=null;recognition.current.abort()}},[]);
 function toggle(){
  if(listening){recognition.current?.stop();return}
  const browser=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
  const Speech=browser.SpeechRecognition||browser.webkitSpeechRecognition;
  if(!Speech){setMessage("Voice typing is not supported here. Use your phone keyboard’s microphone, or type below.");return}
  const speech=new Speech();recognition.current=speech;speech.lang="en-ZA";speech.continuous=false;speech.interimResults=false;
  speech.onresult=event=>{let transcript="";for(let i=event.resultIndex;i<event.results.length;i++){if(event.results[i].isFinal)transcript+=event.results[i][0].transcript+" "}if(transcript.trim())onChange([latest.current.trim(),transcript.trim()].filter(Boolean).join(" "));setMessage("Text added. Please check it before saving.")};
  speech.onerror=event=>{setListening(false);setMessage(event.error==="not-allowed"?"Microphone access denied. Allow microphone access in browser settings or use keyboard dictation.":event.error==="no-speech"?"No speech heard. Tap the microphone to try again.":"Dictation unavailable. Check your connection, or use keyboard dictation.")};
  speech.onend=()=>setListening(false);
  try{speech.start();setListening(true);setMessage("Listening… tap Stop when finished.")}catch{setListening(false);setMessage("Unable to start dictation. Try again or use keyboard dictation.")}
 }
 return <div><div className="speech-label"><label htmlFor={id}>{label}{required?" *":""}</label>{!disabled&&<button type="button" className="speech-button" aria-label={"Dictate "+label} aria-pressed={listening} onClick={toggle}><svg width="18" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg>{listening?"Stop":"Speak"}</button>}</div><textarea id={id} value={value} required={required} readOnly={disabled} onChange={e=>onChange(e.target.value)}/>{message&&<p className="speech-note" role="status">{message}</p>}</div>
}
