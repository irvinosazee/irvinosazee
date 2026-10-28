// Raster cards: the three project posters and the dailies film strip, drawn in
// chromium from HTML templates and saved as PNG at 2× density.
//
// The templates are opened over file:// (not page.setContent) so that their
// @font-face rules can load the repo fonts from assets/fonts: an about:blank
// page is not allowed to read local files.
import { THEMES } from "../theme.mjs";

const TEMPLATES = new URL("./templates/", import.meta.url);
const IMAGE_TIMEOUT_MS = 30_000;

function themeOf(name) {
  const t = THEMES[name];
  if (!t) throw new Error(`unknown theme "${name}"`);
  return t;
}

async function openTemplate(browser, file, data) {
  const page = await browser.newPage({ viewport: { width: 830, height: 800 }, deviceScaleFactor: 2 });
  try {
    await page.goto(new URL(file, TEMPLATES).href);
    await page.evaluate((d) => window.render(d), data);
    await settle(page);
    return page;
  } catch (err) {
    await page.close();
    throw err;
  }
}

/** Waits for every font face and image. A cover that fails to load is an error, never a broken-image icon. */
async function settle(page) {
  await page.evaluate(async () => {
    await Promise.all([...document.fonts].map((f) => f.load()));
    await document.fonts.ready;
  });
  await page.waitForFunction(() => [...document.images].every((img) => img.complete), null, {
    timeout: IMAGE_TIMEOUT_MS,
  });
  const broken = await page.$$eval("img", (imgs) => imgs.filter((i) => i.naturalWidth === 0).map((i) => i.src));
  if (broken.length) throw new Error(`cover image failed to load: ${broken.join(", ")}`);
}

/**
 * A 3:4 poster, 270×360 CSS px (540×720 PNG). A null cover gives a plain film-ground poster.
 * R9: one poster file serves both themes, so `theme` is accepted but does not change the card.
 */
export async function renderPoster(browser, theme, poster, coverUrl, outPath) {
  const page = await openPoster(browser, theme, poster, coverUrl);
  try {
    await page.locator("#poster").screenshot({ path: outPath, type: "png", omitBackground: false });
  } finally {
    await page.close();
  }
}

/** Opens the poster template ready to screenshot. The caller closes the page. */
export async function openPoster(browser, theme, poster, coverUrl) {
  themeOf(theme);
  return openTemplate(browser, "poster.html", { vars: {}, poster, coverUrl: coverUrl ?? null });
}

/** The dailies strip, 830 CSS px wide (1660 px PNG). Six slots; frames number from 04. */
export async function renderDailies(browser, theme, frames, outPath) {
  const page = await openDailies(browser, theme, frames);
  try {
    await page.locator("#strip").screenshot({ path: outPath, type: "png", omitBackground: false });
  } finally {
    await page.close();
  }
}

/** Opens the dailies template ready to screenshot. The caller closes the page. */
export async function openDailies(browser, theme, frames) {
  const t = themeOf(theme);
  const vars = {
    "--ground": t.ground,
    "--ground2": t.ground2,
    "--inkDim": t.inkDim,
    "--emberText": t.emberText,
    "--line": theme === "light" ? t.lineStrong : t.line,
    // Sprocket holes: punched through to a lighter base on film, solid ink on the light ground.
    "--hole": theme === "light" ? t.ink : t.lineStrong,
  };
  const data = frames.map(({ name, cover }) => ({ name, cover: cover ?? null }));
  return openTemplate(browser, "dailies.html", { vars, frames: data });
}
