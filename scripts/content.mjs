// Every piece of fixed copy and data on the profile, verbatim from the spec.
// Live numbers and dailies come from scripts/data/; everything here is edited by hand.

const SITE = "https://www.irvinosazee.me";

export const LINKS = {
  site: SITE,
  hire: `${SITE}/contact`,
  linkedin: "https://www.linkedin.com/in/irvin-osazee",
  caseFile: (slug) => `${SITE}/projects/${slug}`,
};

const lineRuns = [
  { text: "Software engineer. I ship the whole film: the product, the code, " },
  { text: "and", italic: true },
  { text: " the launch." },
];

export const SLATE = {
  kicker: "PRODUCTION ── THE ONE WHO BUILT THIS",
  /** The kicker in plain words, for alt text. */
  kickerText: "Production: the one who built this",
  name: "Irvin Osazee",
  /** The serif line as styled runs ("and" in italic). */
  lineRuns,
  /** The same line as plain text, for alt text. */
  line: lineRuns.map((r) => r.text).join(""),
  cells: [
    { label: "Role", value: "Software Engineer" },
    { label: "Location", value: "Abuja · GMT+1" },
    { label: "On set since", value: "2023" },
    { label: "Status", value: "Available for work" },
  ],
};

export const STATS = {
  contributions: { label: "CONTRIBUTIONS", qualifier: "last 12 months" },
  activeDays: { label: "ACTIVE DAYS", qualifier: "last 12 months" },
  longestStreak: { label: "LONGEST STREAK" },
  shipped: { label: "PROJECTS SHIPPED" },
  footnote: "From GitHub's contribution graph · updated daily",
};

export const STATEMENT =
  "I build products end to end, then go the extra mile on the parts nobody asks for: the tests, the launch video, the tooling that keeps it honest.";

export const POSTERS = [
  {
    slug: "shipreel",
    kicker: "OPEN SOURCE · 2026",
    name: "shipreel",
    line: "Turns a codebase into a launch video, then measures it before you post.",
  },
  {
    slug: "trivia-devs",
    kicker: "PLATFORM · 2026",
    name: "Trivia Devs",
    line: "Developers share, review and rank learning resources, with an AI ask engine.",
  },
  {
    slug: "iya-guardians-of-the-sky-kings",
    kicker: "GAME · 2026",
    name: "Iya",
    line: "A stealth game in 15th-century Benin City, shipped in 3D and 2D.",
  },
];

export const RECEIPTS = [
  { label: "shipreel", value: "260 tests on every push · nightly render against the latest Hyperframes · on npm" },
  { label: "irvinosazee.me", value: "Next.js 16 + Payload CMS · an MCP server so agents draft my case files · 279 tests" },
  { label: "Iya", value: "One game, two engines: Three.js in 3D and a 2D build" },
  { label: "Trivia Devs", value: "Trust-ranked resources and an AI ask engine for a developer community" },
];

export const STACK_ROWS = [
  { label: "Frontend", icons: "html,css,js,ts,react,nextjs,tailwind,vite,svelte,astro,threejs" },
  { label: "Backend", icons: "nodejs,py,django,flask,php,java,supabase,firebase" },
  { label: "Data", icons: "postgres,mongodb,mysql" },
  { label: "Mobile", icons: "flutter,dart,swift" },
  { label: "Ship", icons: "git,github,docker,vercel,vscode,figma" },
  { label: "AI · Test", icons: "pytorch,tensorflow,jest,postman,npm,pycharm" },
];

export const skillIconsUrl = (icons) => `https://skillicons.dev/icons?i=${icons}`;

export const CALLSHEET = {
  kicker: "Hiring, or building something?",
  line: "Let's make the next one.",
  links: [
    { label: "Hire me", href: LINKS.hire },
    { label: "irvinosazee.me", href: LINKS.site },
    { label: "LinkedIn", href: LINKS.linkedin },
  ],
};
