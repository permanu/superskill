import { lstat, readdir, realpath } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = resolve(SCRIPT_DIR, "..");
const toPosix = (path) => path.split(sep).join("/");

export async function discoverShippedSkillFiles(repoRoot) {
  const root = resolve(repoRoot, "skills");
  let rootRealPath;
  try {
    const rootInfo = await lstat(root);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) {
      throw new Error(`Shipped skills root must be a real directory: ${root}`);
    }
    rootRealPath = await realpath(root);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Shipped skills cannot contain symlinks: ${path}`);
      }
      if (entry.isDirectory()) {
        await visit(path);
        continue;
      }
      if (!entry.isFile() || entry.name !== "SKILL.md") continue;

      const resolvedPath = await realpath(path);
      const rel = relative(rootRealPath, resolvedPath);
      if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || resolve(rootRealPath, rel) !== resolvedPath) {
        throw new Error(`Shipped skill resolves outside skills/: ${path}`);
      }
      files.push(path);
    }
  }

  await visit(root);
  return files.sort((a, b) => a.localeCompare(b));
}

export function nativeValidatorArgs(skillFile, repoRoot) {
  const skillPath = toPosix(relative(repoRoot, skillFile));
  return [
    join(repoRoot, "dist", "cli.js"),
    "skill",
    "validate",
    skillPath,
    "--profile",
    "anthropic",
  ];
}

export function runNativeSkillValidator(skillFile, repoRoot) {
  return spawnSync(process.execPath, nativeValidatorArgs(skillFile, repoRoot), {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 30_000,
  });
}

function parseReport(stdout, skillFile, repoRoot) {
  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    throw new Error(`Native validator did not return JSON for ${toPosix(relative(repoRoot, skillFile))}.`);
  }

  if (report?.success !== true || report?.valid !== true || report?.profile !== "anthropic" || report?.counts?.errors !== 0) {
    throw new Error(`Native validator rejected ${toPosix(relative(repoRoot, skillFile))}: ${JSON.stringify(report?.issues ?? report)}`);
  }

  const checkedPaths = report.checked_paths;
  const checkedSkill = Array.isArray(checkedPaths) && checkedPaths.some((path) =>
    typeof path === "string" && resolve(repoRoot, path) === skillFile,
  );
  if (!checkedSkill) {
    throw new Error(`Native validator did not report checking ${toPosix(relative(repoRoot, skillFile))}.`);
  }
}

export async function checkShippedSkills(repoRoot = DEFAULT_REPO_ROOT, validate = runNativeSkillValidator) {
  const root = resolve(repoRoot);
  const skillFiles = await discoverShippedSkillFiles(root);
  if (skillFiles.length === 0) throw new Error("No shipped skills/**/SKILL.md files were discovered.");

  let checkedCount = 0;
  for (const skillFile of skillFiles) {
    const result = validate(skillFile, root);
    if (result.error) throw new Error(`Could not start native validator: ${result.error.message}`);
    if (result.status !== 0) {
      const details = (result.stderr || result.stdout || "").trim().slice(0, 4000);
      throw new Error(`Native validator failed for ${toPosix(relative(root, skillFile))} (exit ${result.status ?? "unknown"}).${details ? `\n${details}` : ""}`);
    }
    parseReport(result.stdout ?? "", skillFile, root);
    checkedCount += 1;
  }

  if (checkedCount === 0 || checkedCount !== skillFiles.length) {
    throw new Error(`Native skill check count mismatch: discovered ${skillFiles.length}, checked ${checkedCount}.`);
  }
  return { checkedCount, skillFiles: skillFiles.map((path) => toPosix(relative(root, path))) };
}

async function main() {
  const { checkedCount, skillFiles } = await checkShippedSkills();
  process.stdout.write(`Validated ${checkedCount} shipped native skill(s): ${skillFiles.join(", ")}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
