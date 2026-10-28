import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderReadme } from "./readme.mjs";
import { build } from "./build.mjs";
import { renderButton } from "./render/button.mjs";
import { POSTERS, LINKS } from "./content.mjs";

const STATS = { total: 5077, activeDays: 233, longestStreak: 27, shipped: 30 };
const DAILIES = [
  { slug: "brand-bible", name: "Brand Bible" },
  { slug: "heartrank", name: "HeartRank" },
  { slug: "vuna-calc", name: "VUNA Calc" },
];
const readme = renderReadme({ dailies: DAILIES, stats: STATS });

// Offline stand-in for remote covers, so build tests never touch the network.
const COVER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#2b5876"/></svg>`
  );
const calendar = readFileSync(new URL("./data/fixtures/calendar.html", import.meta.url), "utf8");
const projectsBody = (() => {
  const body = JSON.parse(readFileSync(new URL("./data/fixtures/projects.json", import.meta.url), "utf8"));
  for (const d of body.docs) if (d.image) d.image.url = COVER;
  return JSON.stringify(body);
})();

/** A fetch stub: the named source answers 500, the other answers from fixtures. */
const failing = (source) => async (url) => {
  const u = String(url);
  if (u.includes(source)) return new Response("down", { status: 500 });
  if (u.includes("/users/")) return new Response(calendar);
  if (u.includes("/api/projects")) return new Response(projectsBody);
  throw new Error(`unexpected fetch ${u}`);
};

const pair = (name, ext = "svg") =>
    new RegExp(
      `<picture><source media="\\(prefers-color-scheme: dark\\)" srcset="assets/${name}-dark\\.${ext}">` +
        `<img src="assets/${name}-light\\.${ext}" alt="[^"]{3,}"[^>]*></picture>`
    );

  test("README has dark/light pairs for every designed image", () => {
    for (const name of ["slate", "stats", "receipts", "callsheet", "button-hire", "button-site", "button-linkedin"]) {
      assert.match(readme, pair(name), name);
    }
    assert.match(readme, pair("dailies", "png"), "dailies");
  });

  test("posters are one plain image each (R9), not a pair", () => {
    for (const { slug } of POSTERS) {
      assert.match(readme, new RegExp(`<img src="assets/poster-${slug}\\.png" alt="[^"]{10,}"`), slug);
      assert.doesNotMatch(readme, new RegExp(`poster-${slug}-(dark|light)`), slug);
  }
});

test("README order: slate, stats, statement, then the sections", () => {
  const at = (s) => {
    const i = readme.indexOf(s);
    assert.ok(i >= 0, `missing ${s}`);
    return i;
  };
  const order = [
    "assets/slate-dark.svg",
    "assets/stats-dark.svg",
    "I build products end to end",
    "## Now showing",
    "## Dailies",
    "## Receipts",
    "## On every set",
    "## Call sheet",
    "assets/button-hire-dark.svg",
  ].map(at);
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  // Slate and stats share one paragraph: no blank line between them.
  const between = readme.slice(at("assets/slate-dark.svg"), at("assets/stats-dark.svg"));
  assert.doesNotMatch(between, /\n\s*\n/);
});

