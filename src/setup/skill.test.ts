// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join } from "path";
import {
  installSharedSkill,
  removeSharedSkill,
  sharedSkillFile,
  skillSourceFile,
  SKILL_MARKER,
} from "./skill.js";

describe("shared skill install", () => {
  let home: string;

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), "superskill-skill-"));
  });

  afterEach(async () => {
    await rm(home, { recursive: true, force: true });
  });

  it("ships a SKILL.md source with frontmatter and marker", () => {
    const content = readFileSync(skillSourceFile(), "utf-8");
    expect(content).toMatch(/^---\nname: superskill\n/);
    expect(content).toContain(SKILL_MARKER);
    expect(content).toContain("project_context");
    expect(content).toContain("worktree assessment");
    expect(content).toContain("before verification or completion");
    expect(content).toContain("explore|implement|review|ship");
    expect(content).toContain("ordered local stack");
    expect(content).toContain("At every session start");
    expect(content).toContain("initializes a missing graph");
    expect(content).not.toContain("usually the repo directory name");
    expect(content).toContain("Workers do not independently push or create PRs");
    expect(content).toContain("proven merged into main");
  });

  it("installs to ~/.agents/skills/superskill/SKILL.md", () => {
    const result = installSharedSkill({ homeDir: home });
    const file = join(home, ".agents/skills/superskill/SKILL.md");
    expect(result.installed).toBe(true);
    expect(result.path).toBe(file);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf-8")).toContain(SKILL_MARKER);
  });

  it("is idempotent", () => {
    installSharedSkill({ homeDir: home });
    const first = readFileSync(sharedSkillFile(home), "utf-8");
    installSharedSkill({ homeDir: home });
    expect(readFileSync(sharedSkillFile(home), "utf-8")).toBe(first);
  });

  it("never overwrites a foreign SKILL.md", async () => {
    const file = sharedSkillFile(home);
    mkdirSync(dirname(file), { recursive: true });
    await writeFile(file, "---\nname: other\n---\n", "utf-8");
    const result = installSharedSkill({ homeDir: home });
    expect(result.installed).toBe(false);
    expect(result.skipped).toBeTruthy();
    expect(readFileSync(file, "utf-8")).toContain("name: other");
  });

  it("dry-run writes nothing", () => {
    const result = installSharedSkill({ homeDir: home, dryRun: true });
    expect(result.installed).toBe(true);
    expect(existsSync(sharedSkillFile(home))).toBe(false);
  });

  it("removes only marker-managed files and keeps user files in the directory", () => {
    installSharedSkill({ homeDir: home });
    const extra = join(home, ".agents/skills/superskill/notes.md");
    writeFileSync(extra, "keep", "utf-8");

    const removed = removeSharedSkill({ homeDir: home });
    expect(removed.removed).toBe(true);
    expect(existsSync(sharedSkillFile(home))).toBe(false);
    expect(existsSync(extra)).toBe(true);
    expect(existsSync(dirname(extra))).toBe(true);
  });

  it("does not remove a foreign SKILL.md", async () => {
    const file = sharedSkillFile(home);
    mkdirSync(dirname(file), { recursive: true });
    await writeFile(file, "# mine\n", "utf-8");
    expect(removeSharedSkill({ homeDir: home }).removed).toBe(false);
    expect(existsSync(file)).toBe(true);
  });

  it("removes the empty skill directory when managed", () => {
    installSharedSkill({ homeDir: home });
    removeSharedSkill({ homeDir: home });
    expect(existsSync(join(home, ".agents/skills/superskill"))).toBe(false);
  });

  it("dry-run remove keeps the file", () => {
    installSharedSkill({ homeDir: home });
    const removed = removeSharedSkill({ homeDir: home, dryRun: true });
    expect(removed.removed).toBe(true);
    expect(existsSync(sharedSkillFile(home))).toBe(true);
  });
});
