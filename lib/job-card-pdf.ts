import {PDFDocument,StandardFonts,rgb,type PDFPage} from "pdf-lib";
export type JobCardData={
 job_number:number|string;report_number?:string|null;service_date:string;travelling_km:number|null;duration_hours:number|null;general_notes:string|null;
 customers:{name:string;address?:string|null;telephone?:string|null;email?:string|null}|null;
 profiles:{full_name:string}|null;
 job_vehicles:{model?:string|null;amp_hours?:number|string|null;unit_number:string|null;serial_number:string|null;work_performed:string;attention_notes:string|null}[];
 job_parts:{description:string;quantity:number;unit_cost:number;parts:{part_number:string|null}|null}[];
};
export async function createJobCardPdf(job:JobCardData){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const black=rgb(.1,.1,.1),left=36,width=523;
 const clean=(s:unknown)=>String(s??"").replace(/[–—]/g,"-").replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[^\x20-\x7e\xa0-\xff\n]/g,"?");
 let page:PDFPage,y=0;
 const text=(s:unknown,x:number,top:number,size=9,heavy=false)=>page.drawText(clean(s),{x,y:842-top-size,size,font:heavy?bold:font,color:black});
 const line=(x:number,top:number,w:number)=>page.drawLine({start:{x,y:842-top},end:{x:x+w,y:842-top},thickness:.6,color:black});
 const box=(x:number,top:number,w:number,h:number)=>page.drawRectangle({x,y:842-top-h,width:w,height:h,borderWidth:.6,borderColor:black});
 function wrap(value:unknown,w:number,size=9){
  const lines:string[]=[];
  for(const paragraph of clean(value).split("\n")){
   let current="";
   for(const word of paragraph.split(/\s+/)){
    if(!word)continue;
    if(font.widthOfTextAtSize((current?current+" ":"")+word,size)<=w){current+=(current?" ":"")+word;continue}
    if(current){lines.push(current);current=""}
    for(const char of word){if(font.widthOfTextAtSize(current+char,size)>w){lines.push(current);current=""}current+=char}
   }
   lines.push(current);
  }
  return lines.length?lines:[""];
 }
 function newPage(){
  page=pdf.addPage([595,842]);y=30;
  text("CAM GOLF",left,y,14,true);text("JOB CARD",407,y,14,true);y+=27;
  box(423,y,136,35);text("JOB CARD NO:",429,y+4,8,true);text(job.job_number,499,y+15,12,true);
  const customer=wrap(job.customers?.name||"",335,10);
  text("Customer:",left,y+3,9,true);customer.forEach((s,i)=>text(s,95,y+3+i*12,10));y+=Math.max(27,customer.length*12+7);
  text("Address:",left,y,9,true);const address=wrap(job.customers?.address||"",319);address.forEach((s,i)=>text(s,95,y+i*12));text("Date:",423,y+13,9,true);text(job.service_date,460,y+13);y+=Math.max(32,address.length*12+8);
  text("Tel No:",left,y,9,true);text(job.customers?.telephone||"",95,y);
  text("Labour / hrs:",380,y,9,true);text(job.duration_hours??"",472,y);y+=19;
  text("Email:",left,y,9,true);wrap(job.customers?.email||"",270).forEach((s,i)=>text(s,95,y+i*11));
  text("Travel / km:",380,y,9,true);text(job.travelling_km??"",472,y);y+=25;
  text("Technician:",left,y,9,true);text(job.profiles?.full_name||"",95,y);
  text("Delivery method:",340,y,8,true);box(423,y-3,68,18);box(491,y-3,68,18);text("Customer",430,y,8);text("CAM Golf",498,y,8);y+=31;
 }
 function ensure(h:number){if(y+h>790)newPage()}
 function heading(label:string){ensure(40);box(left,y,width,22);text(label,left+7,y+6,9,true);y+=22}
 function table(headers:string[],widths:number[],rows:unknown[][],minimum=0){
  const drawHeader=()=>{ensure(45);let x=left;headers.forEach((h,i)=>{box(x,y,widths[i],20);text(h,x+5,y+5,8,true);x+=widths[i]});y+=20};
  drawHeader();
  const padded=[...rows];while(padded.length<minimum)padded.push(headers.map(()=>""));
  for(const cells of padded){
   let columns=cells.map((v,i)=>wrap(v,widths[i]-10,8));
   let count=Math.max(...columns.map(c=>c.length));
   while(count>0){
    if(y+22>790){newPage();drawHeader()}
    const fit=Math.max(1,Math.min(count,Math.floor((790-y-10)/11)));
    const height=Math.max(22,fit*11+10);let x=left;
    columns.forEach((col,i)=>{box(x,y,widths[i],height);col.slice(0,fit).forEach((s,j)=>text(s,x+5,y+5+j*11,8));x+=widths[i]});
    columns=columns.map(col=>col.slice(fit));count-=fit;y+=height;
   }
  }
 }
 function note(label:string,value:unknown,min=35){
  heading(label);const lines=wrap(value,width-14);
  while(lines.length){if(y+24>790)newPage();const n=Math.max(1,Math.min(lines.length,Math.floor((790-y-10)/12)));const chunk=lines.splice(0,n),h=Math.max(min,chunk.length*12+10);ensure(h);box(left,y,width,h);chunk.forEach((s,i)=>text(s,left+7,y+5+i*12));y+=h}y+=10;
 }
 newPage();
 heading("VEHICLE DESCRIPTION");
 table(["Model","Cart number","Serial number","AMP hours"],[150,100,173,100],job.job_vehicles.map(v=>[v.model,v.unit_number,v.serial_number,v.amp_hours]));
 y+=12;heading("WORK CARRIED OUT");
 table(["Cart","Work performed / items requiring attention"],[85,438],job.job_vehicles.map(v=>[v.unit_number,[v.work_performed,v.attention_notes?"Items requiring attention: "+v.attention_notes:""].filter(Boolean).join("\n")]),4);
 ensure(24);box(left,y,width,22);text("Total labour / hours (whole job):",left+8,y+6,9,true);text(job.duration_hours??"",left+width-70,y+6,9,true);y+=34;
 heading("PARTS USED");
 const money=(n:number)=>"R "+Number(n||0).toFixed(2);
 table(["Part No","Description","Qty","Unit cost","Cost"],[73,236,44,80,90],job.job_parts.map(p=>[p.parts?.part_number,p.description,p.quantity,money(p.unit_cost),money(p.quantity*p.unit_cost)]),3);
 ensure(25);box(left,y,width,22);text("PARTS TOTAL",left+8,y+6,9,true);text(money(job.job_parts.reduce((sum,p)=>sum+p.quantity*p.unit_cost,0)),left+width-85,y+6,9,true);y+=34;
 note("SUNDRIES","",28);note("COMMENTS",job.general_notes,45);
 ensure(45);box(left,y,width,40);text("CUSTOMER SIGNATURE:",left+7,y+5,9,true);y+=40;
 pdf.getPages().forEach((p,i)=>p.drawText("CAM Golf | Job card "+clean(job.job_number)+" | Page "+(i+1)+" of "+pdf.getPageCount(),{x:left,y:18,size:7,font,color:black}));
 return pdf.save();
}