test("README has no third-party images except skillicons", () => {
  const refs = [...readme.matchAll(/\b(?:src|srcset)="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 10);
  for (const ref of refs) {
    assert.ok(/^assets\/[\w.-]+$/.test(ref) || ref.startsWith("https://skillicons.dev/"), ref);
  }
});

test("every poster and daily links to its case file", () => {
  for (const { slug } of POSTERS) {
    assert.match(readme, new RegExp(`<a href="${LINKS.caseFile(slug)}"><img src="assets/poster-${slug}\\.png"`), slug);
  }
  const line = readme.match(/<!-- dailies:start -->\n?([\s\S]*?)\n?<!-- dailies:end -->/)?.[1];
  assert.ok(line, "dailies markers present");
  for (const { slug, name } of DAILIES) {
    assert.ok(line.includes(`<a href="${LINKS.caseFile(slug)}">${name}</a>`), slug);
  }
  assert.equal(line.split(" · ").length, DAILIES.length);
});

test("stack rows and call-sheet buttons link where they should", () => {
  assert.equal(readme.match(/<b>[^<]+<\/b><br><img src="https:\/\/skillicons\.dev\/icons\?i=/g)?.length, 6);
  for (const [name, href] of [["hire", LINKS.hire], ["site", LINKS.site], ["linkedin", LINKS.linkedin]]) {
    assert.match(readme, new RegExp(`<a href="${href}"><picture><source [^>]*srcset="assets/button-${name}-dark\\.svg"`), name);
  }
});

test("no emoji and no org names", () => {
  assert.doesNotMatch(readme, /\p{Extended_Pictographic}/u);
  assert.doesNotMatch(readme, /apexlearn|coresystech|NRS|Upspace/i);
});

test("buttons: outlined text, accessible, primary is filled ember", () => {
  for (const theme of ["dark", "light"]) {
    const primary = renderButton(theme, { label: "Hire me", variant: "primary" });
    const secondary = renderButton(theme, { label: "LinkedIn", variant: "secondary" });
    for (const svg of [primary, secondary]) {
      assert.doesNotMatch(svg, /<text\b/);
      assert.match(svg, /^<svg\b[^>]*\brole="img"/);
    }
    assert.match(primary, /<title[^>]*>Hire me<\/title>/);
    assert.match(primary, /fill="#ff5227"/);
    assert.doesNotMatch(secondary, /fill="#ff5227"/);
  }
});

// ---- build(): fallbacks keep the last good images byte for byte (R2) ----

const LAST_GOOD = {
  total: 4000,
  activeDays: 200,
  longestStreak: 20,
  shipped: 28,
  dailies: [{ slug: "old-daily", name: "Old Daily", cover: COVER }],
  posterCovers: Object.fromEntries(POSTERS.map((p) => [p.slug, COVER])),
};
const OLD = {
  "assets/stats-dark.svg": "<svg>old stats dark</svg>",
  "assets/stats-light.svg": "<svg>old stats light</svg>",
  "assets/dailies-dark.png": "old dailies dark",
  "assets/dailies-light.png": "old dailies light",
  ...Object.fromEntries(POSTERS.map((p) => [`assets/poster-${p.slug}.png`, `old poster ${p.slug}`])),
};

let dirs = [];
function seeded({ data = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "build-"));
  dirs.push(dir);
  mkdirSync(join(dir, "assets"));
  for (const [path, bytes] of Object.entries(OLD)) writeFileSync(join(dir, path), bytes);
  if (data) writeFileSync(join(dir, "assets/data.json"), JSON.stringify(LAST_GOOD));
  return dir;
}
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

test("contributions failure keeps last stats", { timeout: 120_000 }, async () => {
  const dir = seeded();
  const { wrote, kept } = await build({ live: true, fetchImpl: failing("/users/"), outDir: dir });
  assert.ok(kept.includes("assets/stats-dark.svg") && kept.includes("assets/stats-light.svg"));
  assert.equal(readFileSync(join(dir, "assets/stats-dark.svg"), "utf8"), OLD["assets/stats-dark.svg"]);
  assert.equal(readFileSync(join(dir, "assets/stats-light.svg"), "utf8"), OLD["assets/stats-light.svg"]);
  // Everything else is still written from the live projects data.
  assert.ok(wrote.includes("README.md") && wrote.includes("assets/dailies-dark.png"));
  assert.notEqual(readFileSync(join(dir, "assets/dailies-dark.png"), "utf8"), OLD["assets/dailies-dark.png"]);
  const data = JSON.parse(readFileSync(join(dir, "assets/data.json"), "utf8"));
  assert.equal(data.total, LAST_GOOD.total);
  // R15: the kept stats image, its alt text and data.json all keep the last good numbers.
  assert.equal(data.shipped, LAST_GOOD.shipped);
  const md = readFileSync(join(dir, "README.md"), "utf8");
  assert.match(md, /alt="4,000 contributions in the last 12 months, 200 active days in the last 12 months, 20-day longest streak, 28 projects shipped\./);
  // R12: dailies use the short name, in data.json (strip captions) and the link line.
  const vuna = data.dailies.find((d) => d.slug === "vuna-calc");
  assert.equal(vuna?.name, "VUNA-Calc");
  assert.match(md, /projects\/vuna-calc">VUNA-Calc<\/a>/);
  assert.doesNotMatch(md, /Veritas/);
});

test("projects failure keeps last dailies", { timeout: 120_000 }, async () => {
  const dir = seeded();
  const { wrote, kept } = await build({ live: true, fetchImpl: failing("/api/projects"), outDir: dir });
  for (const path of ["assets/dailies-dark.png", "assets/dailies-light.png", ...POSTERS.map((p) => `assets/poster-${p.slug}.png`)]) {
    assert.ok(kept.includes(path), path);
    assert.equal(readFileSync(join(dir, path), "utf8"), OLD[path], path);
  }
  const md = readFileSync(join(dir, "README.md"), "utf8");
  assert.match(md, /<!-- dailies:start -->\n<a href="https:\/\/www\.irvinosazee\.me\/projects\/old-daily">Old Daily<\/a>\n<!-- dailies:end -->/);
  // Stats still refresh from live contributions, with last good projects shipped.
  assert.ok(wrote.includes("assets/stats-dark.svg"));
  assert.match(readFileSync(join(dir, "assets/stats-dark.svg"), "utf8"), /5,084 contributions/);
  assert.match(readFileSync(join(dir, "assets/stats-dark.svg"), "utf8"), /28 projects shipped/);
});

test("a failed source with no last good data throws instead of writing zeros", async () => {
  const dir = seeded({ data: false });
  await assert.rejects(build({ live: true, fetchImpl: failing("/users/"), outDir: dir }), /no last good data/);
  assert.ok(!existsSync(join(dir, "README.md")));
});

test("a cover that fails to load keeps only that poster", { timeout: 120_000 }, async () => {
  const dir = seeded();
  const body = JSON.parse(projectsBody);
  const BROKEN = "data:image/png;base64,AAAA";
  body.docs.find((d) => d.slug === "shipreel").image.url = BROKEN;
  const fetchImpl = async (url) =>
    String(url).includes("/api/projects") ? new Response(JSON.stringify(body)) : failing("nothing")(url);
  const { wrote, kept } = await build({ live: true, fetchImpl, outDir: dir });
  assert.deepEqual(kept, ["assets/poster-shipreel.png"]);
  assert.equal(readFileSync(join(dir, "assets/poster-shipreel.png"), "utf8"), OLD["assets/poster-shipreel.png"]);
  assert.ok(wrote.includes("assets/poster-trivia-devs.png"));
  const data = JSON.parse(readFileSync(join(dir, "assets/data.json"), "utf8"));
  assert.equal(data.posterCovers.shipreel, COVER, "last good cover kept with the kept poster");
  assert.ok(!existsSync(join(dir, "assets/poster-shipreel.png.tmp.png")));
});

test("a poster missing from the published projects keeps its last good file", { timeout: 120_000 }, async () => {
  const dir = seeded();
  const body = JSON.parse(projectsBody);
  body.docs = body.docs.filter((d) => d.slug !== "trivia-devs");
  const fetchImpl = async (url) =>
    String(url).includes("/api/projects") ? new Response(JSON.stringify(body)) : failing("nothing")(url);
  const { kept } = await build({ live: true, fetchImpl, outDir: dir });
  assert.deepEqual(kept, ["assets/poster-trivia-devs.png"]);
  assert.equal(readFileSync(join(dir, "assets/poster-trivia-devs.png"), "utf8"), OLD["assets/poster-trivia-devs.png"]);
  const data = JSON.parse(readFileSync(join(dir, "assets/data.json"), "utf8"));
  assert.equal(data.posterCovers["trivia-devs"], COVER, "last good cover kept with the kept poster");
});

test("daily names stop at the first ' · ' in captions and links (R12)", () => {
  const md = renderReadme({ dailies: [{ slug: "vuna-calc", name: "VUNA-Calc · Veritas Journey" }, ...DAILIES], stats: STATS });
  const line = md.match(/<!-- dailies:start -->\n([^\n]*)\n<!-- dailies:end -->/)[1];
  assert.ok(line.startsWith('<a href="https://www.irvinosazee.me/projects/vuna-calc">VUNA-Calc</a> · '));
  assert.equal(line.split(" · ").length, 4);
  assert.doesNotMatch(md, /Veritas/);
});
