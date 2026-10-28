import test from "node:test";
import assert from "node:assert/strict";
import { renderSlate } from "./slate.mjs";
import { renderStats, statsLayout } from "./stats.mjs";
import { renderReceipts } from "./receipts.mjs";
import { renderCallsheet } from "./callsheet.mjs";
import { formatCount } from "./svg.mjs";

const REAL = { total: 5077, activeDays: 233, longestStreak: 27, shipped: 30 };
const renderers = {
  slate: (t) => renderSlate(t),
  stats: (t) => renderStats(t, REAL),
  receipts: (t) => renderReceipts(t),
  callsheet: (t) => renderCallsheet(t),
};
const titleOf = (svg) => svg.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] ?? "";

for (const theme of ["dark", "light"]) {
  for (const [name, render] of Object.entries(renderers)) {
    test(`${name} (${theme}): no <text> elements`, () => {
      assert.doesNotMatch(render(theme), /<text\b/);
    });

    test(`${name} (${theme}): has role=img and a title`, () => {
      const svg = render(theme);
      assert.match(svg, /^<svg\b[^>]*\brole="img"/);
      assert.ok(titleOf(svg).length > 10);
    });

    test(`${name} (${theme}): is 830 px wide`, () => {
      assert.match(render(theme), /^<svg\b[^>]*\bwidth="830"/);
    });
  }

  test(`slate (${theme}): title carries name, role, location and status`, () => {
    const title = titleOf(renderSlate(theme));
    for (const s of ["Irvin Osazee", "Software Engineer", "Abuja", "Available for work"]) {
      assert.ok(title.includes(s), `missing ${s}`);
    }
  });

  test(`stats (${theme}): title lists the four numbers`, () => {
    const title = titleOf(renderStats(theme, REAL));
    for (const s of [
      "5,077 contributions in the last 12 months",
      "233 active days",
      "27-day longest streak",
      "30 projects shipped",
    ]) {
      assert.ok(title.includes(s), `missing ${s}`);
    }
  });

  test(`slate (${theme}): reduced motion disables animation`, () => {
    const svg = renderSlate(theme);
    assert.ok(svg.includes("prefers-reduced-motion: reduce"));
    assert.ok(svg.includes("animation: none"));
  });
}

test("numbers grow without overflowing", () => {
  const cells = statsLayout({ total: 123456, activeDays: 365, longestStreak: 365, shipped: 999 });
  assert.equal(cells.length, 4);
  for (const { numberWidth, cellWidth } of cells) assert.ok(numberWidth < cellWidth, `${numberWidth} >= ${cellWidth}`);
});

test("absurd numbers still fit by shrinking", () => {
  const cells = statsLayout({ total: 123456789, activeDays: 365, longestStreak: 12345, shipped: 99999 });
  for (const { numberWidth, cellWidth } of cells) assert.ok(numberWidth < cellWidth, `${numberWidth} >= ${cellWidth}`);
});

test("light theme uses light ground", () => {
  const svg = renderSlate("light");
  assert.ok(svg.includes("#f4f1ea"));
  assert.ok(!svg.includes("#121316"));
});

test("formatCount", () => {
  assert.equal(formatCount(5077), "5,077");
  assert.equal(formatCount(30), "30");
  assert.equal(formatCount(123456), "123,456");
});
