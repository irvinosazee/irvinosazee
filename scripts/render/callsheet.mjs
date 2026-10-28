// The call sheet: the hiring prompt. The three links sit under it in the README as real links,
// so the image draws no buttons (an image button can't be clicked through to its own URL).
import { CALLSHEET } from "../content.mjs";
import {
  WIDTH, TYPE, GRAIN_FILTER,
  themeOf, text, textRuns, svgDoc, cardFrame, grainRect, grainOpacity,
} from "./svg.mjs";

const PAD_X = 28;
const KICKER_Y = 42;
const LINE = { size: 42, y: KICKER_Y + 52 };
const HEIGHT = LINE.y + 36;
// A clapper-stripe edge on the right, echoing the slate's band so the page opens and closes on it.
const EDGE = { width: 46, rule: 2 };

export function renderCallsheet(themeName) {
  const t = themeOf(themeName);
  const { ground, border } = cardFrame(t, HEIGHT);
  const edgeX = WIDTH - 1 - EDGE.width;
  const defs =
    GRAIN_FILTER +
    `<pattern id="stripes" width="52" height="52" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
    `<rect width="52" height="52" fill="${t.ground}"/><rect width="26" height="52" fill="${t.ink}"/></pattern>`;

  const kicker = text(CALLSHEET.kicker.toUpperCase(), { ...TYPE.label, size: 12, x: PAD_X, y: KICKER_Y, fill: t.inkDim }).svg;
  const display = { ...TYPE.display, size: LINE.size };
  const body = CALLSHEET.line.replace(/\.$/, "");
  const line = textRuns(
    [
      { str: body, style: display, attrs: { fill: t.ink } },
      ...(body === CALLSHEET.line ? [] : [{ str: ".", style: display, attrs: { fill: t.emberText } }]),
    ],
    PAD_X - 2,
    LINE.y
  ).svg;
  const edge =
    `<rect x="${edgeX}" y="1" width="${EDGE.width}" height="${HEIGHT - 2}" fill="url(#stripes)"/>` +
    `<rect x="${edgeX - EDGE.rule}" y="1" width="${EDGE.rule}" height="${HEIGHT - 2}" fill="${t.ink}"/>`;

  return svgDoc({
    height: HEIGHT,
    title: `${CALLSHEET.kicker} ${CALLSHEET.line}`,
    defs,
    body:
      ground +
      grainRect(1, 1, edgeX - EDGE.rule - 1, HEIGHT - 2, grainOpacity(themeName)) +
      kicker +
      line +
      edge +
      border,
  });
}
