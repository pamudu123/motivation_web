"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export default function Page() {
  const [status,setStatus]=useState<string|null>(null);
  useEffect(()=>setStatus(sessionStorage.getItem("daily-spark-deletion")),[]);
  return <main id="main" className="page"><div className="empty-state"><h1>{status==="complete"?"Your account has been deleted.":"Account deletion"}</h1><p>{status==="pending"?"Your deletion request was accepted. You are signed out while we finish removing your account.":status==="complete"?"Your profile, likes and saves have been removed.":"No deletion status is available in this browser."}</p><Link href="/" className="button primary">Browse wallpapers</Link></div></main>;
}
