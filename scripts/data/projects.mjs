export async function fetchProjects(base = "https://www.irvinosazee.me", fetchImpl = globalThis.fetch) {
  const url = `${base}/api/projects?limit=200&depth=1&where[_status][equals]=published`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`projects fetch failed: HTTP ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body.docs) || typeof body.totalDocs !== "number") {
    throw new Error("projects response has unexpected shape");
  }
  const projects = body.docs.map((d) => ({
    slug: d.slug,
    name: d.name,
    rating: d.rating,
    date: d.date,
    cover: d.image?.url ?? null,
  }));
  return { shipped: body.totalDocs, projects };
}

export function selectDailies(projects, exclude, n = 6) {
  const skip = new Set(exclude);
  return projects
    .filter((p) => p.cover && !skip.has(p.slug))
    .sort(
      (a, b) =>
        b.rating - a.rating ||
        String(b.date).localeCompare(String(a.date)) ||
        a.slug.localeCompare(b.slug)
    )
    .slice(0, n);
}

/** R12: a daily's short name, up to the first " · " ("VUNA-Calc · Veritas Journey" → "VUNA-Calc"). */
export const dailyName = (name) => String(name).split(" · ")[0].trim();
