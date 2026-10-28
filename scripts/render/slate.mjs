// The slate: clapper band, kicker, name, serif line with a cursor, and the four-cell row.
import { FONT } from "../theme.mjs";
import { SLATE } from "../content.mjs";
import {
  WIDTH, COLUMNS, COLUMN_WIDTH, CELL_PAD_X, TYPE, REDUCED_MOTION, GRAIN_FILTER,
  themeOf, text, textRuns, svgDoc, cardFrame, hline, vline, grainRect, grainOpacity,
} from "./svg.mjs";

const PAD_X = 26;
const BAND = { top: 1, height: 46, rule: 2 };
const BODY_TOP = BAND.top + BAND.height + BAND.rule;
const KICKER_Y = BODY_TOP + 31;
const NAME = { size: 80, y: KICKER_Y + 74 };
const LINE = { size: 26, y: NAME.y + 44 };
const ROW_TOP = LINE.y + 30;
const CELL = { labelY: ROW_TOP + 25, valueY: ROW_TOP + 50 };
const HEIGHT = ROW_TOP + 70;

const REC_R = 4;
// R4: anything with ─, · or ● must be Geist Mono; numbers read as data, so mono too.
const isMonoValue = (v) => /[─·●]|^\d+$/.test(v);

const STYLE = `
@keyframes clap { 0% { transform: rotate(-14deg) } 60% { transform: rotate(1deg) } 100% { transform: rotate(0) } }
@keyframes rise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
@keyframes blink { 50% { opacity: 0 } }
@keyframes rec { 0%, 100% { opacity: 1 } 50% { opacity: .25 } }
.clap { transform-origin: ${BAND.top}px ${BODY_TOP}px; animation: clap .6s .2s cubic-bezier(.3, 1.4, .5, 1) both }
.r1 { animation: rise .7s .1s both }
.r2 { animation: rise .7s .35s both }
.r3 { animation: rise .7s .6s both }
.cursor { animation: blink 1s steps(1) infinite }
.rec { animation: rec 1.6s infinite }
${REDUCED_MOTION}`;

const recDot = (t, cx, cy) => `<circle class="rec" cx="${cx}" cy="${cy}" r="${REC_R}" fill="${t.ember}"/>`;

function clapper(t) {
  const { top, height, rule } = BAND;
  const pattern =
    `<pattern id="stripes" width="52" height="52" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
    `<rect width="52" height="52" fill="${t.ground}"/><rect width="26" height="52" fill="${t.ink}"/></pattern>` +
    `<clipPath id="inside"><rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}"/></clipPath>`;
  const band =
    `<g clip-path="url(#inside)"><g class="clap">` +
    `<rect x="1" y="${top}" width="${WIDTH - 2}" height="${height}" fill="url(#stripes)"/>` +
    `<rect x="1" y="${top + height}" width="${WIDTH - 2}" height="${rule}" fill="${t.ink}"/>` +
    `</g></g>`;
  return { pattern, band };
}

function heading(t) {
  const label = { ...TYPE.label, size: 12 };
  const capMid = KICKER_Y - (0.71 * label.size) / 2;
  const kicker =
    `<g class="r1">${recDot(t, PAD_X + REC_R, capMid)}` +
    text(SLATE.kicker, { ...label, x: PAD_X + REC_R * 2 + 10, y: KICKER_Y, fill: t.inkDim }).svg +
    `</g>`;

  const display = { ...TYPE.display, size: NAME.size };
  const name = textRuns(
    [
      { str: SLATE.name, style: display, attrs: { fill: t.ink } },
      { str: ".", style: display, attrs: { fill: t.emberText } },
    ],
    PAD_X - 3, // Archivo's I has side bearing; pull it onto the text edge.
    NAME.y
  ).svg;

  const serif = { font: FONT.serif, size: LINE.size };
  const italic = { font: FONT.serifItalic, size: LINE.size };
  const line = textRuns(
    SLATE.lineRuns.map((r) => ({ str: r.text, style: r.italic ? italic : serif, attrs: { fill: t.ink, "fill-opacity": 0.88 } })),
    PAD_X,
    LINE.y
  );
  const em = LINE.size;
  const cursor = `<rect class="cursor" x="${(PAD_X + line.width + 3).toFixed(1)}" y="${LINE.y + 3 - em}" width="${em / 2}" height="${em}" fill="${t.ember}"/>`;

  return kicker + `<g class="r2">${name}</g>` + `<g class="r3">${line.svg}${cursor}</g>`;
}

function cells(t) {
  let svg = hline(t, ROW_TOP - 1, 1, WIDTH - 1);
  SLATE.cells.forEach(({ label, value }, i) => {
    const x0 = 1 + i * COLUMN_WIDTH;
    if (i > 0) svg += vline(t, x0 - 1, ROW_TOP, HEIGHT - 1);
    const x = x0 + CELL_PAD_X;
    svg += text(label.toUpperCase(), { ...TYPE.label, x, y: CELL.labelY, fill: t.inkDim }).svg;
    const isStatus = i === COLUMNS - 1;
    const style = isMonoValue(value)
      ? { font: FONT.mono, size: 14 }
      : { font: isStatus ? FONT.sansSemibold : FONT.sans, size: 15 };
    if (isStatus) {
      svg += recDot(t, x + REC_R, CELL.valueY - 5.4);
      svg += text(value, { ...style, x: x + REC_R * 2 + 8, y: CELL.valueY, fill: t.emberText }).svg;
    } else svg += text(value, { ...style, x, y: CELL.valueY, fill: t.ink }).svg;
  });
  return svg;
}

export function renderSlate(themeName) {
  const t = themeOf(themeName);
  const { ground, border } = cardFrame(t, HEIGHT);
  const { pattern, band } = clapper(t);
  const [role, location, since, status] = SLATE.cells.map((c) => c.value);
  const title =
    `${SLATE.name}. ${SLATE.line} ` +
    `Role: ${role}. Location: ${location}. On set since ${since}. Status: ${status}.`;
  return svgDoc({
    height: HEIGHT,
    title,
    style: STYLE,
    defs: pattern + GRAIN_FILTER,
    body:
      ground +
      grainRect(1, BODY_TOP, WIDTH - 2, ROW_TOP - BODY_TOP - 1, grainOpacity(themeName)) +
      band +
      heading(t) +
      cells(t) +
      border,
  });
}
