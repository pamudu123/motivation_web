// Real local PostgreSQL engine (PGlite), with minimal Supabase auth/storage fixtures.
// This is not a replacement for a full local Supabase Auth/Storage integration run.
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as
 $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated,service_role;
 grant execute on function auth.uid() to anon,authenticated,service_role;
 create schema storage;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
`);
for (const name of (await readdir("supabase/migrations")).filter(n=>n.endsWith(".sql")).sort()) {
  await db.exec(await readFile(`supabase/migrations/${name}`,"utf8"));
}
console.log("PASS migration replay");
const userA="00000000-0000-4000-8000-000000000001";
const userB="00000000-0000-4000-8000-000000000002";
await db.query("insert into auth.users values($1),($2)",[userA,userB]);
await db.exec(`
 insert into public.posts(slug,title,quote,description,themes,styles,editorial_date,status,editorial_approved,rights_approved)
 select 'post-'||n,'Post '||n,'A quiet start','Description',array['Focus'],array['Minimal'],date '2026-01-01','published',true,true from generate_series(1,120) n;
 insert into public.posts(slug,title,quote,description,themes,styles,editorial_date,status)
 values ('future','Future','Future','',array['Calm'],array['Nature'],date '2999-01-01','published'),('draft','Draft','Draft','',array['Calm'],array['Nature'],date '2026-01-01','draft');
 insert into public.post_assets(post_id,role,bucket,object_path,mime,width,height,alt,checksum)
 select p.id,r,'wallpapers-public',p.slug||'/'||r||'.jpg','image/jpeg',100,100,'Artwork','hash'
 from public.posts p cross join unnest(array['thumbnail','hero','mobileHero','mobile','desktop']) r where p.status='published';
`);
const target=(await db.query("select id from public.posts where slug='post-1'")).rows[0].id;
async function as(role,uid,fn){
  await db.exec("begin");
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid??""]);
    const result=await fn();await db.exec("commit");return result;
  } catch(e) {await db.exec("rollback");throw e;}
}
await as("anon",null,async()=>{
 const {rows}=await db.query("select public.catalogue(skip=>104,take=>8) data");
 assert.equal(rows[0].data.total,120);assert.equal(rows[0].data.posts.length,8);
 assert.equal((await db.query("select * from public.posts where slug in ('draft','future')")).rows.length,0);
 assert.equal((await db.query("select * from public.likes")).rows.length,0);
});
console.log("PASS public pagination and future/draft isolation");
await as("authenticated",userA,async()=>{
 await db.query("insert into public.profiles(id) values($1)",[userA]);
 await db.query("select public.set_reaction('liked',$1,true)",[target]);
 await db.query("select public.set_reaction('liked',$1,true)",[target]);
 await db.query("select public.set_reaction('saved',$1,true)",[target]);
 const result=(await db.query("select public.reaction_counts() data")).rows[0].data;
 assert.deepEqual(result,{likedCount:1,savedCount:1});
});
await as("authenticated",userB,async()=>{
 assert.equal((await db.query("select * from public.likes")).rows.length,0);
 assert.equal((await db.query("select * from public.profiles")).rows.length,0);
});
await assert.rejects(as("authenticated",userB,()=>db.query("insert into public.saves(user_id,post_id) values($1,$2)",[userA,target])));
await assert.rejects(as("anon",null,()=>db.query("select public.publish_collection($1,'guest')",[target])));
await assert.rejects(as("authenticated",userA,()=>db.query("update public.post_stats set like_count=1000 where post_id=$1",[target])));
await as("anon",null,async()=>assert.equal((await db.query("select like_count from public.post_stats where post_id=$1",[target])).rows[0].like_count,1));
console.log("PASS private ownership, idempotent reactions and public aggregates");
await as("authenticated",userA,async()=>{
 await db.query("select public.set_reaction('liked',$1,false)",[target]);
 await db.query("select public.set_reaction('liked',$1,false)",[target]);
 await db.query("select public.set_reaction('liked',$1,true)",[target]);
});
const ids=(await db.query("select id from public.posts where slug like 'post-%' order by slug limit 5")).rows.map(r=>r.id);
await as("service_role",null,async()=>{
 const id=(await db.query("select public.assemble_collection('2026-01-01',$1::uuid[]) id",[ids])).rows[0].id;
 await db.query("select public.publish_collection($1,'test')",[id]);
});
await assert.rejects(as("service_role",null,()=>db.query("select public.assemble_collection('2026-01-02',$1::uuid[])",[ids.slice(0,4)])));
await as("service_role",null,()=>db.query("select public.deletion_job($1)",[userA]));
await assert.rejects(as("authenticated",userA,()=>db.query("select public.set_reaction('saved',$1,true)",[target])));
await db.query("delete from auth.users where id=$1",[userA]);
assert.equal((await db.query("select like_count from public.post_stats where post_id=$1",[target])).rows[0].like_count,0);
assert.equal((await db.query("select * from public.saves")).rows.length,0);
console.log("PASS publishing validation, deletion lockout and cascading counters");
await db.close();
