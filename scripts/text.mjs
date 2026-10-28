import opentype from "opentype.js";

const cache = new Map();

function loadFont(path) {
  if (!cache.has(path)) cache.set(path, opentype.loadSync(path));
  return cache.get(path);
}

/**
 * Outline text as a single SVG path, laid out glyph by glyph.
 * x, y: baseline origin. letterSpacing: in em.
 */
export function outline(text, { font, size, x, y, letterSpacing = 0 }) {
  const f = loadFont(font);
  const scale = size / f.unitsPerEm;
  const path = new opentype.Path();
  let cx = x;
  for (const ch of text) {
    const glyph = f.charToGlyph(ch);
    path.extend(glyph.getPath(cx, y, size));
    cx += glyph.advanceWidth * scale + letterSpacing * size;
  }
  return { d: path.toPathData(2), width: cx - x };
}
