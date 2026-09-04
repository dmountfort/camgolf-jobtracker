import {PDFDocument,StandardFonts,rgb,type PDFPage} from "pdf-lib";
export type JobCardData={
 job_number:number|string;invoice_number?:string|null;service_date:string;travelling_km:number|null;duration_hours:number|null;general_notes:string|null;
 customers:{name:string;address?:string|null;telephone?:string|null;email?:string|null}|null;
 job_vehicles:{model?:string|null;amp_hours?:number|string|null;unit_number:string|null;serial_number:string|null;work_performed:string;attention_notes:string|null}[];
 job_parts:{description:string;quantity:number;parts:{part_number:string|null}|null}[];
};
export async function createJobCardPdf(job:JobCardData){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const black=rgb(.1,.1,.1),border=rgb(.48,.51,.48),shade=rgb(.95,.96,.94),left=36,width=523;
 const clean=(s:unknown)=>String(s??"").replace(/[–—]/g,"-").replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[^\x20-\x7e\xa0-\xff\n]/g,"?");
 let page:PDFPage,y=0;
 const text=(s:unknown,x:number,top:number,size=9,heavy=false)=>page.drawText(clean(s),{x,y:842-top-size,size,font:heavy?bold:font,color:black});
 const line=(x:number,top:number,w:number)=>page.drawLine({start:{x,y:842-top},end:{x:x+w,y:842-top},thickness:.6,color:black});
 const box=(x:number,top:number,w:number,h:number,shaded=false)=>page.drawRectangle({x,y:842-top-h,width:w,height:h,borderWidth:.5,borderColor:border,...(shaded?{color:shade}:{})});
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
  const info=[
   ["Customer",job.customers?.name,"Job card No",job.job_number],
   ["Address",job.customers?.address,"Date",job.service_date],
   ["Telephone",job.customers?.telephone,"Labour / hrs",job.duration_hours],
   ["Email",job.customers?.email,"Travel / km",job.travelling_km],
   ["Invoice",job.invoice_number,"",""]
  ];
  for(const row of info){
   const widths=[70,245,88,120],cols=row.map((v,i)=>wrap(v,widths[i]-12,9));
   const height=Math.max(28,Math.max(...cols.map(c=>c.length))*12+12);
   let x=left;
   cols.forEach((col,i)=>{box(x,y,widths[i],height,(i===0||i===2)&&Boolean(row[i]));col.forEach((value,n)=>text(value,x+6,y+6+n*12,9,i===0||i===2));x+=widths[i]});
   y+=height;
  }
  y+=16;
 }
 function ensure(h:number){if(y+h>790)newPage()}
 function heading(label:string){ensure(70);box(left,y,width,22,true);text(label,left+7,y+6,9,true);y+=22}
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
 table(["Part No","Description","Qty"],[100,363,60],job.job_parts.map(p=>[p.parts?.part_number,p.description,p.quantity]),3);
 y+=12;
 note("COMMENTS",job.general_notes,45);
 ensure(45);box(left,y,width,40);text("CUSTOMER SIGNATURE:",left+7,y+5,9,true);y+=40;
 pdf.getPages().forEach((p,i)=>p.drawText("CAM Golf | Job card "+clean(job.job_number)+" | Page "+(i+1)+" of "+pdf.getPageCount(),{x:left,y:18,size:7,font,color:black}));
 return pdf.save();
}
