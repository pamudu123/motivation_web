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
 await check("Sign-in and sign-up pages link to each other and keep safe return paths",async()=>{
  await page.goto(`${base}/profile`);await page.locator("#main").getByRole("link",{name:"Sign in",exact:true}).click();
  await page.waitForURL(`${base}/signin?next=%2Fprofile`);await page.getByRole("heading",{level:1,name:"Welcome back"}).waitFor();
  assert.equal(await page.getByRole("button",{name:"Send sign-in link"}).count(),1);assert.equal(await page.getByRole("button",{name:"Continue with Google"}).count(),1);
  assert.equal((await new AxeBuilder({page}).analyze()).violations.length,0);
  await page.getByRole("link",{name:"Create a free account"}).click();await page.waitForURL(`${base}/signup?next=%2Fprofile`);
  await page.getByRole("heading",{level:1,name:"Create your free account"}).waitFor();
  await page.goto(`${base}/signin?next=${encodeURIComponent("//evil.test")}`);await page.getByRole("heading",{level:1,name:"Welcome back"}).waitFor();
  assert.equal(await page.getByRole("link",{name:"Create a free account"}).getAttribute("href"),"/signup?next=%2Fsaved");
 });
 await check("Guest Save opens the save dialog and dismissing it abandons the pending save",async()=>{
  await page.goto(`${base}/explore`);await page.getByRole("button",{name:/^Save /}).first().click();
  await page.getByRole("dialog").getByRole("heading",{name:"Sign in to save this wallpaper"}).waitFor();
  assert.ok(await page.evaluate(()=>localStorage.getItem("daily-spark-pending-v1")));
  assert.equal((await new AxeBuilder({page}).analyze()).violations.length,0);
  await page.keyboard.press("Escape");await page.getByRole("dialog").waitFor({state:"hidden"});
  assert.equal(await page.evaluate(()=>localStorage.getItem("daily-spark-pending-v1")),null);
 });
 await check("Auth form keyboard, focus, error, email-sent and reflow behaviour (provider calls intercepted)",async()=>{
  const focusedIs=sel=>page.waitForFunction(s=>document.activeElement?.matches(s),sel);
  const noOverflow=()=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth);
  let otp={status:429,body:{code:"over_email_send_rate_limit",error_code:"over_email_send_rate_limit",msg:"email rate limit exceeded"}};
  await page.route("**/auth/v1/otp**",route=>route.fulfill({status:otp.status,contentType:"application/json",body:JSON.stringify(otp.body)}));
  try{
   await page.setViewportSize({width:320,height:640});
   await page.goto(`${base}/explore`);const opener=page.getByRole("button",{name:/^Save /}).first();await opener.focus();await page.keyboard.press("Enter");
   await focusedIs("#auth-title");
   for(let i=0;i<12;i++){await page.keyboard.press("Tab");assert.ok(await page.locator("dialog").evaluate(d=>d.contains(document.activeElement)),"focus left the dialog");}
   await page.getByLabel("Email address").fill("reader@example.test");await page.getByLabel("Email address").press("Enter");
   await focusedIs("dialog [role=alert]");assert.equal(await page.locator("dialog [role=alert]").innerText(),"Too many requests. Wait a minute and try again.");
   assert.ok(await page.locator("dialog").evaluate(d=>d.scrollWidth<=d.clientWidth));assert.ok(await noOverflow());
   assert.equal((await new AxeBuilder({page}).analyze()).violations.length,0);
   await page.keyboard.press("Escape");await page.getByRole("dialog").waitFor({state:"hidden"});
   assert.ok(await opener.evaluate(b=>b===document.activeElement),"focus did not return to the Save button");
   otp={status:200,body:{}};
   await page.goto(`${base}/signin`);await page.getByLabel("Email address").fill("  reader@example.test ");await page.getByRole("button",{name:"Send sign-in link"}).click();
   await page.getByRole("heading",{level:1,name:"Check your email"}).waitFor();await focusedIs("#auth-title");
   assert.match(await page.locator(".email-success").innerText(),/reader@example\.test\./);
   assert.ok(await page.getByRole("button",{name:/^Resend link in \d+s$/}).isDisabled());assert.ok(await noOverflow());
   await page.getByRole("button",{name:"Use a different email"}).click();await focusedIs("#auth-email");
   // 200 percent browser zoom on a 1280px window gives a 640 CSS px viewport (media queries apply).
   await page.setViewportSize({width:640,height:450});
   assert.ok(await noOverflow(),"sign-in page overflows at 200 percent zoom");
   await page.screenshot({path:`${output}/signin-200-percent.png`,fullPage:true});
  }finally{await page.unroute("**/auth/v1/otp**");await page.setViewportSize({width:1280,height:900});}
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
  await page.goto(`${base}/signin`);await page.waitForURL(`${base}/saved`);
 });
 await check("An exhausted session returns to the signed-out state, not an outage",async()=>{
  await page.route("**/auth/v1/**",route=>route.fulfill({status:400,contentType:"application/json",body:JSON.stringify({code:"refresh_token_not_found",error_code:"refresh_token_not_found",msg:"Invalid Refresh Token: Refresh Token Not Found"})}));
  await state({meUnauthorized:true});
  try{
   await page.goto(`${base}/saved`);await page.getByRole("heading",{level:1,name:"Sign in to see your saved wallpapers."}).waitFor();
   assert.equal(await page.getByText("Your account could not load.").count(),0);
   await page.waitForFunction(()=>!Object.keys(localStorage).some(k=>k.endsWith("-auth-token")));
  }finally{await state({meUnauthorized:false});await page.unroute("**/auth/v1/**");}
 });
 await check("Empty catalogue, upstream failure and narrow-screen accessibility",async()=>{
  await state({empty:true});await page.goto(base);await page.getByRole("heading",{name:"Your first collection is on its way"}).waitFor();
  await state({empty:false,failure:true});await page.goto(`${base}/explore`);await page.getByRole("button",{name:"Retry collection",exact:true}).waitFor();
  await state({failure:false});await page.getByRole("button",{name:"Retry collection",exact:true}).click();await page.locator(".gallery-card").first().waitFor();
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>[...document.querySelectorAll(".gallery-card")].every(e=>Number(getComputedStyle(e).opacity)>.99));const audit=await new AxeBuilder({page}).analyze();assert.deepEqual(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[]);
  await page.screenshot({path:`${output}/mobile.png`,fullPage:true});
 });
 assert.deepEqual(errors,[]);
 await writeFile(`${output}/verification.json`,JSON.stringify({passed,errors,auth:"fixture only",at:new Date().toISOString()},null,2));
}finally{await state({empty:false,failure:false,reactionFailure:false,meUnauthorized:false});await browser.close();}
