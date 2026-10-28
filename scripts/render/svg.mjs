// Shared building blocks for the outlined-text SVG cards.
import { outline } from "../text.mjs";
import { THEMES, FONT } from "../theme.mjs";

export const WIDTH = 830;

/** The four-column grid shared by the slate's cell row and the stats strip. */
export const COLUMNS = 4;
export const COLUMN_WIDTH = (WIDTH - 2) / COLUMNS;
export const CELL_PAD_X = 22;

export const formatCount = (n) => n.toLocaleString("en-US");

export function themeOf(name) {
  const t = THEMES[name];
  if (!t) throw new Error(`unknown theme "${name}"`);
  return t;
}

export const esc = (s) =>
  String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Type styles used across the cards (letterSpacing in em, as in the mock). */
export const TYPE = {
  label: { font: FONT.mono, size: 11, letterSpacing: 0.16 },
  display: { font: FONT.display, letterSpacing: -0.035 },
};

/**
 * One run of outlined text as a <path>. Returns { svg, width }.
 * attrs: extra SVG attributes such as fill or fill-opacity.
 */
export function text(str, { font, size, x, y, letterSpacing = 0, ...attrs }) {
  const { d, width } = outline(str, { font, size, x, y, letterSpacing });
  // Trailing letter-spacing is not part of the visible ink.
  const inkWidth = width - letterSpacing * size;
  if (!d) return { svg: "", width: inkWidth };
  const extra = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join("");
  return { svg: `<path d="${d}"${extra}/>`, width: inkWidth };
}

export const measure = (str, style) => outline(str, { ...style, x: 0, y: 0 }).width - (style.letterSpacing ?? 0) * style.size;

/** Greedy word wrap of a single-style string to a maximum width. */
export function wrap(str, style, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of str.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, style) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Film-grain overlay: desaturated fractal noise, as in the mock's `.grain`. */
export const GRAIN_FILTER =
  '<filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
  '<feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>' +
  '<feColorMatrix type="saturate" values="0"/></filter>';

export const grainRect = (x, y, w, h, opacity) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" filter="url(#grain)" opacity="${opacity}"/>`;

/** Grain strength per theme: noise reads stronger on a light ground. */
export const grainOpacity = (name) => (name === "light" ? 0.05 : 0.07);

export const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce) { * { animation: none !important } }";

/** A full standalone SVG document with an accessible title. */
export function svgDoc({ height, title, defs = "", style = "", body }) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-labelledby="title">` +
    `<title id="title">${esc(title)}</title>` +
    (style ? `<style>${style}</style>` : "") +
    (defs ? `<defs>${defs}</defs>` : "") +
    body +
    `</svg>\n`
  );
}

/** Card ground with a 1px hairline border on the given sides (crisp on the half pixel). */
export function cardFrame(t, height, { top = true } = {}) {
  const ground = `<rect width="${WIDTH}" height="${height}" fill="${t.ground}"/>`;
  const sides = top
    ? `<rect x=".5" y=".5" width="${WIDTH - 1}" height="${height - 1}" fill="none" stroke="${t.line}"/>`
    : `<path d="M.5 0V${height - 0.5}H${WIDTH - 0.5}V0" fill="none" stroke="${t.line}"/>`;
  return { ground, border: sides };
}

export const hline = (t, y, x1 = 0, x2 = WIDTH) => `<path d="M${x1} ${y + 0.5}H${x2}" stroke="${t.line}"/>`;
export const vline = (t, x, y1, y2) => `<path d="M${Math.round(x) + 0.5} ${y1}V${y2}" stroke="${t.line}"/>`;

/**
 * Lay styled runs side by side on one baseline.
 * runs: [{ str, style: {font,size,letterSpacing}, attrs: {fill,...} }]. Returns { svg, width }.
 */
export function textRuns(runs, x, y) {
  let cx = x;
  let svg = "";
  for (const { str, style, attrs = {} } of runs) {
    svg += text(str, { ...style, ...attrs, x: cx, y }).svg;
    cx += outline(str, { ...style, x: 0, y: 0 }).width;
  }
  return { svg, width: cx - x };
}
