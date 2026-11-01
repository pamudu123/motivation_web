import test from "node:test";
import assert from "node:assert/strict";
import { contentService, searchParams } from "../src/lib/content";
import { safeReturnPath, readPending, authMessage, authClient, PENDING_KEY } from "../src/lib/auth";
import { api, ApiError } from "../src/lib/api";

test("filters encode safely and retain offset pagination",()=>{
 const q=new URLSearchParams(searchParams({search:"a & b",themes:["Focus","New Beginnings"],offset:104,limit:8}));
 assert.equal(q.get("search"),"a & b");assert.equal(q.get("themes"),"Focus,New Beginnings");assert.equal(q.get("offset"),"104");
});
test("external and auth return paths cannot redirect login away",()=>{
 for(const p of ["https://evil.test","//evil.test","/\\evil.test","/auth/callback","/auth/confirm?token_hash=x","/signin","/signup/","/signin?next=/saved",null,undefined])assert.equal(safeReturnPath(p),"/saved");
 assert.equal(safeReturnPath("/explore?themes=Focus"),"/explore?themes=Focus");
 assert.equal(safeReturnPath("/signing-tips"),"/signing-tips");
 assert.equal(safeReturnPath(null,"/profile"),"/profile");
});
test("auth errors become plain language without provider details",()=>{
 assert.match(authMessage({status:429,message:"email rate limit exceeded"}),/Too many requests/);
 assert.match(authMessage({status:403,code:"otp_expired",message:"Token has expired or is invalid"}),/expired or was already used/);
 assert.match(authMessage({name:"AuthRetryableFetchError",message:"Failed to fetch"}),/connection/);
 assert.equal(authMessage({status:500,message:"relation auth.users does not exist"}),"Sign-in couldn’t finish. Please try again.");
});
test("an exhausted refresh becomes one 401 without a retry loop",async()=>{
 process.env.NEXT_PUBLIC_SUPABASE_URL??="https://fixture.supabase.test";process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??="fixture";
 const auth=authClient().auth as unknown as Record<string,unknown>;const original=globalThis.fetch;let calls=0;let refreshes=0;
 auth.getSession=async()=>({data:{session:{access_token:"expired"}},error:null});
 auth.refreshSession=async()=>{refreshes++;return {data:{session:null},error:new Error("Invalid Refresh Token")};};
 try{
 globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({error:{message:"Session expired.",code:"unauthenticated"}}),{status:401});};
 await assert.rejects(api("/me",{},true),(e:unknown)=>e instanceof ApiError&&e.status===401&&e.message==="Please sign in.");
 assert.equal(calls,1);assert.equal(refreshes,1);
 }finally{globalThis.fetch=original;}
});
test("404 maps to missing content, upstream failures do not become fake posts",async()=>{
 const original=globalThis.fetch;
 try{
 globalThis.fetch=async()=>new Response(JSON.stringify({error:{message:"Missing",code:"not_found"}}),{status:404});
 assert.equal(await contentService.bySlug("missing"),null);
 globalThis.fetch=async()=>new Response(JSON.stringify({error:{message:"Unavailable",code:"service_unavailable"}}),{status:503});
 await assert.rejects(contentService.bySlug("test"),ApiError);
 }finally{globalThis.fetch=original;}
});
test("empty daily response and cancellation propagate through adapter",async()=>{
 const original=globalThis.fetch;const controller=new AbortController();
 try{
 globalThis.fetch=async(_url,options)=>{assert.equal(options?.cache,"no-store");return new Response(JSON.stringify({date:null,posts:[]}));};
 assert.deepEqual(await contentService.daily(),{date:null,posts:[]});
 globalThis.fetch=async(_url,options)=>{assert.equal(options?.signal,controller.signal);throw new DOMException("Aborted","AbortError");};
 await assert.rejects(contentService.search({},controller.signal),{name:"AbortError"});
 }finally{globalThis.fetch=original;}
});
test("pending guest actions expire and never accept a false desired state",()=>{
 const store=new Map<string,string>();Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{getItem:(k:string)=>store.get(k)??null,removeItem:(k:string)=>store.delete(k)}});
 store.set(PENDING_KEY,JSON.stringify({id:"x",kind:"saved",postId:"p",active:true,expires:Date.now()-1}));assert.equal(readPending(),null);
 store.set(PENDING_KEY,JSON.stringify({id:"x",kind:"saved",postId:"p",active:true,expires:Date.now()+10000,returnPath:"//evil.test"}));assert.equal(readPending()?.returnPath,"/saved");
 store.set(PENDING_KEY,JSON.stringify({id:"x",kind:"saved",postId:"p",active:false,expires:Date.now()+10000}));assert.equal(readPending(),null);
});
