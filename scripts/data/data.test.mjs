import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCalendar, computeStats, CalendarParseError, fetchContributions } from "./contributions.mjs";
import { selectDailies, fetchProjects } from "./projects.mjs";

const fixture = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8");
const POSTERS = ["shipreel", "trivia-devs", "iya-guardians-of-the-sky-kings"];

test("parseCalendar reads total and days", () => {
  const { total, days } = parseCalendar(fixture("calendar.html"));
  assert.equal(total, 5084);
  assert.equal(days.length, 10);
  const byDate = Object.fromEntries(days.map((d) => [d.date, d.count]));
  assert.equal(byDate["2025-10-26"], 0); // "No contributions"
  assert.equal(byDate["2025-11-02"], 6);
  assert.equal(byDate["2025-11-09"], 8);
  assert.ok(Object.values(byDate).includes(1), "singular '1 contribution' day parses to 1");
});

test("parseCalendar throws on unknown markup", () => {
  assert.throws(() => parseCalendar("<html></html>"), CalendarParseError);
});

test("parseCalendar throws when days are missing", () => {
  const h2 = '<h2 id="js-contribution-activity-description"> 12 contributions in the last year </h2>';
  assert.throws(() => parseCalendar(h2), CalendarParseError);
});

test("computeStats", () => {
  const days = [3, 0, 1, 1, 1, 0, 2].map((count, i) => ({ date: `2025-01-0${i + 1}`, count }));
  assert.deepEqual(computeStats(days), { activeDays: 5, longestStreak: 3 });
});

test("computeStats sorts by date", () => {
  const days = [{ date: "2025-01-03", count: 1 }, { date: "2025-01-01", count: 1 }, { date: "2025-01-02", count: 1 }];
  assert.equal(computeStats(days).longestStreak, 3);
});

test("computeStats on no activity", () => {
  const days = [0, 0, 0].map((count, i) => ({ date: `2025-01-0${i + 1}`, count }));
  assert.deepEqual(computeStats(days), { activeDays: 0, longestStreak: 0 });
});

async function projectsFromFixture() {
  const body = fixture("projects.json");
  const fetchImpl = async () => new Response(body, { status: 200 });
  return fetchProjects("https://example.test", fetchImpl);
}

test("fetchProjects maps docs and totalDocs", async () => {
  const { shipped, projects } = await projectsFromFixture();
  assert.equal(shipped, 30);
  assert.equal(projects.length, 10);
  assert.equal(projects.find((p) => p.slug === "no-cover-draft").cover, null);
  assert.match(projects.find((p) => p.slug === "shipreel").cover, /^https:/);
});

test("selectDailies excludes posters, skips cover-less, orders rating/date/slug", async () => {
  const { projects } = await projectsFromFixture();
  const out = selectDailies(projects, POSTERS);
  assert.deepEqual(out.map((p) => p.slug), [
    "brand-bible", "realtime-chat", "portfolio-v2", "heartrank", "vuna-calc", "farm-ease",
  ]);
  assert.equal(selectDailies(projects, POSTERS, 3).length, 3);
  assert.equal(selectDailies(projects, []).length, 6);
});

test("selectDailies breaks ties by slug and returns fewer when few eligible", () => {
  const p = (slug, cover = "u") => ({ slug, name: slug, rating: 5, date: "2026-01-01", cover });
  assert.deepEqual(selectDailies([p("b"), p("a")], []).map((x) => x.slug), ["a", "b"]);
  assert.equal(selectDailies([p("a"), p("b"), p("c")], ["c"]).length, 2);
});

test("fetchContributions uses injected fetch and fails on HTTP error", async () => {
  const ok = async () => new Response(fixture("calendar.html"), { status: 200 });
  const r = await fetchContributions("irvinosazee", ok);
  assert.equal(r.total, 5084);
  const bad = async () => new Response("no", { status: 500 });
  await assert.rejects(() => fetchContributions("irvinosazee", bad));
});
