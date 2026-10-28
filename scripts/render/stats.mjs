// The stats strip: four plain-labelled live numbers that sit directly under the slate.
import { FONT } from "../theme.mjs";
import { STATS } from "../content.mjs";
import {
  WIDTH, COLUMN_WIDTH, CELL_PAD_X, TYPE,
  themeOf, text, measure, formatCount, svgDoc, cardFrame, hline, vline,
} from "./svg.mjs";

const NUMBER_SIZE = 32;
const LABEL_Y = 26;
const NUMBER_Y = LABEL_Y + 37;
const QUALIFIER_Y = NUMBER_Y + 20;
const STRIP_BOTTOM = QUALIFIER_Y + 15;
const FOOTNOTE_Y = STRIP_BOTTOM + 21;
const HEIGHT = FOOTNOTE_Y + 13;

const numberStyle = (size) => ({ ...TYPE.display, letterSpacing: -0.03, size });
const qualifierStyle = { font: FONT.mono, size: 11, letterSpacing: 0.04 };

/**
 * Per-cell layout. The number shrinks below NUMBER_SIZE only if it would not fit,
 * so the outlined width always stays under the cell's inner width.
 */
export function statsLayout({ total, activeDays, longestStreak, shipped }) {
  const cellWidth = COLUMN_WIDTH - 2 * CELL_PAD_X;
  const rows = [
    { ...STATS.contributions, number: formatCount(total) },
    { ...STATS.activeDays, number: formatCount(activeDays) },
    { ...STATS.longestStreak, number: `${formatCount(longestStreak)} ${longestStreak === 1 ? "day" : "days"}` },
    { ...STATS.shipped, number: formatCount(shipped) },
  ];
  return rows.map((row) => {
    let size = NUMBER_SIZE;
    let numberWidth = measure(row.number, numberStyle(size));
    if (numberWidth >= cellWidth) {
      size = Math.floor(((size * (cellWidth - 2)) / numberWidth) * 10) / 10;
      numberWidth = measure(row.number, numberStyle(size));
    }
    return { ...row, size, numberWidth, cellWidth };
  });
}

export function renderStats(themeName, values) {
  const t = themeOf(themeName);
  const { ground, border } = cardFrame(t, HEIGHT, { top: false });
  let body = "";
  statsLayout(values).forEach(({ label, qualifier, number, size }, i) => {
    const x0 = 1 + i * COLUMN_WIDTH;
    if (i > 0) body += vline(t, x0 - 1, 0, STRIP_BOTTOM);
    const x = x0 + CELL_PAD_X;
    body += text(label, { ...TYPE.label, x, y: LABEL_Y, fill: t.inkDim }).svg;
    body += text(number, { ...numberStyle(size), x: x - 1, y: NUMBER_Y, fill: t.ink }).svg;
    if (qualifier) body += text(qualifier, { ...qualifierStyle, x, y: QUALIFIER_Y, fill: t.inkDim }).svg;
  });
  body += hline(t, STRIP_BOTTOM, 1, WIDTH - 1);
  body += text(STATS.footnote, { ...qualifierStyle, size: 10.5, x: 1 + CELL_PAD_X, y: FOOTNOTE_Y, fill: t.inkDim }).svg;

  const { total, activeDays, longestStreak, shipped } = values;
  const title =
    `${formatCount(total)} contributions in the last 12 months, ` +
    `${formatCount(activeDays)} active days in the last 12 months, ` +
    `${formatCount(longestStreak)}-day longest streak, ` +
    `${formatCount(shipped)} projects shipped. ` +
    `${STATS.footnote.replace(" · ", ", ")}.`;
  return svgDoc({ height: HEIGHT, title, body: ground + body + border });
}
