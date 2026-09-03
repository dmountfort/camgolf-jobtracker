"use client";
import { useParams } from "next/navigation";
import { JobEditor } from "@/app/components/job-editor";
export default function EditJobPage(){const {id}=useParams<{id:string}>();return <JobEditor jobId={id}/>}
