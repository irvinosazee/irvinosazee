import test from "node:test";
import assert from "node:assert/strict";
import { outline } from "./text.mjs";
import { FONT } from "./theme.mjs";

const base = { font: FONT.display, size: 40, x: 0, y: 40 };

test("outline returns a non-empty path and positive width", () => {
  const { d, width } = outline("Irvin", base);
  assert.match(d, /^M/);
  assert.ok(width > 0);
});

test("letterSpacing widens", () => {
  const plain = outline("Irvin", base).width;
  const spaced = outline("Irvin", { ...base, letterSpacing: 0.16 }).width;
  assert.ok(spaced > plain);
});

test("width scales linearly with size", () => {
  const small = outline("Irvin", { ...base, size: 20 }).width;
  const large = outline("Irvin", base).width;
  assert.ok(Math.abs(small * 2 - large) <= 0.5);
});

test("throws on a character the font has no glyph for", () => {
  // Archivo has no U+2500 box-drawing glyph; it would render as .notdef tofu.
  assert.throws(() => outline("A ── B", base), /no glyph for "─" \(U\+2500\)/);
});

test("spaces and covered characters pass the glyph guard", () => {
  assert.doesNotThrow(() => outline("PRODUCTION ── THE ONE", { ...base, font: FONT.mono }));
  assert.doesNotThrow(() => outline("Irvin Osazee", base));
});
