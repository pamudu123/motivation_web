import test from "node:test";
import assert from "node:assert/strict";
import { contentService, searchParams } from "../src/lib/content";
import { safeReturnPath, readPending, PENDING_KEY } from "../src/lib/auth";
import { ApiError } from "../src/lib/api";

test("filters encode safely and retain offset pagination",()=>{
 const q=new URLSearchParams(searchParams({search:"a & b",themes:["Focus","New Beginnings"],offset:104,limit:8}));
 assert.equal(q.get("search"),"a & b");assert.equal(q.get("themes"),"Focus,New Beginnings");assert.equal(q.get("offset"),"104");
});
test("external and auth return paths cannot redirect login away",()=>{
 for(const p of ["https://evil.test","//evil.test","/auth/callback",null])assert.equal(safeReturnPath(p),"/profile");
 assert.equal(safeReturnPath("/explore?themes=Focus"),"/explore?themes=Focus");
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
 store.set(PENDING_KEY,JSON.stringify({id:"x",kind:"saved",postId:"p",active:true,expires:Date.now()+10000,returnPath:"//evil.test"}));assert.equal(readPending()?.returnPath,"/profile");
 store.set(PENDING_KEY,JSON.stringify({id:"x",kind:"saved",postId:"p",active:false,expires:Date.now()+10000}));assert.equal(readPending(),null);
});
