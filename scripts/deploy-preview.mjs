// Builds the site with hidden pages (e.g. /agenda) visible and deploys it to a
// temporary Firebase Hosting preview channel, leaving production untouched.
//
//   npm run deploy:preview            -> channel "preview", expires in 7 days
//   npm run deploy:preview agenda 14d -> channel "agenda", expires in 14 days
//
// Requires `npx firebase-tools login` with access to the reversim-26 project.
import { execSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";

const [channel = "preview", expires = "7d"] = process.argv.slice(2);
const previewConfig = "firebase.preview.json";

const run = (command, env = {}) =>
  execSync(command, { stdio: "inherit", env: { ...process.env, ...env } });

run("npx astro build", { PUBLIC_PREVIEW: "true" });

// Same hosting config as production, minus the server-side redirects that
// hide pages, and kept out of search engines.
const config = JSON.parse(readFileSync("firebase.json", "utf8"));
delete config.hosting.redirects;
config.hosting.headers.push({
  source: "**",
  headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
});
writeFileSync(previewConfig, JSON.stringify(config, null, 2));

try {
  run(
    `npx -y firebase-tools hosting:channel:deploy ${channel} --expires ${expires} --config ${previewConfig}`,
  );
} finally {
  rmSync(previewConfig);
}
