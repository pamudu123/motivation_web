// Test-only HTTP fixture. Never imported by application code or deployment images.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
const seeds = JSON.parse(await readFile(new URL("../src/data/designs.json", import.meta.url), "utf8"));
const roles = {thumbnail:[600,800,"thumb"],hero:[1800,680,"hero"],mobileHero:[1080,1200,"mobile-hero"],mobile:[1080,1920,"mobile"],desktop:[2560,1440,"desktop"],whatsapp:[1080,1920,"whatsapp"],status:[1080,1920,"status"]};
const state = { empty:false, failure:false, reactionFailure:false, likes:new Set(), saves:new Set(), name:"Test Reader" };
const posts = Array.from({length:120},(_,i)=>{
 const seed=seeds[i%seeds.length];
 const assets=Object.fromEntries(Object.entries(roles).map(([role,[width,height,suffix]])=>[role,{src:`http://127.0.0.1:8101/images/${seed.slug}-${suffix}.jpg`,width,height,type:"image/jpeg",alt:seed.title}]));
 return {id:`00000000-0000-4000-8000-${String(i+1).padStart(12,"0")}`,slug:i<20?seed.slug:`fixture-${i}`,title:i<20?seed.title:`Fixture ${i}`,quote:seed.quote,description:seed.scene,themes:seed.themes,styles:[seed.style],publishedAt:seed.date,likeCount:0,...assets,versions:{mobile:assets.mobile,desktop:assets.desktop,...(seed.chat?{whatsapp:assets.whatsapp}:{}),...(seed.status?{status:assets.status}:{})}};
});
function page(items,url){const offset=Number(url.searchParams.get("offset")||0),limit=Number(url.searchParams.get("limit")||24);return {posts:items.slice(offset,offset+limit).map(p=>({...p,likeCount:Number(state.likes.has(p.id))})),total:items.length,offset,limit};}
function profile(){return {id:"10000000-0000-4000-8000-000000000001",displayName:state.name,themes:[],likedCount:state.likes.size,savedCount:state.saves.size};}
const server=createServer(async(req,res)=>{
 res.setHeader("Access-Control-Allow-Origin","*");
 const url=new URL(req.url,"http://localhost");
 let body="";for await(const part of req)body+=part;
 const input=body?JSON.parse(body):{};
 const send=(value,status=200)=>{res.writeHead(status,{"Content-Type":"application/json"});res.end(JSON.stringify(value));};
 if(url.pathname==="/__state"){Object.assign(state,input);if(input.reset){state.likes=new Set();state.saves=new Set();}return send({ok:true});}
 if(url.pathname.startsWith("/images/")){
  const filename=url.pathname.split("/").pop();let data;
  try{data=await readFile(new URL(`../public/wallpapers/${filename}`,import.meta.url));}
  catch{data=await sharp({create:{width:600,height:800,channels:3,background:"#d4b69a"}}).jpeg().toBuffer();}
  res.writeHead(200,{"Content-Type":"image/jpeg"});return res.end(data);
 }
 if(state.failure)return send({error:{message:"Fixture upstream failure",code:"service_unavailable"}},503);
 const path=url.pathname.replace("/api/v1","");
 if(path.startsWith("/me")&&!req.headers.authorization)return send({error:{message:"Please sign in.",code:"unauthenticated"}},401);
 if(path==="/me"&&req.method==="PATCH"){state.name=input.displayName;return send(profile());}
 if(path==="/me")return send(profile());
 if(path==="/me/reactions")return send((url.searchParams.get("ids")||"").split(",").map(postId=>({postId,liked:state.likes.has(postId),saved:state.saves.has(postId),likeCount:Number(state.likes.has(postId))})));
 if(req.method==="PUT"&&path.startsWith("/me/")){
  if(state.reactionFailure)return send({error:{message:"Fixture write failure"}},503);
  const [, ,kind,id]=path.split("/");const values=kind==="likes"?state.likes:state.saves;input.active?values.add(id):values.delete(id);
  return send({postId:id,liked:state.likes.has(id),saved:state.saves.has(id),likeCount:Number(state.likes.has(id)),likedCount:state.likes.size,savedCount:state.saves.size});
 }
 if(path==="/me/saved"||path==="/me/liked")return send(page(posts.filter(p=>(path.endsWith("saved")?state.saves:state.likes).has(p.id)),url));
 if(path==="/collections/daily")return send({date:state.empty?null:posts[0].publishedAt,posts:state.empty?[]:posts.slice(0,5)});
 if(path==="/collections")return send({collections:[],total:0,offset:0,limit:3});
 if(path==="/posts"){
  let items=state.empty?[]:posts;
  const search=url.searchParams.get("search")?.toLowerCase();if(search)items=items.filter(p=>`${p.title} ${p.quote} ${p.themes}`.toLowerCase().includes(search));
  const themes=(url.searchParams.get("themes")||"").split(",").filter(Boolean);if(themes.length)items=items.filter(p=>p.themes.some(t=>themes.includes(t)));
  if(url.searchParams.get("exclude"))items=items.filter(p=>p.id!==url.searchParams.get("exclude"));
  return send(page(items,url));
 }
 if(path.startsWith("/posts/")){const post=posts.find(p=>p.slug===path.split("/").pop());return post?send(post):send({error:{message:"Not found"}},404);}
 return send({status:"ok"});
});
server.listen(8101,"127.0.0.1",()=>console.log("Test fixture API on 8101"));
