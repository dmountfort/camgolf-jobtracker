"use client";
import {useParams} from "next/navigation";
import FieldEditor from "@/app/components/field-editor";
export default function FieldJob(){const {id}=useParams<{id:string}>();return <FieldEditor jobId={id}/>}
