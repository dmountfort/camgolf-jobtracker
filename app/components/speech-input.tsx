"use client";
import {useId} from "react";

// Native keyboard input only. Do not start a browser microphone session:
// it can compete with the phone's keyboard dictation and leave Safari stuck.
export default function SpeechInput({label,value,onChange,required=false,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;required?:boolean;disabled?:boolean}){
 const id=useId();
 return <div>
  <label htmlFor={id}>{label}{required?" *":""}</label>
  <textarea id={id} value={value} required={required} readOnly={disabled}
   autoCapitalize="sentences" spellCheck
   aria-describedby={disabled?undefined:id+"-dictation"}
   onChange={e=>onChange(e.target.value)}/>
  {!disabled&&<p id={id+"-dictation"} className="speech-note">Tap inside this field to type. For voice typing, use the microphone on your phone’s keyboard, if available. There is no microphone button inside this website.</p>}
 </div>;
}
