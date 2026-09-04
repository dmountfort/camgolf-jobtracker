import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function POST(request: Request) {
  const job = await request.json();
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(.12,.15,.12); const grey = rgb(.38,.4,.38); const red = rgb(.82,.08,.22);
  const text=(value:string,x:number,y:number,size=8,font=regular,color=dark)=>page.drawText(String(value||""),{x,y,size,font,color,maxWidth:500});
  const line=(x1:number,y1:number,x2:number,y2:number,w=.7)=>page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:w,color:dark});
  const box=(x:number,y:number,w:number,h:number)=>{line(x,y,x+w,y);line(x,y+h,x+w,y+h);line(x,y,x,y+h);line(x+w,y,x+w,y+h)};

  text("EZGO",42,775,36,bold); text("A Textron Company",55,758,7,bold);
  text("BOUNDLESS TRADE 154 (PTY) LTD",360,785,8,bold); text("30 Pioneer Road · Pacaltsdorp Industria",360,771,7); text("George, 6530",360,760,7);
  text("SERVICE / INSPECTION CLIENT REPORT",42,724,15,bold); text("Nr:",442,724,13,bold); text(String(job.reportNumber||""),466,724,17,bold,red);
  box(42,600,265,105); box(317,600,236,105);
  text("To:",48,692,7,bold); text(`${job.customerName||""}\n${job.siteName||""}`,76,680,11);
  text("Telephone Nr:",48,611,7,bold); text(job.telephone||"",112,611,8);
  text("Date:",324,688,7,bold); text(job.serviceDate||"",367,688,8);
  text("Travelling Km:",324,665,7,bold); text(job.travellingKm||"",390,665,8);
  text("Duration / Hours:",324,642,7,bold); text(job.durationHours||"",402,642,8);
  text("Technician:",324,616,7,bold); text(job.technicianName||"",381,616,8); text("Job card Nr:",468,602,7,bold); text(String(job.jobNumber??""),519,602,7);

  text("Work as listed below, was performed on the following units:",42,585,7,bold);
  text("Kindly note comments on the following units:",317,585,7,bold);
  box(42,245,265,330); box(317,245,236,330); line(104,245,104,575); line(381,245,381,575);
  text("Serial Number",48,563,7,bold); text("Comments",160,563,7,bold); text("Serial Number",323,563,7,bold); text("Comments",420,563,7,bold);
  for(let y=550;y>245;y-=25){line(42,y,307,y,.35);line(317,y,553,y,.35)}
  (job.vehicles||[]).slice(0,12).forEach((v:any,i:number)=>{const y=535-i*25;text(v.serialNumber||v.unitNumber||"",48,y,7);text(v.workPerformed||"",110,y,7);text(v.serialNumber||v.unitNumber||"",323,y,7);text(v.attentionNotes||"",387,y,7)});
  box(42,152,511,78); text("Additional Comments / Notes:",48,218,7,bold); text(job.generalNotes||"",48,200,8);
  text("Work performed (kindly tick below)",42,131,7,bold); ["Service","Brakes","Oil","Water","Hardware","Wheels & Tyres (check)","Ignition","General Appearance of Car","Charger"].forEach((v,i)=>{box(44,112-i*13,8,8);text(v,61,113-i*13,7)});
  box(340,104,213,38);box(340,58,213,38);box(340,12,213,38);text("CLIENT SIGNATURE:",347,130,8,bold);text("CLIENT NAME (Please Print)",347,84,8,bold);text("TECHNICIAN SIGNATURE:",347,38,8,bold);
  text("Generated from CAM Golf Job Tracker",42,12,6,regular,grey);
  const bytes=await pdf.save();
  return new Response(Buffer.from(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="EZGO-${job.reportNumber||"report"}.pdf"`}});
}
