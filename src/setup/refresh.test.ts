import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { refreshExistingManagedInstallation } from "./refresh.js";
import * as instructions from "./instructions.js";
import { sharedSkillFile, SKILL_MARKER, skillContent } from "./skill.js";
import { INSTRUCTION_TEXT, MARKER_END_HTML, MARKER_START_HTML, PREVIOUS_INSTRUCTION_TEXT } from "./types.js";

function write(path: string, text: string): void { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); }
function marked(text: string): string { return `${MARKER_START_HTML}\n${text}\n${MARKER_END_HTML}`; }

describe("managed installation startup refresh", () => {
  let home: string;
  beforeEach(() => { home = mkdtempSync(join(tmpdir(), "managed-refresh-")); });
  afterEach(() => { vi.restoreAllMocks(); rmSync(home, { recursive: true, force: true }); });

  it("does not install anything into a fresh home or write stdout", () => {
    const stdout = vi.spyOn(process.stdout, "write");
    expect(refreshExistingManagedInstallation(home)).toEqual([]);
    expect(readdirSync(home)).toEqual([]);
    expect(stdout).not.toHaveBeenCalled();
  });
  it("refreshes existing managed skill and known instruction blocks preserving surrounding content", () => {
    const skill = sharedSkillFile(home);
    const instruction = join(home, ".codex", "AGENTS.md");
    write(skill, `${SKILL_MARKER}\nold shared skill`);
    write(instruction, `# Custom rules\n\n${marked(PREVIOUS_INSTRUCTION_TEXT)}\n\nKeep my footer.\n`);
    const stdout = vi.spyOn(process.stdout, "write");
    expect(refreshExistingManagedInstallation(home).sort()).toEqual([skill, instruction].sort());
    expect(readFileSync(skill, "utf8")).toBe(skillContent());
    expect(readFileSync(instruction, "utf8")).toBe(`# Custom rules\n\n${marked(INSTRUCTION_TEXT)}\n\nKeep my footer.\n`);
    expect(refreshExistingManagedInstallation(home)).toEqual([]);
    expect(stdout).not.toHaveBeenCalled();
  });
  it("preserves unmanaged skills, custom blocks, unmarked instructions and ownership-ambiguous formats", () => {
    const targets = [
      [sharedSkillFile(home), "User supplied skill"],
      [join(home, ".codex", "AGENTS.md"), marked("My custom superskill instructions")],
      [join(home, ".claude", "CLAUDE.md"), "Unmarked user rules"],
      [join(home, ".cursor", "rules", "superskill.mdc"), PREVIOUS_INSTRUCTION_TEXT],
      [join(home, ".config", "opencode", "superskill-instructions.md"), PREVIOUS_INSTRUCTION_TEXT],
    ];
    for (const [path, content] of targets) write(path, content);
    expect(refreshExistingManagedInstallation(home)).toEqual([]);
    for (const [path, content] of targets) expect(readFileSync(path, "utf8")).toBe(content);
  });
  it("skips symlinks and concurrent refresh locks", () => {
    const source = join(home, "custom.md");
    write(source, marked(PREVIOUS_INSTRUCTION_TEXT));
    const target = join(home, ".codex", "AGENTS.md");
    mkdirSync(dirname(target), { recursive: true }); symlinkSync(source, target);
    const skill = sharedSkillFile(home); write(skill, `${SKILL_MARKER}\nold`);
    write(`${skill}.refresh.lock`, "another process");
    expect(refreshExistingManagedInstallation(home)).toEqual([]);
    expect(readFileSync(source, "utf8")).toBe(marked(PREVIOUS_INSTRUCTION_TEXT));
    expect(readFileSync(skill, "utf8")).toContain("old");
  });
  it("preserves an instruction edit made while the replacement is prepared", () => {
    const target = join(home, ".codex", "AGENTS.md");
    write(target, marked(PREVIOUS_INSTRUCTION_TEXT));
    const originalWriter = instructions.writeMarkdownInstruction;
    vi.spyOn(instructions, "writeMarkdownInstruction").mockImplementation((path, force) => {
      const result = originalWriter(path, force);
      writeFileSync(target, "Concurrent user edit");
      return result;
    });
    expect(refreshExistingManagedInstallation(home)).toEqual([]);
    expect(readFileSync(target, "utf8")).toBe("Concurrent user edit");
    expect(readdirSync(dirname(target))).toEqual(["AGENTS.md"]);
  });

  it("reports errors only to stderr and allows startup to continue", () => {
    const skill = sharedSkillFile(home);
    write(skill, `${SKILL_MARKER}\nold`);
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    const stdout = vi.spyOn(process.stdout, "write");
    chmodSync(skill, 0o000);
    try {
      expect(refreshExistingManagedInstallation(home)).toEqual([]);
      expect(stderr).toHaveBeenCalled();
      expect(stdout).not.toHaveBeenCalled();
    } finally { chmodSync(skill, 0o600); }
  });

});
