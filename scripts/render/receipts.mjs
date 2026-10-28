// Receipts: short, checkable label/value rows in mono.
import { FONT } from "../theme.mjs";
import { RECEIPTS } from "../content.mjs";
import { WIDTH, themeOf, text, wrap, svgDoc, cardFrame, hline } from "./svg.mjs";

const PAD = { x: 22, top: 6, bottom: 18 };
const KEY_COL = 130;
const GAP = 16;
const ROW_PAD_Y = 10;
const LINE_HEIGHT = 20;
const keyStyle = { font: FONT.mono, size: 11, letterSpacing: 0.12 };
const valueStyle = { font: FONT.mono, size: 12.5 };

export function renderReceipts(themeName) {
  const t = themeOf(themeName);
  const valueX = PAD.x + KEY_COL + GAP;
  const valueWidth = WIDTH - PAD.x - valueX;

  let y = PAD.top;
  let body = "";
  for (const { label, value } of RECEIPTS) {
    body += hline(t, y, PAD.x, WIDTH - PAD.x);
    const baseline = y + ROW_PAD_Y + 14;
    body += text(label.toUpperCase(), { ...keyStyle, x: PAD.x, y: baseline - 0.5, fill: t.inkDim }).svg;
    const lines = wrap(value, valueStyle, valueWidth);
    lines.forEach((line, i) => {
      body += text(line, { ...valueStyle, x: valueX, y: baseline + i * LINE_HEIGHT, fill: t.ink }).svg;
    });
    y += ROW_PAD_Y * 2 + lines.length * LINE_HEIGHT;
  }
  body += hline(t, y, PAD.x, WIDTH - PAD.x);
  const height = y + PAD.bottom;

  const { ground, border } = cardFrame(t, height);
  const title = `Receipts. ${RECEIPTS.map((r) => `${r.label}: ${r.value}.`).join(" ")}`;
  return svgDoc({ height, title, body: ground + body + border });
}
