import { closeSync, existsSync, fstatSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, realpathSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, relative, isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";
import { CLIENT_REGISTRY } from "./clients.js";
import { hasManagedInstructionBlock, writeMarkdownInstruction } from "./instructions.js";
import { installSharedSkill, sharedSkillFile, SKILL_MARKER } from "./skill.js";
import { upgradeCommand } from "./upgrade.js";
import type { UpgradeReport } from "./upgrade.js";
import { currentPlatform } from "./types.js";

function refreshFile(path: string, kind: "skill" | "instruction", home: string): boolean {
  if (!existsSync(path) || !lstatSync(path).isFile()) return false;
  const inside = relative(realpathSync(home), realpathSync(path));
  if (inside.startsWith("..") || isAbsolute(inside)) return false;
  const lockPath = `${path}.refresh.lock`;
  let lock: number;
  try {
    lock = openSync(lockPath, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
  let staging: string | undefined;
  let replacement: string | undefined;
  try {
    const info = lstatSync(path);
    if (!info.isFile()) return false;
    const original = readFileSync(path, "utf8");
    if (!(kind === "skill" ? original.includes(SKILL_MARKER) : hasManagedInstructionBlock(original))) return false;
    staging = mkdtempSync(join(tmpdir(), "superskill-refresh-"));
    const stagedFile = kind === "skill" ? sharedSkillFile(staging) : join(staging, "instructions.md");
    mkdirSync(dirname(stagedFile), { recursive: true });
    writeFileSync(stagedFile, original, { flag: "wx", mode: 0o600 });
    if (kind === "skill") installSharedSkill({ homeDir: staging });
    else writeMarkdownInstruction(stagedFile);
    const updated = readFileSync(stagedFile, "utf8");
    if (updated === original) return false;
    replacement = join(dirname(path), `.${basename(path)}.${randomUUID()}.refresh`);
    writeFileSync(replacement, updated, { flag: "wx", mode: info.mode & 0o777 });
    const current = lstatSync(path);
    if (!current.isFile() || current.ino !== info.ino || current.dev !== info.dev || readFileSync(path, "utf8") !== original) return false;
    renameSync(replacement, path);
    replacement = undefined;
    return true;
  } finally {
    if (replacement) rmSync(replacement, { force: true });
    if (staging) rmSync(staging, { recursive: true, force: true });
    const owned = fstatSync(lock);
    closeSync(lock);
    if (existsSync(lockPath)) {
      const current = lstatSync(lockPath);
      if (current.ino === owned.ino && current.dev === owned.dev) unlinkSync(lockPath);
    }
  }
}

export function refreshExistingManagedInstallation(homeDir = homedir()): string[] {
  const updated: string[] = [];
  const targets: Array<{ path: string; kind: "skill" | "instruction" }> = [{ path: sharedSkillFile(homeDir), kind: "skill" }];
  for (const client of CLIENT_REGISTRY) {
    if (client.instructionStrategy !== "markdown-file") continue;
    const target = client.instructionPaths?.[currentPlatform()];
    if (target?.startsWith("~/")) targets.push({ path: join(homeDir, target.slice(2)), kind: "instruction" });
  }
  for (const target of targets) {
    try {
      if (refreshFile(target.path, target.kind, homeDir)) updated.push(target.path);
    } catch (error) {
      console.error(`[setup-refresh] Could not refresh ${target.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return updated;
}

export interface StartupRefreshResult {
  refreshed: string[];
  upgraded: UpgradeReport["clients"];
}

export async function refreshStartupState(homeDir = homedir()): Promise<StartupRefreshResult> {
  let refreshed: string[] = [];
  const upgraded: UpgradeReport["clients"] = [];
  try {
    refreshed = refreshExistingManagedInstallation(homeDir);
  } catch (error) {
    console.error(`[setup-refresh] Startup refresh failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    upgraded.push(...(await upgradeCommand({})).clients);
  } catch (error) {
    console.error(`[setup-upgrade] Startup reconcile failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { refreshed, upgraded };
}
