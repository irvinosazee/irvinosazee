// Call-sheet buttons (R6): small outlined-text SVGs, linked from the README, like the mock's `.btn`.
import { FONT } from "../theme.mjs";
import { themeOf, text, measure, svgDoc } from "./svg.mjs";

const STYLE = { font: FONT.mono, size: 12, letterSpacing: 0.14 };
const PAD_X = 16;
const HEIGHT = 36;
// Geist Mono cap height is ~0.71em: centre the capitals in the button.
const BASELINE = HEIGHT / 2 + (0.71 * STYLE.size) / 2;
// Dark text on ember reads in both themes (mock: #121316 on the ember fill).
const ON_EMBER = "#121316";

/** variant "primary" = ember fill with dark text; "secondary" = outlined on the theme ground. */
export function renderButton(themeName, { label, variant = "secondary" }) {
  const t = themeOf(themeName);
  const caps = label.toUpperCase();
  const width = Math.ceil(measure(caps, STYLE) + 2 * PAD_X + 2);
  const primary = variant === "primary";
  const fill = primary ? t.ember : t.ground;
  const stroke = primary ? t.ember : t.lineStrong;
  const frame =
    `<rect width="${width}" height="${HEIGHT}" fill="${fill}"/>` +
    `<rect x=".5" y=".5" width="${width - 1}" height="${HEIGHT - 1}" fill="none" stroke="${stroke}"/>`;
  const caption = text(caps, { ...STYLE, x: PAD_X + 1, y: BASELINE, fill: primary ? ON_EMBER : t.ink }).svg;
  return svgDoc({ width, height: HEIGHT, title: label, body: frame + caption });
}
