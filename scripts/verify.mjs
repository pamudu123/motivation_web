import { chromium } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import sharp from "sharp";
const base = process.env.TEST_URL || "http://localhost:3000";
const out =
  process.env.TEST_OUTPUT ||
  `test-results/run-${new Date().toISOString().replaceAll(":", "-")}`;
await mkdir(out, { recursive: true });
const match = new RegExp(process.env.TEST_MATCH || ".");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const reports = [];
const errors = [];
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
  permissions: ["clipboard-read", "clipboard-write"],
});
async function safeContext(ctx) {
  await ctx.addInitScript(() => {
    Element.prototype.setPointerCapture = function () {};
    Element.prototype.releasePointerCapture = function () {};
    Element.prototype.requestPointerLock = function () {};
  });
}
await safeContext(context);
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
async function check(name, work) {
  if (!match.test(name)) return;
  await work();
  reports.push(name);
  console.log(`PASS ${name}`);
}
async function settled(p = page) {
  await p.waitForLoadState("networkidle");
  await p.evaluate(() => document.fonts.ready);
}
async function screenshot(name, p = page) {
  await settled(p);
  const original = await p.evaluate(() => scrollY);
  const height = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await p.evaluate(
      (y) => window.scrollTo({ top: y, behavior: "instant" }),
      y,
    );
    await p.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
  }
  await p.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    original,
  );
  await p.waitForFunction(() =>
    [...document.querySelectorAll(".gallery-card,.device")].every(
      (e) => Number(getComputedStyle(e).opacity) > 0.99,
    ),
  );
  await p.waitForFunction(() =>
    [...document.querySelectorAll("img")].every((e) => e.complete),
  );
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
try {
  await check(
    "Today has exactly five designs and no broken imagery",
    async () => {
      await page.goto(base);
      await settled();
      assert.match(await page.title(), /Daily Spark/);
      assert.equal(
        await page.locator('#daily [data-testid="gallery-card"]').count(),
        5,
      );
      assert.equal(
        await page
          .locator("img")
          .evaluateAll(
            (imgs) => imgs.filter((i) => i.complete && !i.naturalWidth).length,
          ),
        0,
      );
      await screenshot("today-desktop");
      for (const [n, y] of [0, 350, 780, 1200].entries()) {
        await page.evaluate(
          (y) => window.scrollTo({ top: y, behavior: "instant" }),
          y,
        );
        await page.screenshot({ path: `${out}/scroll-desktop-${n}.png` });
      }
    },
  );
  await check(
    "Explore: search, OR themes, style, reset, sort, load more and history",
    async () => {
      await page.goto(`${base}/explore`);
      await settled();
      assert.equal(await page.getByTestId("gallery-card").count(), 8);
      await page
        .getByRole("button", { name: "Load more", exact: true })
        .click();
      await settled();
      assert.equal(await page.getByTestId("gallery-card").count(), 16);
      await page.getByRole("button", { name: "Focus", exact: true }).click();
      await page.getByRole("button", { name: "Calm", exact: true }).click();
      await settled();
      assert.ok(
        new URL(page.url()).searchParams.get("themes").includes("Focus,Calm"),
      );
      await page
        .getByRole("textbox", { name: "Search quotes, titles or themes" })
        .fill("quiet");
      await settled();
      assert.equal(await page.getByTestId("gallery-card").count(), 1);
      await page.getByRole("button", { name: "Reset filters" }).click();
      await settled();
      await page
        .getByRole("combobox", { name: "Sort wallpapers" })
        .selectOption("liked");
      await settled();
      await page.waitForFunction(
        () =>
          document.querySelector(".card-title")?.textContent ===
          "Beyond the ridge",
      );
      await page
        .getByRole("textbox", { name: "Search quotes, titles or themes" })
        .fill("zzznothing");
      await settled();
      assert.ok(
        await page
          .getByText("A fresh search might spark something.")
          .isVisible(),
      );
      await page.getByRole("button", { name: "Clear all filters" }).click();
      await settled();
      await screenshot("explore-desktop");
      await page.getByRole("button", { name: "Focus", exact: true }).click();
      await settled();
      await page.locator(".art-link").first().click();
      await settled();
      await page.getByRole("button", { name: "Back to collection" }).click();
      await settled();
      assert.match(page.url(), /themes=Focus/);
    },
  );
  await check(
    "Guest save resumes once after sign in, with consistent like/save state",
    async () => {
      await page.goto(base);
      await settled();
      await page
        .getByRole("button", { name: "Save One step closer", exact: true })
        .click();
      assert.ok(await page.getByRole("dialog").isVisible());
      assert.ok(!page.url().includes("/wallpaper/"));
      await page.getByRole("button", { name: "Continue with Google" }).click();
      await page.getByRole("button", { name: "Skip for now" }).waitFor();
      await page.getByRole("button", { name: "Skip for now" }).click();
      assert.equal(
        await page
          .getByRole("button", { name: "Unsave One step closer", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      await page
        .getByRole("button", { name: "Like One step closer", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "Unlike One step closer", exact: true })
          .innerText(),
        "129",
      );
      await page.goto(`${base}/saved`);
      await settled();
      assert.equal(await page.getByTestId("gallery-card").count(), 1);
      await page.reload();
      await settled();
      assert.equal(await page.getByTestId("gallery-card").count(), 1);
      await screenshot("saved-desktop");
    },
  );
  await check(
    "Direct detail refresh, all four formats, device overlays and exact download bytes",
    async () => {
      await page.goto(`${base}/wallpaper/one-step-closer`);
      await settled();
      await page.reload();
      await settled();
      assert.ok(
        await page
          .getByRole("heading", { name: "One step closer." })
          .isVisible(),
      );
      for (const [format, label, width, height] of [
        ["mobile", "Mobile", 1080, 1920],
        ["desktop", "Desktop", 2560, 1440],
        ["whatsapp", "WhatsApp Background", 1080, 1920],
        ["status", "WhatsApp Status", 1080, 1920],
      ]) {
        await page
          .getByRole("button", { name: new RegExp(`^${label} `) })
          .click();
        await settled();
        await page.waitForFunction(
          (format) =>
            document
              .querySelector(".device img")
              ?.getAttribute("src")
              ?.endsWith(`-${format}.jpg`),
          format,
        );
        const promise = page.waitForEvent("download");
        await page.getByRole("button", { name: /^Download / }).click();
        const download = await promise;
        assert.equal(
          download.suggestedFilename(),
          `one-step-closer-${format}.jpg`,
        );
        const file = await readFile(await download.path());
        assert.deepEqual(
          file,
          await readFile(`public/wallpapers/one-step-closer-${format}.jpg`),
        );
        const meta = await sharp(file).metadata();
        assert.equal(meta.width, width);
        assert.equal(meta.height, height);
      }
      await page.getByRole("button", { name: /^Mobile / }).click();
      await page.getByRole("checkbox", { name: "Device preview" }).uncheck();
      await page.locator(".plain-frame").waitFor({ state: "visible" });
      await page.getByRole("checkbox", { name: "Device preview" }).check();
      await screenshot("detail-desktop");
      await page.evaluate(() =>
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: undefined,
        }),
      );
      await page.getByRole("button", { name: "Share", exact: true }).click();
      await page.getByText("Wallpaper link copied.").waitFor();
      assert.equal(
        await page.evaluate(() => navigator.clipboard.readText()),
        `${base}/wallpaper/one-step-closer`,
      );
    },
  );
  await check("Profile editing, liked view and sign out", async () => {
    await page.goto(`${base}/profile`);
    await settled();
    await page.getByRole("button", { name: "Edit profile" }).click();
    await page
      .getByRole("textbox", { name: "Display name" })
      .fill("Morning Explorer");
    await page.getByRole("button", { name: "Growth", exact: true }).click();
    await page.getByRole("button", { name: "Save profile" }).click();
    await page.getByRole("heading", { name: "Morning Explorer" }).waitFor();
    await page.getByRole("button", { name: /^Liked / }).click();
    assert.equal(await page.getByTestId("gallery-card").count(), 1);
    await screenshot("profile-desktop");
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByText("Try the demo account", { exact: true }).waitFor();
    await page.goto(`${base}/saved`);
    await settled();
    assert.ok(
      await page.getByText("Try the demo account", { exact: true }).isVisible(),
    );
  });
  await check("Magic link demo and keyboard dialog closure", async () => {
    await page.getByRole("button", { name: "Try the demo account" }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await page.getByRole("button", { name: "Try the demo account" }).click();
    await page
      .getByRole("textbox", { name: "Email address" })
      .fill("sample@example.com");
    await page.getByRole("button", { name: "Create demo magic link" }).click();
    assert.ok(await page.getByText("Your demo link is ready.").isVisible());
    await page.getByRole("button", { name: "Open demo magic link" }).click();
    await page.getByRole("button", { name: "Skip for now" }).waitFor();
    await page.getByRole("button", { name: "Skip for now" }).click();
  });
  await check(
    "Missing post has a useful recovery path and is not indexed",
    async () => {
      const response = await page.goto(`${base}/wallpaper/not-a-real-post`);
      await settled();
      assert.ok([200, 404].includes(response.status()));
      assert.ok(
        await page
          .getByRole("link", { name: "Explore wallpapers", exact: true })
          .isVisible(),
      );
      assert.match(
        await page
          .locator('meta[name="robots"]')
          .first()
          .getAttribute("content"),
        /noindex/,
      );
    },
  );
  await check("Download failure is reported without success", async () => {
    await page.goto(`${base}/wallpaper/one-step-closer`);
    await settled();
    await page.route("**/one-step-closer-desktop.jpg", (route) =>
      route.abort(),
    );
    await page.getByRole("button", { name: /^Download / }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "download couldn’t start" })
      .waitFor();
    await page.unroute("**/one-step-closer-desktop.jpg");
  });
  await check(
    "Native sharing and blocked clipboard have working outcomes",
    async () => {
      await page.evaluate(() =>
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: async (data) => {
            window.__shared = data;
          },
        }),
      );
      await page.getByRole("button", { name: "Share", exact: true }).click();
      assert.equal(
        await page.evaluate(() => window.__shared.url),
        `${base}/wallpaper/one-step-closer`,
      );
      await page.evaluate(() => {
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: undefined,
        });
        navigator.clipboard.writeText = async () => {
          throw new Error("Blocked for test");
        };
      });
      await page.getByRole("button", { name: "Share", exact: true }).click();
      await page.getByRole("textbox", { name: "Copy this link" }).waitFor();
      assert.equal(
        await page
          .getByRole("textbox", { name: "Copy this link" })
          .inputValue(),
        `${base}/wallpaper/one-step-closer`,
      );
    },
  );
  await check(
    "Failed reaction storage rolls back the count and explains the failure",
    async () => {
      await page.goto(base);
      await settled();
      const before = await page
        .getByRole("button", { name: "Unlike One step closer", exact: true })
        .innerText();
      await page.evaluate(() => {
        Storage.prototype.setItem = function () {
          throw new Error("Blocked for test");
        };
      });
      await page
        .getByRole("button", { name: "Unlike One step closer", exact: true })
        .click();
      await page
        .getByText("That change could not be saved. Please try again.")
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Unlike One step closer", exact: true })
          .innerText(),
        before,
      );
    },
  );
  await check(
    "Broken image shows retry and recovers after the request succeeds",
    async () => {
      await page.route("**/one-step-closer-thumb.jpg", (route) =>
        route.abort(),
      );
      await page.goto(base);
      await settled();
      await page.getByText("Artwork couldn’t load", { exact: true }).waitFor();
      await page.unroute("**/one-step-closer-thumb.jpg");
      await page
        .getByRole("button", { name: "Retry image", exact: true })
        .click();
      await page.waitForFunction(() => {
        const img = document.querySelector("#daily img");
        return img?.complete && img.naturalWidth > 0;
      });
    },
  );
  await check(
    "Authentication errors, focus containment and browser Back dismissal",
    async () => {
      const ctx = await browser.newContext();
      await safeContext(ctx);
      const p = await ctx.newPage();
      await p.goto(`${base}/saved`);
      await settled(p);
      await p.getByRole("button", { name: "Try the demo account" }).click();
      await p.getByRole("dialog").waitFor();
      await p.keyboard.press("Shift+Tab");
      assert.equal(
        await p.evaluate(() =>
          document.querySelector("dialog").contains(document.activeElement),
        ),
        true,
      );
      const url = p.url();
      await p.goBack();
      await p.getByRole("dialog").waitFor({ state: "detached" });
      assert.equal(p.url(), url);
      await p.getByRole("button", { name: "Try the demo account" }).click();
      await p.evaluate(() => {
        Storage.prototype.setItem = function () {
          throw new Error("Blocked for test");
        };
      });
      await p.getByRole("button", { name: "Continue with Google" }).click();
      await p
        .getByRole("alert")
        .filter({ hasText: "Demo sign in could not finish" })
        .waitFor();
      await ctx.close();
    },
  );
  for (const [name, width, height, reduced] of [
    ["phone", 390, 844, false],
    ["compact", 360, 640, false],
    ["tablet", 768, 1024, false],
    ["reduced", 1440, 1000, true],
  ]) {
    await check(
      `${name}: layout, content, imagery, scrolling and accessibility`,
      async () => {
        const ctx = await browser.newContext({
          viewport: { width, height },
          reducedMotion: reduced ? "reduce" : "no-preference",
        });
        await safeContext(ctx);
        const p = await ctx.newPage();
        p.on("pageerror", (e) => errors.push(e.message));
        await p.goto(base);
        await settled(p);
        await screenshot(`today-${name}`, p);
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `${name} overflow`,
        );
        for (const section of ["#daily", ".mood-section", ".archive-section"]) {
          await p.locator(section).scrollIntoViewIfNeeded();
          await p.screenshot({
            path: `${out}/${name}-${section.replace(/[.#]/g, "")}.png`,
          });
        }
        const axe = await new AxeBuilder({ page: p })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        await writeFile(
          `${out}/axe-${name}.json`,
          JSON.stringify(axe.violations, null, 2),
        );
        assert.equal(
          axe.violations.length,
          0,
          JSON.stringify(
            axe.violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => n.target),
            })),
          ),
        );
        await p.goto(`${base}/wallpaper/one-step-closer`);
        await settled(p);
        await screenshot(`detail-${name}`, p);
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        if (width < 640) {
          assert.equal(
            await p.locator(".preview-stage").getAttribute("data-format"),
            "mobile",
          );
          await p.goto(`${base}/explore`);
          await settled(p);
          await p.getByRole("button", { name: "Filters", exact: true }).click();
          await p.getByRole("button", { name: "Focus", exact: true }).click();
          await settled(p);
          assert.ok(
            new URL(p.url()).searchParams.get("themes").includes("Focus"),
          );
          await screenshot(`filters-${name}`, p);
        }
        await ctx.close();
      },
    );
  }
  assert.deepEqual(errors, []);
  console.log(`Verified ${reports.length} workflows, no browser exceptions.`);
} finally {
  await writeFile(
    `${out}/verification.json`,
    JSON.stringify(
      { base, passed: reports, errors, checkedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log(`Evidence: ${out}`);
  await browser.close();
}
