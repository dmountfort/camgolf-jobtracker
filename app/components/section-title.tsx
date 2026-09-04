export default function SectionTitle({number,title,detail}:{number:number;title:string;detail?:string}) {
 return <div className="section-title"><span className="section-number" aria-hidden="true">{number}</span><div><h2>{title}</h2>{detail&&<p className="muted">{detail}</p>}</div></div>;
}
