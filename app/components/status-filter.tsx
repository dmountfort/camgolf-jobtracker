"use client";
export default function StatusFilter({value,onChange}:{value:string;onChange:(value:string)=>void}) {
 return <div className="status-filter" role="group" aria-label="Filter job status">{["all","open","closed"].map(item=><button key={item} type="button" aria-pressed={value===item} onClick={()=>onChange(item)}>{item[0].toUpperCase()+item.slice(1)}</button>)}</div>;
}
