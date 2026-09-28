import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { contentService, filterPosts, posts } from "../src/lib/content";
import { accountService } from "../src/lib/account";

test("twenty unique designs, four dated collections and exactly five in the latest", async () => {
  assert.equal(posts.length, 20);
  assert.equal(new Set(posts.map((p) => p.id)).size, 20);
  const collection = await contentService.daily("2026-09-28");
  assert.equal(collection.date, "2026-09-27");
  assert.equal(collection.posts.length, 5);
  for (const date of new Set(posts.map((p) => p.publishedAt)))
    assert.equal(posts.filter((p) => p.publishedAt === date).length, 5);
});
test("theme filters use OR, while search and style narrow the result", () => {
  const result = filterPosts({
    themes: ["Focus", "Calm"],
    search: "quiet",
    style: "Minimal",
  });
  assert.deepEqual(
    result.posts.map((p) => p.slug),
    ["quiet-is-strength"],
  );
  assert.equal(filterPosts({ search: "nothing_matches_this" }).total, 0);
  assert.equal(filterPosts({ date: "2026-09-26" }).total, 5);
});
test("sorting, pagination and direct slug lookup", async () => {
  const first = filterPosts({ sort: "liked", limit: 8 });
  const second = filterPosts({ sort: "liked", offset: 8, limit: 8 });
  assert.equal(first.total, 20);
  assert.equal(first.posts.length, 8);
  assert.ok(
    first.posts.every((p, i, a) => !i || a[i - 1].likeCount >= p.likeCount),
  );
  assert.equal(
    first.posts.filter((p) => second.posts.some((q) => q.id === p.id)).length,
    0,
  );
  assert.equal(
    (await contentService.bySlug("one-step-closer"))?.id,
    "one-step-closer",
  );
  assert.equal(await contentService.bySlug("missing"), null);
});
test("every advertised asset exists with the correct dimensions and JPEG type", async () => {
  for (const p of posts) {
    assert.ok(p.versions.mobile && p.versions.desktop);
    assert.ok(p.quote && p.thumbnail.alt);
    for (const asset of [
      p.thumbnail,
      p.hero,
      p.mobileHero,
      ...Object.values(p.versions),
    ]) {
      const metadata = await sharp(
        await readFile(`public${asset.src}`),
      ).metadata();
      assert.equal(metadata.width, asset.width, asset.src);
      assert.equal(metadata.height, asset.height, asset.src);
      assert.equal(metadata.format, "jpeg");
    }
    assert.notEqual(p.versions.mobile!.src, p.versions.desktop!.src);
  }
});
test("demo likes are idempotent, saves are separate, profile persists after sign out", async () => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
  });
  assert.equal(await accountService.read(), null);
  const p = await accountService.signIn("google-demo");
  assert.equal(p.id, "local-demo-user");
  await accountService.react("liked", "one-step-closer", true);
  await accountService.react("liked", "one-step-closer", true);
  assert.deepEqual((await accountService.read())?.liked, ["one-step-closer"]);
  assert.deepEqual((await accountService.read())?.saved, []);
  await accountService.react("saved", "find-your-focus", true);
  await accountService.react("liked", "one-step-closer", false);
  await accountService.signOut();
  assert.equal(await accountService.read(), null);
  const again = await accountService.signIn("email-demo");
  assert.deepEqual(again.saved, ["find-your-focus"]);
  assert.deepEqual(again.liked, []);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => {
        throw new Error("Storage blocked");
      },
    },
  });
  await assert.rejects(accountService.read());
});
