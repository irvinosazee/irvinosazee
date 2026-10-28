// Builds every profile image and README.md.
//
//   node scripts/build.mjs          re-render the SVGs and README from assets/data.json (no network)
//   node scripts/build.mjs --live   fetch contributions and projects, then render everything
//
// R2: assets/data.json holds the last good data. A failed source falls back to it, the images that
// depend on the failed data are kept byte for byte, and `kept` lists them; the CLI then exits 1.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { POSTERS } from "./content.mjs";
import { fetchContributions } from "./data/contributions.mjs";
import { fetchProjects, selectDailies, dailyName } from "./data/projects.mjs";
import { renderSlate } from "./render/slate.mjs";
import { renderStats } from "./render/stats.mjs";
import { renderReceipts } from "./render/receipts.mjs";
import { renderCallsheet } from "./render/callsheet.mjs";
import { renderButton } from "./render/button.mjs";
import { renderReadme, BUTTONS } from "./readme.mjs";

const LOGIN = "irvinosazee";
const FETCH_TIMEOUT_MS = 20_000;
const THEME_NAMES = ["dark", "light"];
const DATA = "assets/data.json";

const launchChromium = async () => (await import("playwright")).chromium.launch();

export async function build({ live, fetchImpl = globalThis.fetch, outDir = ".", launchBrowser = launchChromium }) {
  const wrote = [];
  const kept = [];
  const warnings = [];
  const path = (rel) => join(outDir, rel);
  const write = (rel, content) => {
    writeFileSync(path(rel), content);
    wrote.push(rel);
  };
  const last = existsSync(path(DATA)) ? JSON.parse(readFileSync(path(DATA), "utf8")) : null;
  const lastGood = (source, err) => {
    if (!last) throw new Error(`${source} failed and there is no last good data in ${DATA}: ${err.message}`);
    warnings.push(`${source} failed, using last good data: ${err.message}`);
    return last;
  };
  /** Keeps the existing file as it is. Without one, the README would point at nothing. */
  const keep = (rel, why) => {
    if (!existsSync(path(rel))) throw new Error(`${rel} could not be rebuilt and has no last good copy: ${why}`);
    kept.push(rel);
  };
  /** Posters and dailies as they are; data keeps their last good covers and dailies. */
  const keepRasters = (why) => {
    for (const p of POSTERS) keep(`assets/poster-${p.slug}.png`, why);
    for (const theme of THEME_NAMES) keep(`assets/dailies-${theme}.png`, why);
  };

  mkdirSync(path("assets"), { recursive: true });

  let contributions;
  let projects = null;
  let contributionsFailed = false;
  if (live) {
    const timed = (url, init = {}) => fetchImpl(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const [c, p] = await Promise.allSettled([fetchContributions(LOGIN, timed), fetchProjects(undefined, timed)]);
    contributionsFailed = c.status === "rejected";
    contributions = contributionsFailed ? lastGood("contributions", c.reason) : c.value;
    if (p.status === "fulfilled") projects = p.value;
    else lastGood("projects", p.reason);
  } else {
    if (!last) throw new Error(`an offline build needs ${DATA}; run with --live first`);
    contributions = last;
  }

  const data = {
    total: contributions.total,
    activeDays: contributions.activeDays,
    longestStreak: contributions.longestStreak,
    // R15: a kept stats image keeps all four numbers, so its alt text and data.json agree with it.
    shipped: projects && !contributionsFailed ? projects.shipped : last.shipped,
    dailies: last?.dailies ?? [],
    posterCovers: last?.posterCovers ?? {},
  };

  if (projects) {
    // A browser that will not start must not hold back the stats and README.
    let browser = null;
    try {
      browser = await launchBrowser();
    } catch (err) {
      warnings.push(`browser failed to launch, keeping posters and dailies: ${err.message}`);
      keepRasters(`browser failed to launch: ${err.message}`);
    }
    if (browser) await renderRasters({ browser, projects, data, last, path, wrote, keep, warnings });
  } else if (live) keepRasters("projects unavailable");

  for (const theme of THEME_NAMES) {
    write(`assets/slate-${theme}.svg`, renderSlate(theme));
    if (contributionsFailed) keep(`assets/stats-${theme}.svg`, "contributions unavailable");
    else write(`assets/stats-${theme}.svg`, renderStats(theme, data));
    write(`assets/receipts-${theme}.svg`, renderReceipts(theme));
    write(`assets/callsheet-${theme}.svg`, renderCallsheet(theme));
    for (const b of BUTTONS) write(`assets/button-${b.name}-${theme}.svg`, renderButton(theme, b));
  }

  // On a fallback, data.json keeps the last good values for the failed source (R2), so the
  // stats alt text and the dailies link line (R3) still describe the images that were kept.
  write("README.md", renderReadme({ dailies: data.dailies, stats: data }));
  write(DATA, JSON.stringify(data, null, 2) + "\n");
  return { wrote, kept, warnings };
}

/** Posters and the dailies strip. A cover that fails to load keeps that image and its last good data. */
async function renderRasters({ browser, projects, data, last, path, wrote, keep, warnings }) {
  const bySlug = new Map(projects.projects.map((p) => [p.slug, p]));
  // Render to a temporary file and move it into place only on success: a failure never clobbers.
  const tmp = (rel) => path(`${rel}.tmp.png`);
  const commit = (rel) => {
    renameSync(tmp(rel), path(rel));
    wrote.push(rel);
  };
  try {
    const { renderPoster, renderDailies } = await import("./render/raster.mjs");
    for (const poster of POSTERS) {
      const rel = `assets/poster-${poster.slug}.png`;
      const project = bySlug.get(poster.slug);
      const cover = project?.cover ?? null;
      try {
        if (!project) throw new Error(`${poster.slug} is not among the published projects`);
        await renderPoster(browser, "dark", poster, cover, tmp(rel));
        commit(rel);
        data.posterCovers[poster.slug] = cover;
      } catch (err) {
        rmSync(tmp(rel), { force: true });
        warnings.push(`${rel}: ${err.message}`);
        keep(rel, err.message);
        data.posterCovers[poster.slug] = last?.posterCovers?.[poster.slug] ?? null;
      }
    }

    const dailies = selectDailies(projects.projects, POSTERS.map((p) => p.slug)).map(({ slug, name, cover }) => ({
      slug,
      name: dailyName(name),
      cover,
    }));
    const rels = THEME_NAMES.map((theme) => `assets/dailies-${theme}.png`);
    try {
      // Both themes or neither, so the strip and its link line always show the same frames.
      for (const [i, theme] of THEME_NAMES.entries()) await renderDailies(browser, theme, dailies, tmp(rels[i]));
      rels.forEach(commit);
      data.dailies = dailies;
    } catch (err) {
      rels.forEach((rel) => rmSync(tmp(rel), { force: true }));
      warnings.push(`dailies: ${err.message}`);
      rels.forEach((rel) => keep(rel, err.message));
      data.dailies = last?.dailies ?? [];
    }
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const live = process.argv.includes("--live");
  const outDir = fileURLToPath(new URL("..", import.meta.url));
  build({ live, outDir }).then(
    ({ wrote, kept, warnings }) => {
      for (const w of warnings) console.warn(`warning: ${w}`);
      console.log(`wrote ${wrote.length} files${kept.length ? `; kept last good: ${kept.join(", ")}` : ""}`);
      if (kept.length) process.exitCode = 1;
    },
    (err) => {
      console.error(err);
      process.exitCode = 1;
    }
  );
}
