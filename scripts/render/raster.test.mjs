import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { renderPoster, renderDailies, openDailies, openPoster } from "./raster.mjs";
import { fetchProjects, selectDailies } from "../data/projects.mjs";
import { POSTERS } from "../content.mjs";

// Offline stand-in for a remote cover: a busy gradient so the PNG has real content.
const COVER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750">` +
      `<defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#2b5876"/><stop offset="1" stop-color="#e96443"/></linearGradient></defs>` +
      `<rect width="1200" height="750" fill="url(#g)"/><circle cx="600" cy="375" r="220" fill="#f2f1ee" fill-opacity=".6"/></svg>`
  );

const fixture = readFileSync(new URL("../data/fixtures/projects.json", import.meta.url), "utf8");
const { projects } = await fetchProjects("https://example.test", async () => new Response(fixture));
const frames = selectDailies(
  projects,
  POSTERS.map((p) => p.slug)
).map((p) => ({ ...p, cover: COVER }));

/** Width and height from a PNG's IHDR chunk (bytes 16–23). */
function pngSize(file) {
  const buf = readFileSync(file);
  assert.equal(buf.toString("ascii", 1, 4), "PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

let browser;
let dir;
before(async () => {
  browser = await chromium.launch();
  dir = mkdtempSync(join(tmpdir(), "raster-"));
});
after(async () => {
  await browser?.close();
  rmSync(dir, { recursive: true, force: true });
});

for (const theme of ["dark", "light"]) {
  test(`poster (${theme}): PNG is 540×720`, async () => {
    const out = join(dir, `poster-${theme}.png`);
    await renderPoster(browser, theme, POSTERS[0], COVER, out);
    assert.deepEqual(pngSize(out), { width: 540, height: 720 });
  });

  test(`poster (${theme}): without cover still renders`, async () => {
    const out = join(dir, `poster-null-${theme}.png`);
    await renderPoster(browser, theme, POSTERS[2], null, out);
    assert.deepEqual(pngSize(out), { width: 540, height: 720 });
    assert.ok(statSync(out).size >= 1024);
  });

  test(`dailies (${theme}): PNG is 1660 px wide and under 900 KB`, async () => {
    assert.equal(frames.length, 6);
    const out = join(dir, `dailies-${theme}.png`);
    await renderDailies(browser, theme, frames, out);
    assert.equal(pngSize(out).width, 1660);
    assert.ok(statSync(out).size < 900 * 1024);
  });

  test(`dailies (${theme}): zero frames renders the empty strip`, async () => {
    const out = join(dir, `dailies-empty-${theme}.png`);
    await renderDailies(browser, theme, [], out);
    assert.equal(pngSize(out).width, 1660);
  });
}

test("dailies captions: numbered from 04, uppercase mono, long names ellipsised", async () => {
  const long = { slug: "x", name: "A very long project name that cannot fit in one frame", cover: COVER };
  const page = await openDailies(browser, "dark", [...frames.slice(0, 5), long]);
  try {
    const captions = await page.$$eval("figcaption", (els) =>
      els.map((el) => {
        const cs = getComputedStyle(el);
        return {
          text: el.textContent,
          transform: cs.textTransform,
          font: cs.fontFamily,
          textOverflow: cs.textOverflow,
          overflows: el.scrollWidth > el.clientWidth,
        };
      })
    );
    assert.equal(captions.length, 6);
    assert.equal(captions[0].text, `04 · ${frames[0].name}`);
    assert.equal(captions[5].text, `09 · ${long.name}`);
    for (const c of captions) {
      assert.equal(c.transform, "uppercase");
      assert.match(c.font, /Geist Mono/);
      assert.equal(c.textOverflow, "ellipsis");
    }
    assert.ok(captions[5].overflows, "long caption should overflow its frame and be ellipsised");
  } finally {
    await page.close();
  }
});

test("poster: a cover that fails to load throws instead of drawing a broken image", async () => {
  const missing = new URL("./templates/no-such-cover.jpg", import.meta.url).href;
  await assert.rejects(
    renderPoster(browser, "dark", POSTERS[0], missing, join(dir, "poster-broken.png")),
    /cover image failed to load/
  );
});

test("poster: the cover uses the poster's focal point (shipreel reads from the left)", async () => {
  const shipreel = POSTERS.find((p) => p.slug === "shipreel");
  const page = await openPoster(browser, "dark", shipreel, COVER);
  try {
    const pos = await page.$eval("img.cover", (img) => getComputedStyle(img).objectPosition);
    assert.equal(pos, "0% 50%");
  } finally {
    await page.close();
  }
});

test("poster: dark and light render the same card (R9)", async () => {
  const a = join(dir, "same-dark.png");
  const b = join(dir, "same-light.png");
  await renderPoster(browser, "dark", POSTERS[1], COVER, a);
  await renderPoster(browser, "light", POSTERS[1], COVER, b);
  assert.ok(readFileSync(a).equals(readFileSync(b)));
});
