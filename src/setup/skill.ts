// SPDX-License-Identifier: Apache-2.0
import { existsSync, mkdirSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export const SKILL_NAME = "superskill";
export const SKILL_MARKER = "<!-- superskill:skill -->";

export function sharedSkillDir(homeDir?: string): string {
  return join(homeDir ?? homedir(), ".agents", "skills", SKILL_NAME);
}

export function sharedSkillFile(homeDir?: string): string {
  return join(sharedSkillDir(homeDir), "SKILL.md");
}

export function skillSourceFile(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "skills", SKILL_NAME, "SKILL.md");
}

export function skillContent(): string {
  return readFileSync(skillSourceFile(), "utf-8");
}

export interface SkillInstallResult {
  installed: boolean;
  path: string;
  skipped?: string;
}

export function installSharedSkill(
  opts: { dryRun?: boolean; homeDir?: string } = {}
): SkillInstallResult {
  const file = sharedSkillFile(opts.homeDir);
  const result: SkillInstallResult = { installed: false, path: file };

  if (existsSync(file)) {
    let existing = "";
    try {
      existing = readFileSync(file, "utf-8");
    } catch {
      existing = "";
    }
    if (!existing.includes(SKILL_MARKER)) {
      result.skipped = "existing SKILL.md is not superskill-managed";
      return result;
    }
    const content = skillContent();
    if (!opts.dryRun && existing !== content) {
      writeFileSync(file, content, "utf-8");
    }
    result.installed = true;
    return result;
  }

  if (!opts.dryRun) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, skillContent(), "utf-8");
  }
  result.installed = true;
  return result;
}

export function removeSharedSkill(
  opts: { dryRun?: boolean; homeDir?: string } = {}
): { removed: boolean; path: string } {
  const file = sharedSkillFile(opts.homeDir);
  if (!existsSync(file)) return { removed: false, path: file };

  let content = "";
  try {
    content = readFileSync(file, "utf-8");
  } catch {
    return { removed: false, path: file };
  }
  if (!content.includes(SKILL_MARKER)) return { removed: false, path: file };

  if (!opts.dryRun) {
    unlinkSync(file);
    try {
      rmdirSync(dirname(file));
    } catch {
      // directory not empty (user files) — keep it
    }
  }
  return { removed: true, path: file };
}
