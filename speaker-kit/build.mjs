// Builds a single self-contained speaker-kit HTML file: the template with the
// session data and logo inlined, so it can be opened from disk or hosted as-is.
//
// Usage: node speaker-kit/build.mjs   ->   speaker-kit/dist/index.html

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import slug from "slug";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");

const data = JSON.parse(
  fs.readFileSync(path.join(repo, "src/helpers/data/data.json"), "utf8"),
);

const speakersById = new Map(data.speakers.map((s) => [s.id, s]));

function twitterHandle(speaker) {
  const link = speaker.links.find((l) => l.linkType === "Twitter");
  const m = link?.url.match(/(?:twitter|x)\.com\/@?([A-Za-z0-9_]+)/);
  return m ? m[1] : null;
}

const sessions = data.sessions
  .flatMap((group) => group.sessions)
  .filter((s) => !s.isServiceSession && s.speakers.length > 0)
  .map((s) => ({
    // Same slug function the site uses for /session/<slug> (src/pages/session/[session].astro).
    slug: slug(s.title),
    title: s.title.trim(),
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    room: s.room,
    speakers: s.speakers.map(({ id }) => {
      const sp = speakersById.get(id);
      return {
        name: sp.fullName.trim(),
        tagLine: (sp.tagLine ?? "").trim(),
        photo: sp.profilePicture,
        twitter: twitterHandle(sp),
      };
    }),
  }));

const logo =
  "data:image/png;base64," +
  fs
    .readFileSync(path.join(repo, "src/assets/logo-white.png"))
    .toString("base64");

// Platform icons for the wizard, from the site's own icon set.
const icons = Object.fromEntries(
  ["x-twitter", "linkedin", "facebook", "instagram"].map((name) => [
    name,
    fs
      .readFileSync(path.join(repo, `src/assets/socials/${name}.svg`), "utf8")
      .replace(/\s+/g, " ")
      .replace("<svg ", '<svg aria-hidden="true" '),
  ]),
);

// Escape "<" so session text can never close the inline <script>.
const json = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

// Placeholders are `/*__NAME__*/ <default>` (Prettier may add the space); fail
// loudly if one goes missing rather than shipping a page with no data.
function fill(html, name, value) {
  const re = new RegExp(`/\\*__${name}__\\*/\\s*(\\[\\]|""|\\{\\})`);
  if (!re.test(html))
    throw new Error(`Placeholder __${name}__ not found in template`);
  return html.replace(re, () => json(value));
}

let html = fs.readFileSync(path.join(here, "index.template.html"), "utf8");
html = fill(html, "SESSIONS", sessions);
html = fill(html, "LOGO", logo);
html = fill(html, "ICONS", icons);

const out = path.join(here, "dist/index.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`Wrote ${path.relative(repo, out)} (${sessions.length} sessions)`);
