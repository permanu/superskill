import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const run = promisify(execFile);
const identifier = "(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)";
const releaseTag = new RegExp(`^v(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(?:-${identifier}(?:\\.${identifier})*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$`);

export function parseReleaseTag(tag) {
  if (typeof tag !== "string" || tag.length > 256 || /[\r\n]/.test(tag) || !releaseTag.test(tag)) throw new Error("invalid release tag: expected v-prefixed canonical SemVer");
  return tag.slice(1);
}

export function releaseBody(tag, changelog, previous) {
  const version = parseReleaseTag(tag);
  if (previous !== undefined) parseReleaseTag(previous);
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => line.match(/^## \[([^\]]+)\]/)?.[1] === version);
  if (start < 0) throw new Error(`missing changelog entry for ${version}`);
  let end = lines.findIndex((line, index) => index > start && /^## \[/.test(line));
  if (end < 0) end = lines.length;
  const notes = lines.slice(start + 1, end).join("\n").trim();
  if (!notes) throw new Error(`empty changelog entry for ${version}`);
  const compare = previous ? `\n\n**Full Changelog:** https://github.com/permanu/superskill/compare/${previous}...${tag}` : "";
  return `${notes}\n\n---\n\n**Install:** \`npm install -g superskill\` or via Claude Code \`/plugin install superskill\`${compare}\n`;
}

async function main() {
  const tag = process.env.RELEASE_TAG;
  const version = parseReleaseTag(tag);
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf-8"));
  if (version !== pkg.version) throw new Error(`tag version ${version} does not match package version ${pkg.version}`);
  const changelog = await readFile(join(root, "CHANGELOG.md"), "utf-8");
  if (process.argv[2] === "--validate") {
    releaseBody(tag, changelog);
    console.log(`[release-notes] validated ${tag}`);
    return;
  }
  if (!process.env.RUNNER_TEMP) throw new Error("RUNNER_TEMP is required");
  const { stdout } = await run("git", ["tag", "--merged", "HEAD", "--sort=-version:refname"], { cwd: root, timeout: 10_000, maxBuffer: 1024 * 1024 });
  const tags = stdout.trim().split("\n");
  const current = tags.indexOf(tag);
  if (current < 0) throw new Error("release tag is missing from checkout");
  const previous = tags.slice(current + 1).find((candidate) => releaseTag.test(candidate) && candidate.length <= 256);
  await writeFile(join(process.env.RUNNER_TEMP, "release-body.md"), releaseBody(tag, changelog, previous), { mode: 0o600 });
  console.log(`[release-notes] prepared ${tag}`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(`[release-notes] ${error.message}`);
    process.exitCode = 1;
  });
}
