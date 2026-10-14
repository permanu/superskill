import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { CLIENT_REGISTRY } from "./clients.js";
import { configureClient } from "./configure.js";
import { teardownClient } from "./teardown.js";
import { readJsonConfig, updateJsonConfig, writeJsonConfig } from "./json-config.js";
import { installSharedSkill, removeSharedSkill, sharedSkillFile } from "./skill.js";
import { installSlashCommands, removeSlashCommands } from "./commands.js";
import { MARKER_BEGIN_HTML, MARKER_END_HTML, INSTRUCTION_TEXT } from "./types.js";
import type { DetectedClient } from "./types.js";

describe("setup safety", () => {
  let root: string;

  function detected(slug = "claude-code"): DetectedClient {
    const source = CLIENT_REGISTRY.find((client) => client.slug === slug)!;
    const commands = join(root, "commands");
    return {
      config: { ...source, commandPaths: source.commandPaths ? { darwin: commands, linux: commands, win32: commands } : undefined },
      mcpConfigPath: join(root, "config.json"),
      instructionPath: join(root, "instructions.md"),
    };
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "setup-safety-"));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  it.each(["null", "42", '"settings"', "[]", "{ broken", "// JSONC\n{}", '{"mcpServers":[]}'])("refuses unsupported JSON objects without replacing the file: %s", (text) => {
    const client = detected();
    writeFileSync(client.mcpConfigPath, text);
    if (!text.includes("mcpServers")) expect(readJsonConfig(client.mcpConfigPath)).toBeNull();
    for (const options of [{ dryRun: true }, {}]) {
      const result = configureClient(client, "/fixture-vault", options);
      expect(result.error).toBeTruthy();
      expect(result.mcpConfigured).toBe(false);
      expect(readFileSync(client.mcpConfigPath, "utf8")).toBe(text);
      expect(existsSync(`${client.mcpConfigPath}.bak.superskill`)).toBe(false);
      expect(existsSync(client.instructionPath!)).toBe(false);
    }
  });

  it("refuses config symlinks without replacing them or changing the target", () => {
    const client = detected();
    const target = join(root, "user-config.json");
    writeFileSync(target, '{"user":true}');
    symlinkSync(target, client.mcpConfigPath);
    expect(configureClient(client, "/fixture-vault").error).toContain("Refusing");
    expect(teardownClient(client).error).toContain("Refusing");
    expect(lstatSync(client.mcpConfigPath).isSymbolicLink()).toBe(true);
    expect(readFileSync(target, "utf8")).toBe('{"user":true}');
  });

  it("refuses dangling config symlinks rather than treating them as missing", () => {
    const client = detected();
    const target = join(root, "missing-target");
    symlinkSync(target, client.mcpConfigPath);
    expect(configureClient(client, "/fixture-vault").error).toContain("Refusing");
    expect(lstatSync(client.mcpConfigPath).isSymbolicLink()).toBe(true);
    expect(existsSync(target)).toBe(false);
  });

  it("refuses symlink config parents even for a target inside the fixture", () => {
    const client = detected();
    const target = join(root, "user-directory");
    mkdirSync(target);
    const link = join(root, "linked");
    symlinkSync(target, link);
    client.mcpConfigPath = join(link, "config.json");
    expect(configureClient(client, "/fixture-vault").error).toContain("Refusing");
    expect(existsSync(join(target, "config.json"))).toBe(false);
  });

  it("refuses symlink backups instead of clobbering their targets", () => {
    const path = join(root, "config.json");
    const target = join(root, "user-backup");
    writeFileSync(path, "{}");
    writeFileSync(target, "private user data");
    symlinkSync(target, `${path}.bak.superskill`);
    expect(() => writeJsonConfig(path, { changed: true })).toThrow(/Refusing/);
    expect(readFileSync(path, "utf8")).toBe("{}");
    expect(readFileSync(target, "utf8")).toBe("private user data");
  });

  it("does not replace a config swapped to a symlink during mutation", () => {
    const path = join(root, "config.json");
    const target = join(root, "newer-user-config");
    writeFileSync(path, "{}");
    writeFileSync(target, '{"newer":true}');
    expect(() => updateJsonConfig(path, () => {
      rmSync(path);
      symlinkSync(target, path);
      return { changed: true };
    })).toThrow(/Refusing/);
    expect(lstatSync(path).isSymbolicLink()).toBe(true);
    expect(readFileSync(target, "utf8")).toBe('{"newer":true}');
  });

  it("keeps config and rotated backup permissions private", () => {
    const path = join(root, "config.json");
    writeFileSync(path, "{}", { mode: 0o644 });
    writeJsonConfig(path, { first: true });
    writeJsonConfig(path, { second: true });
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(statSync(`${path}.bak.superskill`).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(`${path}.bak.superskill`, "utf8"))).toEqual({ first: true });
  });

  for (const slug of ["claude-code", "cursor", "opencode", "codex"]) {
    it(`${slug} refuses unsafe instruction appends through symlinks`, () => {
      const client = detected(slug);
      const target = join(root, "user-instruction");
      writeFileSync(target, "user notes\n");
      symlinkSync(target, client.instructionPath!);
      expect(configureClient(client, "/fixture-vault").error).toContain("Refusing");
      expect(teardownClient(client).error).toContain("Refusing");
      expect(lstatSync(client.instructionPath!).isSymbolicLink()).toBe(true);
      expect(readFileSync(target, "utf8")).toBe("user notes\n");
      expect(existsSync(client.mcpConfigPath)).toBe(false);
    });
  }

  it.each(["cursor", "opencode"])("%s teardown strips managed guidance and preserves surrounding user artifacts", (slug) => {
    const client = detected(slug);
    writeFileSync(client.mcpConfigPath, JSON.stringify({ instructions: [client.instructionPath] }));
    writeFileSync(client.instructionPath!, `# Personal\n\n${MARKER_BEGIN_HTML}\n${INSTRUCTION_TEXT}\n${MARKER_END_HTML}\n\nUser notes\n`);
    expect(teardownClient(client).instructionRemoved).toBe(true);
    const remaining = readFileSync(client.instructionPath!, "utf8");
    expect(remaining).toContain("# Personal");
    expect(remaining).toContain("User notes");
    expect(remaining).not.toContain(MARKER_BEGIN_HTML);
  });

  it("refuses shared-skill symlinks and preserves modified managed skill files on teardown", () => {
    const target = join(root, "user-skill");
    writeFileSync(target, "user skill");
    const file = sharedSkillFile(root);
    mkdirSync(dirname(file), { recursive: true });
    symlinkSync(target, file);
    expect(installSharedSkill({ homeDir: root }).installed).toBe(false);
    expect(removeSharedSkill({ homeDir: root }).removed).toBe(false);
    expect(readFileSync(target, "utf8")).toBe("user skill");
    rmSync(file);
    installSharedSkill({ homeDir: root });
    const edited = `${readFileSync(file, "utf8")}\nUser notes\n`;
    writeFileSync(file, edited);
    expect(removeSharedSkill({ homeDir: root }).removed).toBe(false);
    expect(readFileSync(file, "utf8")).toBe(edited);
  });

  it("preserves symlink and user-modified slash commands during install/teardown", () => {
    const config = detected("opencode").config;
    const dir = join(root, "commands");
    mkdirSync(dir);
    const target = join(root, "user-command");
    writeFileSync(target, "user command\n");
    symlinkSync(target, join(dir, "review.md"));
    expect(installSlashCommands(config, { homeDir: root }).skipped).toContain("review");
    const worktree = join(dir, "worktree.md");
    const edited = `${readFileSync(worktree, "utf8")}\nUser command addition\n`;
    writeFileSync(worktree, edited);
    const result = removeSlashCommands(config, { homeDir: root });
    expect(result.removed).not.toContain("review");
    expect(result.removed).not.toContain("worktree");
    expect(readFileSync(target, "utf8")).toBe("user command\n");
    expect(readFileSync(worktree, "utf8")).toBe(edited);
  });
});
