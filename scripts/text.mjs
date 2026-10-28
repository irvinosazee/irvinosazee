import opentype from "opentype.js";

const cache = new Map();

function loadFont(path) {
  if (!cache.has(path)) cache.set(path, opentype.loadSync(path));
  return cache.get(path);
}

/**
 * Outline text as a single SVG path, laid out glyph by glyph.
 * x, y: baseline origin. letterSpacing: in em.
 * Throws if a non-space character has no glyph in the font (it would render as .notdef tofu).
 */
export function outline(text, { font, size, x, y, letterSpacing = 0 }) {
  const f = loadFont(font);
  const scale = size / f.unitsPerEm;
  const path = new opentype.Path();
  let cx = x;
  for (const ch of text) {
    const glyph = f.charToGlyph(ch);
    if (glyph.index === 0 && !/\s/.test(ch)) {
      const code = ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
      const name = font.split("/").pop();
      throw new Error(`${name} has no glyph for "${ch}" (U+${code}) in "${text}"`);
    }
    path.extend(glyph.getPath(cx, y, size));
    cx += glyph.advanceWidth * scale + letterSpacing * size;
  }
  return { d: path.toPathData(1), width: cx - x };
}
