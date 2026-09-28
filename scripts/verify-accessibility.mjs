import { chromium } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.TEST_URL || "http://localhost:3000";
const out = `test-results/accessibility-${new Date().toISOString().replaceAll(":", "-")}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  acceptDownloads: true,
});
await context.addInitScript(() => {
  Element.prototype.setPointerCapture = function () {};
  Element.prototype.releasePointerCapture = function () {};
  Element.prototype.requestPointerLock = function () {};
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
const errors = [];
const passed = [];
page.on("pageerror", (e) => errors.push(e.message));
async function settled() {
  await page.waitForLoadState("networkidle");
}
async function tabTo(locator) {
  for (let i = 0; i < 180; i++) {
    if (
      await locator.evaluateAll((nodes) =>
        nodes.includes(document.activeElement),
      )
    )
      return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Keyboard could not reach ${locator}`);
}
async function activate(locator) {
  await tabTo(locator);
  await page.keyboard.press("Enter");
  await settled();
}
async function focused(selector) {
  try {
    await page.waitForFunction(
      (selector) => document.activeElement?.matches(selector),
      selector,
      { timeout: 10000 },
    );
  } catch (error) {
    console.log(
      await page.evaluate(() => ({
        path: location.pathname,
        active: document.activeElement?.outerHTML.slice(0, 300),
        heading: document.querySelector("main h1")?.outerHTML,
      })),
    );
    throw error;
  }
}
async function scan(name) {
  await settled();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".gallery-card,.device")].every(
      (node) => Number(getComputedStyle(node).opacity) > 0.99,
    ),
  );
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  await writeFile(
    `${out}/${name}-axe.json`,
    JSON.stringify(result.violations, null, 2),
  );
  assert.deepEqual(
    result.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
    [],
  );
  await writeFile(
    `${out}/${name}-reading-order.txt`,
    await page.locator("body").ariaSnapshot(),
  );
  await writeFile(
    `${out}/${name}-ax-tree.json`,
    JSON.stringify(await cdp.send("Accessibility.getFullAXTree"), null, 2),
  );
  console.log(`PASS accessibility scan: ${name}`);
}
async function reflow() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Document overflow",
  );
}
try {
  await page.goto(base);
  await settled();
  await activate(page.getByRole("link", { name: "Skip to content" }));
  await focused("main");
  await activate(
    page.getByRole("button", { name: "Search wallpapers", exact: true }),
  );
  await focused("#wallpaper-search");
  await page.keyboard.type("one step");
  await settled();
  assert.match(
    await page.locator("#search-results-status").innerText(),
    /1 wallpapers/,
  );
  await scan("search-results");
  await activate(
    page.getByRole("link", { name: "Preview One step closer", exact: true }),
  );
  await focused("main h1");
  await scan("detail");
  await activate(
    page.getByRole("button", { name: "Save One step closer", exact: true }),
  );
  await focused("#auth-title");
  await scan("signin");
  await activate(page.getByRole("button", { name: /Continue with Google/ }));
  await focused("#auth-title");
  assert.match(
    await page.locator("dialog [role=status]").innerText(),
    /Wallpaper saved/,
  );
  await scan("themes");
  await activate(
    page.getByRole("button", { name: "Skip for now", exact: true }),
  );
  await focused('button[aria-label="Unsave One step closer"]');
  await activate(page.getByRole("button", { name: /^Mobile 1080/ }));
  assert.match(await page.locator(".studio-bottom").innerText(), /Mobile/);
  await tabTo(
    page.getByRole("button", {
      name: "Download mobile wallpaper",
      exact: true,
    }),
  );
  const download = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  assert.match((await download).suggestedFilename(), /mobile\.jpg$/);
  await settled();
  assert.match(
    await page.locator(".toast").innerText(),
    /download has started/,
  );
  passed.push(
    "Keyboard-only search, preview, demo sign-in, pending save, format and download",
  );

  await activate(
    page
      .getByRole("link", { name: "Saved", exact: true })
      .filter({ visible: true }),
  );
  await focused("main h1");
  await activate(
    page.getByRole("button", { name: "Unsave One step closer", exact: true }),
  );
  await focused("main h1");
  await scan("empty-saved");
  await activate(page.getByRole("link", { name: "Your profile", exact: true }));
  await activate(
    page.getByRole("button", { name: "Edit profile", exact: true }),
  );
  await focused("#display-name");
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("Keyboard Explorer");
  await activate(
    page.getByRole("button", { name: "Save profile", exact: true }),
  );
  await focused(".profile-top button");
  await scan("profile");
  await activate(page.getByRole("button", { name: "Sign out", exact: true }));
  await focused("main h1");
  await activate(
    page.getByRole("button", { name: "Try the demo account", exact: true }),
  );
  await activate(page.getByRole("button", { name: /Continue with Google/ }));
  await activate(
    page.getByRole("button", { name: "Skip for now", exact: true }),
  );
  await focused("main h1");
  passed.push(
    "Focus recovery after removed saved card, profile save, sign-out and replaced dialog opener",
  );

  for (const width of [640, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, route] of [
      ["explore", "/explore?themes=Focus,Calm&style=Nature"],
      ["detail", "/wallpaper/one-step-closer"],
      ["profile", "/profile"],
      ["liked", "/liked"],
    ]) {
      await page.goto(`${base}${route}`);
      await settled();
      await reflow();
      await scan(`${name}-${width}`);
      await page.screenshot({
        path: `${out}/${name}-${width}.png`,
        fullPage: true,
      });
    }
  }
  passed.push(
    "640px zoom-equivalent layout and 320px reflow, interactive routes and accessibility trees",
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base}/profile`);
  await settled();
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await reflow();
  await activate(
    page.getByRole("button", { name: "Edit profile", exact: true }),
  );
  await focused("#display-name");
  await page.screenshot({
    path: `${out}/profile-css-200-percent.png`,
    fullPage: true,
  });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "";
  });
  passed.push(
    "200 percent CSS magnification stress check (not browser toolbar zoom)",
  );

  await page.goto(`${base}/explore`);
  await settled();
  await activate(page.getByRole("button", { name: "Load more", exact: true }));
  await focused("#search-results-status");
  await activate(page.getByRole("button", { name: "Load more", exact: true }));
  await focused("#search-results-status");
  await activate(page.getByRole("button", { name: "Focus", exact: true }));
  await activate(
    page.getByRole("button", { name: "Reset filters", exact: true }),
  );
  await focused("#wallpaper-search");
  passed.push(
    "Filter reset and final Load more keep a meaningful focus target",
  );

  await page.evaluate(() => localStorage.clear());
  await page.goto(`${base}/profile`);
  await settled();
  await page.setViewportSize({ width: 320, height: 640 });
  await activate(
    page.getByRole("button", { name: "Try the demo account", exact: true }),
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Test blocked storage");
    };
  });
  await activate(page.getByRole("button", { name: /Continue with Google/ }));
  await focused("dialog [role=alert]");
  await scan("auth-error-320");
  // Deliberate long-copy fixture: exercise wrapping without changing production copy.
  await page.locator("dialog [role=alert]").evaluate((node) => {
    node.textContent +=
      " Your browser blocked this change. Try again after enabling storage. ".repeat(
        8,
      );
  });
  await reflow();
  assert.ok(
    await page
      .locator("dialog")
      .evaluate((node) => node.scrollWidth <= node.clientWidth),
  );
  await page.screenshot({
    path: `${out}/long-auth-error-320.png`,
    fullPage: true,
  });
  await page.keyboard.press("Shift+Tab");
  assert.ok(
    await page
      .locator("dialog")
      .evaluate((node) => node.contains(document.activeElement)),
  );
  await page.keyboard.press("Escape");
  await focused(".guest-state button");
  await page.goto(`${base}/wallpaper/one-step-closer`);
  await settled();
  await page.route("**/wallpapers/*-mobile.jpg", (route) => route.abort());
  await activate(
    page.getByRole("button", {
      name: "Download mobile wallpaper",
      exact: true,
    }),
  );
  assert.match(
    await page.locator(".download-bar [role=alert]").innerText(),
    /couldn’t start/,
  );
  await scan("download-error-320");
  await page.unroute("**/wallpapers/*-mobile.jpg");
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const [name, route] of [
    ["explore", "/explore"],
    ["detail", "/wallpaper/one-step-closer"],
    ["signin", "/profile"],
  ]) {
    await page.goto(`${base}${route}`);
    await settled();
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    if (name === "signin")
      await activate(
        page.getByRole("button", { name: "Try the demo account", exact: true }),
      );
    await reflow();
    await page.screenshot({
      path: `${out}/${name}-css-200-percent.png`,
      fullPage: true,
    });
    if (name === "signin") await page.keyboard.press("Escape");
  }
  passed.push(
    "Auth/download errors, long-copy dialog reflow, Escape recovery and 200 percent CSS stress on search/detail/sign-in",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/report.json`,
    JSON.stringify(
      {
        passed,
        errors,
        limitation: "No live screen reader or browser toolbar zoom tested",
        base,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed, out }, null, 2));
} finally {
  await browser.close();
}
