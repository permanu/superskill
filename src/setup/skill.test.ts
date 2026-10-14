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
    expect(content).toMatch(/^---\nname: superskill\ndescription: Routes /);
    const description = content.match(/^description: (.+)$/m)?.[1] ?? "";
    expect(description.length).toBeLessThanOrEqual(1024);
    expect(description).toContain("Use when this host exposes superskill MCP tools");
    expect(content).toContain("not a standalone API or offline service");
    expect(content).toContain("OpenCode Code Mode uses `tools.superskill.<tool>`");
    expect(content).toContain("Claude Code exposes `mcp__superskill__<tool>`");
    expect(content).toContain("never guess or mechanically rewrite a tool name");
    expect(content).toContain("already-installed CLI");
    expect(content).toContain("`superskill --help`");
    expect(content).toContain("Do not install tools or use `npx` unless network use is explicitly approved");
    expect(content).toContain(SKILL_MARKER);
    expect(content).toContain("project_context");
    expect(content).toContain('action: "register"');
    expect(content).toContain("workspace_path");
    expect(content).toContain("Session registration and completion are coordination bookkeeping");
    expect(content).toContain("completion persists a session note");
    expect(content).toContain("additional ADRs, learnings, tasks, or reports unless requested or required by project policy");
    expect(content).toContain("Redact prompt text by default");
    expect(content).toContain("`include_prompts` only for bounded excerpts from the current project");
    expect(content).toContain("when explicitly requested and needed");
    expect(content).toContain("Never expose secrets, credentials, or unrelated history");
    expect(content).toContain("access other project history only with explicit scope and authorization");
    expect(content).toContain("explore|implement|review|ship");
    expect(content).toContain("Reuse the same session");
    expect(content).toContain("reroute when task, files, or phase meaningfully change");
    expect(content).toContain("Simple questions and read-only lookups need no session, plan, HLD/LLD, or human-question ritual");
    expect(content).toContain("graph IDs such as `constitution` and `principle:<existing-id>`");
    expect(content).toContain("offset_bytes");
    expect(content).toContain("max_bytes");
    expect(content).toContain("read_complete");
    expect(content).toContain("next_offset_bytes");
    expect(content).toContain("whole checkout in a locked recovery archive");
    expect(content).toContain("repository's actual default branch");
    expect(content).toContain("eligible clean, idle, session-owned checkouts after session completion once they are proven integrated");
    expect(content).toContain("Built-in session maintenance may automatically quarantine or relocate eligible clean, idle, session-owned checkouts after session completion");
    expect(content).toContain("returns recovery metadata, and never deletes it");
    expect(content).toContain("An assessment alone does not authorize manual actions");
    expect(content).toContain("Manual cleanup, cache apply/GC, permanent removal, policy/config changes, and installs require explicit authorization");
    expect(content).toContain("built-in session-maintenance preservation path below is the exception");
    expect(content).toContain("`persist: false`");
    expect(content).toContain("`apply: false`");
    expect(content).toContain("`apply: true`");
    expect(content).toContain("`dismiss: true` only when dismissal is explicitly requested");
    expect(content).toContain("host-discovered `watchdog` MCP tool by its exact exposed name");
    expect(content).toContain("OpenCode Code Mode: `tools.superskill.watchdog`");
    expect(content).toContain("Claude Code: `mcp__superskill__watchdog`");
    expect(content).not.toContain("Diagnose with `tools.superskill.watchdog`");
    expect(content).not.toContain("catalog/");
    expect(content).not.toContain("HTML");
    expect(content).not.toMatch(/never expose secrets or prompt text/i);
    expect(content).not.toContain("may be archived with explicit authorization");
    expect(content).not.toContain("permission for network access, installs, global configuration, fixes, dismissals, cache GC, cleanup");
  });

  it("installs to ~/.agents/skills/superskill/SKILL.md", () => {
    const result = installSharedSkill({ homeDir: home });
    const file = join(home, ".agents/skills/superskill/SKILL.md");
    expect(result.installed).toBe(true);
    expect(result.path).toBe(file);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf-8")).toContain(SKILL_MARKER);
    expect(readFileSync(file, "utf-8")).toBe(readFileSync(skillSourceFile(), "utf-8"));
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
