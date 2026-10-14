import { execFile } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const forbiddenDirectory = /(^|\/)(?:\.git|\.claude|\.codex|\.opencode|\.superskill|\.cache|cache|caches|node_modules|coverage|__fixtures__|sessions?|transcripts?)(?:\/|$)/i;
const forbiddenFile = /(?:^|\/)\.env(?:\.[^/]*)?$|\.(?:jsonl|log|map)$|\.(?:test|spec)\.[cm]?js$/i;

export function verifyPackageFiles(paths) {
  if (!Array.isArray(paths) || paths.length === 0) throw new Error("empty package file list");
  for (const path of paths) {
    if (typeof path !== "string" || forbiddenDirectory.test(path) || forbiddenFile.test(path)) throw new Error(`forbidden packaged file: ${path}`);
  }
  return paths.length;
}

async function main() {
  const { stdout } = await promisify(execFile)("npm", ["pack", "--dry-run", "--ignore-scripts", "--json"], { cwd: root, timeout: 60_000, maxBuffer: 16 * 1024 * 1024 });
  const packages = JSON.parse(stdout);
  if (!Array.isArray(packages) || packages.length !== 1 || !Array.isArray(packages[0].files)) throw new Error("invalid npm pack result");
  const count = verifyPackageFiles(packages[0].files.map((file) => file.path));
  console.log(`[verify-package] ${count} packaged paths; no forbidden development artifact paths`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(`[verify-package] ${error.message}`);
    process.exitCode = 1;
  });
}
