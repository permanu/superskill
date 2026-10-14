// SPDX-License-Identifier: Apache-2.0
import { existsSync, readFileSync, rmdirSync, unlinkSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertSafeSetupPath, readSetupText, writeSetupText } from "./file-safety.js";

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
  try {
    assertSafeSetupPath(file);
  } catch (error) {
    result.skipped = (error as Error).message;
    return result;
  }

  if (existsSync(file)) {
    let existing = "";
    try {
      existing = readSetupText(file) ?? "";
    } catch (error) {
      result.skipped = `could not read existing skill: ${(error as Error).message}`;
      return result;
    }
    if (!existing.includes(SKILL_MARKER)) {
      result.skipped = "existing SKILL.md is not superskill-managed";
      return result;
    }
    const content = skillContent();
    if (!opts.dryRun && existing !== content) {
      writeSetupText(file, content, existing);
    }
    result.installed = true;
    return result;
  }

  if (!opts.dryRun) {
    writeSetupText(file, skillContent(), null);
  }
  result.installed = true;
  return result;
}

export function removeSharedSkill(
  opts: { dryRun?: boolean; homeDir?: string } = {}
): { removed: boolean; path: string } {
  const file = sharedSkillFile(opts.homeDir);
  try {
    assertSafeSetupPath(file);
  } catch (error) {
    console.error(`[setup-skill] ${(error as Error).message}`);
    return { removed: false, path: file };
  }
  if (!existsSync(file)) return { removed: false, path: file };

  let content = "";
  try {
    content = readSetupText(file) ?? "";
  } catch {
    return { removed: false, path: file };
  }
  if (content !== skillContent()) return { removed: false, path: file };

  if (!opts.dryRun) {
    assertSafeSetupPath(file);
    unlinkSync(file);
    try {
      rmdirSync(dirname(file));
    } catch {
      // directory not empty (user files) — keep it
    }
  }
  return { removed: true, path: file };
}
