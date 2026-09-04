import {redirect} from "next/navigation";
export default async function RetiredReport({params}:{params:Promise<{id:string}>}){const {id}=await params;redirect("/jobs/"+id+"/job-report")}
