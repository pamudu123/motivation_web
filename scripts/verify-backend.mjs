// Browser integration with fixture auth/API. Does not certify live Google/email providers.
import { chromium } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base=process.env.TEST_URL||"http://localhost:3100";
const output="test-results/backend-integration";
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:"chrome",headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
await context.addInitScript(()=>{Element.prototype.setPointerCapture=function(){};Element.prototype.releasePointerCapture=function(){};});
const page=await context.newPage();const errors=[];const passed=[];
page.on("pageerror",e=>errors.push(e.message));
const state=async body=>fetch("http://127.0.0.1:8101/__state",{method:"POST",body:JSON.stringify(body)});
async function check(name,fn){await fn();passed.push(name);console.log(`PASS ${name}`);}
try{
 await state({reset:true,empty:false,failure:false,reactionFailure:false});
 await check("Public rendering, downloads and direct details",async()=>{
  await page.goto(base);await page.waitForLoadState("networkidle");await page.locator(".gallery-card").first().waitFor();
  assert.equal(await page.locator(".daily-gallery .gallery-card").count(),5);
  await page.locator(".featured-caption a").click();await page.locator(".detail-layout, .studio, .detail-page").first().waitFor();
  const download=page.waitForEvent("download");await page.getByRole("button",{name:/Download.*wallpaper/i}).click();await download;
 });
 await check("Explore paginates beyond 100 and restores URL state",async()=>{
  await page.goto(`${base}/explore?limit=112`);await page.waitForFunction(()=>document.querySelectorAll(".gallery-card").length===112);
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll(".gallery-card").length===112);
 });
 await check("Guest sign-in dialog has keyboard recovery and accessible fields",async()=>{
  await page.goto(`${base}/profile`);const opener=page.locator("#main").getByRole("button",{name:"Sign in",exact:true});await opener.click();
  await page.getByRole("dialog").waitFor();assert.equal(await page.getByRole("button",{name:"Send magic link"}).count(),1);
  assert.equal((await new AxeBuilder({page}).analyze()).violations.length,0);
  await page.keyboard.press("Escape");await page.getByRole("dialog").waitFor({state:"hidden"});
 });
 await check("Authenticated save survives reload and failed like rolls back (fixture session)",async()=>{
  await page.goto(`${base}/explore`);await page.getByRole("button",{name:/^Save /}).first().click();await page.getByRole("dialog").waitFor();
  const uid="10000000-0000-4000-8000-000000000001";const exp=Math.floor(Date.now()/1000)+3600;
  const token=[{alg:"HS256",typ:"JWT"},{sub:uid,exp,role:"authenticated",aud:"authenticated"}].map(v=>Buffer.from(JSON.stringify(v)).toString("base64url")).join(".")+".test";
  await page.evaluate(({uid,exp,token})=>localStorage.setItem("sb-bekwpoafbkvpzobffvax-auth-token",JSON.stringify({access_token:token,refresh_token:"fixture-refresh",token_type:"bearer",expires_at:exp,expires_in:3600,user:{id:uid,aud:"authenticated",role:"authenticated",email:"fixture@example.test",app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}})),{uid,exp,token});
  await page.goto(`${base}/explore`);const save=page.getByRole("button",{name:/^Save /}).first();await save.waitFor();await page.waitForFunction(()=>!document.querySelector('.reactions button:last-child')?.disabled);
  await page.getByRole("button",{name:/^Unsave /}).first().waitFor();
  await page.goto(`${base}/saved`);await page.locator(".gallery-card").waitFor();assert.equal(await page.locator(".gallery-card").count(),1);
  await state({reactionFailure:true});const like=page.getByRole("button",{name:/^Like /}).first();await like.click();await page.getByText("That change could not be saved. Please try again.",{exact:true}).waitFor();assert.equal(await like.getAttribute("aria-pressed"),"false");
  await state({reactionFailure:false});
 });
 await check("Empty catalogue, upstream failure and narrow-screen accessibility",async()=>{
  await state({empty:true});await page.goto(base);await page.getByRole("heading",{name:"A little inspiration is on its way."}).waitFor();
  await state({empty:false,failure:true});await page.goto(`${base}/explore`);await page.getByRole("button",{name:"Retry collection",exact:true}).waitFor();
  await state({failure:false});await page.getByRole("button",{name:"Retry collection",exact:true}).click();await page.locator(".gallery-card").first().waitFor();
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>[...document.querySelectorAll(".gallery-card")].every(e=>Number(getComputedStyle(e).opacity)>.99));const audit=await new AxeBuilder({page}).analyze();assert.deepEqual(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[]);
  await page.screenshot({path:`${output}/mobile.png`,fullPage:true});
 });
 assert.deepEqual(errors,[]);
 await writeFile(`${output}/verification.json`,JSON.stringify({passed,errors,auth:"fixture only",at:new Date().toISOString()},null,2));
}finally{await state({empty:false,failure:false,reactionFailure:false});await browser.close();}
