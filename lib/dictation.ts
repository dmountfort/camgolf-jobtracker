export type SpeechResults = ArrayLike<{isFinal:boolean; [index:number]:{transcript:string}}>;
export type Recognition = {
 lang:string; continuous:boolean; interimResults:boolean;
 onstart:(()=>void)|null; onresult:((event:{results:SpeechResults})=>void)|null;
 onerror:((event:{error:string})=>void)|null; onend:(()=>void)|null;
 start:()=>void; stop:()=>void; abort:()=>void;
};
export type Phase = "idle"|"starting"|"listening"|"finishing";
type Options = {recognition:Recognition; initialText:string; onText:(text:string)=>void; onState:(phase:Phase,message:string)=>void};
let cancelActive:(()=>void)|undefined;
const errors:Record<string,string> = {
 "not-allowed":"Microphone permission denied. Allow access in browser settings or use your keyboard microphone.",
 "service-not-allowed":"The browser’s speech service is unavailable. Use your keyboard microphone.",
 "audio-capture":"No microphone is available. Close other microphone apps and try again.",
 "network":"The speech service could not connect. Check your internet or use your keyboard microphone.",
 "no-speech":"No words were recognised. Try again, or use your keyboard microphone.",
 "language-not-supported":"This speech service does not support the selected language. Use your keyboard microphone.",
 "aborted":"Dictation stopped. Any words received have been kept."
};
// Rebuild each snapshot so interim corrections never duplicate existing words.
export function transcriptText(initialText:string,results:SpeechResults):string{
 const words=Array.from(results,result=>result[0]?.transcript?.trim()||"").filter(Boolean).join(" ");
 return words ? [initialText.trimEnd(),words].filter(Boolean).join(" ") : initialText;
}
export function startDictation({recognition:speech,initialText,onText,onState}:Options){
 cancelActive?.();
 let ended=false,received=false;
 let watchdog:ReturnType<typeof setTimeout>|undefined;
 let finishTimer:ReturnType<typeof setTimeout>|undefined;
 const clear=()=>{clearTimeout(watchdog);clearTimeout(finishTimer)};
 const finish=(message:string,abort=false)=>{
  if(ended)return;
  ended=true;clear();
  speech.onstart=null;speech.onresult=null;speech.onerror=null;speech.onend=null;
  if(cancelActive===cancel)cancelActive=undefined;
  if(abort){try{speech.abort()}catch{}}
  onState("idle",message);
 };
 const cancel=()=>finish(received?"Dictation stopped. Text kept — please check it.":"Dictation stopped.",true);
 const armWatchdog=()=>{clearTimeout(watchdog);watchdog=setTimeout(()=>finish(received?"Dictation paused. Text kept — tap Speak to continue.":"The microphone opened, but no transcription arrived. Check your connection or use your keyboard microphone.",true),15000)};
 cancelActive=cancel;speech.lang="en-ZA";speech.continuous=false;speech.interimResults=true;
 speech.onstart=()=>{if(!ended){onState("listening","Listening… words will appear below as you speak.");armWatchdog()}};
 speech.onresult=event=>{
  if(ended)return;
  const next=transcriptText(initialText,event.results);
  if(next!==initialText){received=true;onText(next);onState("listening","Words received. Tap Stop, then check the text.")}
  armWatchdog();
 };
 speech.onerror=event=>finish((errors[event.error]||"Speech recognition failed. Try your keyboard microphone.")+(received?" Your transcribed text has been kept.":""),true);
 speech.onend=()=>finish(received?"Text added — please check it. Tap Speak to add more.":"No transcription was returned. Try again or use your keyboard microphone.");
 onState("starting","Opening microphone… allow access if asked.");
 try{armWatchdog();speech.start()}catch{finish("Could not start dictation. Try again or use your keyboard microphone.",true)}
 return {
  stop(){if(ended)return;clearTimeout(watchdog);onState("finishing","Finishing transcription…");finishTimer=setTimeout(()=>finish(received?"Text kept — please check it.":"No transcription was returned. Try your keyboard microphone.",true),3000);try{speech.stop()}catch{cancel()}},
  cancel
 };
}
