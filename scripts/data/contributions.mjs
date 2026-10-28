export class CalendarParseError extends Error {
  constructor(message) {
    super(message);
    this.name = "CalendarParseError";
  }
}

export function parseCalendar(html) {
  const totalMatch = html.match(
    /id="js-contribution-activity-description"[^>]*>\s*([\d,]+)\s+contributions?\s+in\s+the\s+last\s+year/
  );
  if (!totalMatch) throw new CalendarParseError("contribution total not found");
  const total = Number(totalMatch[1].replaceAll(",", ""));

  const counts = new Map();
  for (const m of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>\s*([^<]*?)\s*<\/tool-tip>/g)) {
    const text = m[2];
    if (/^No contributions/.test(text)) counts.set(m[1], 0);
    else {
      const n = text.match(/^(\d[\d,]*)\s+contributions?/);
      if (n) counts.set(m[1], Number(n[1].replaceAll(",", "")));
    }
  }

  const days = [];
  for (const m of html.matchAll(/<td\b[^>]*>/g)) {
    const date = m[0].match(/\bdata-date="(\d{4}-\d{2}-\d{2})"/)?.[1];
    const id = m[0].match(/\sid="([^"]+)"/)?.[1];
    if (date && id && counts.has(id)) days.push({ date, count: counts.get(id) });
  }
  if (days.length === 0) throw new CalendarParseError("no contribution days found");
  // A partial rewording of the tooltips must not pass as a quiet year: every calendar cell must
  // parse (give or take a few), and a non-zero total needs at least one non-zero day.
  const cells = [...html.matchAll(/<td\b[^>]*\bdata-date="/g)].length;
  if (days.length < 0.9 * cells) {
    throw new CalendarParseError(`only ${days.length} of ${cells} contribution days parsed`);
  }
  if (total > 0 && !days.some((d) => d.count > 0)) {
    throw new CalendarParseError(`total is ${total} but no day has contributions`);
  }
  return { total, days };
}

export function computeStats(days) {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let activeDays = 0;
  let longestStreak = 0;
  let run = 0;
  for (const { count } of sorted) {
    if (count > 0) {
      activeDays++;
      run++;
      if (run > longestStreak) longestStreak = run;
    } else run = 0;
  }
  return { activeDays, longestStreak };
}

export async function fetchContributions(login = "irvinosazee", fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(`https://github.com/users/${login}/contributions`);
  if (!res.ok) throw new Error(`contributions fetch failed: HTTP ${res.status}`);
  const { total, days } = parseCalendar(await res.text());
  return { total, ...computeStats(days) };
}
