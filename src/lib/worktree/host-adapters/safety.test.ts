import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { chmod, lstat, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { claudeAdapter } from "./claude.js";
import { codexAdapter } from "./codex.js";
import { cursorAdapter } from "./cursor.js";
import { geminiAdapter } from "./gemini.js";
import { grokbuildAdapter } from "./grokbuild.js";
import { genericAdapter } from "./generic.js";
import { opencodeAdapter } from "./opencode.js";
import { isSuperskillBootstrapCommand, writeTextAtomic } from "./helpers.js";
import { installAdapters } from "./index.js";
import type { AdapterContext } from "./types.js";

const configAdapters = [
  { adapter: claudeAdapter, file: ".claude/settings.local.json", event: "SessionStart" },
  { adapter: codexAdapter, file: ".codex/hooks.json", event: "SessionStart" },
  { adapter: cursorAdapter, file: ".cursor/hooks.json", event: "sessionStart" },
  { adapter: geminiAdapter, file: ".gemini/settings.json", event: "SessionStart" },
  { adapter: grokbuildAdapter, file: ".grokbuild/hooks.json", event: "SessionStart" },
];
const allAdapters = [...configAdapters, { adapter: genericAdapter, file: "AGENTS.md" }, { adapter: opencodeAdapter, file: ".opencode/plugins/superskill-worktree.js" }];

describe("host adapter safety", () => {
  let base: string;
  let repo: string;
  let ctx: AdapterContext;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "host-safety-"));
    repo = join(base, "repo");
    await mkdir(repo);
    await mkdir(join(base, "home"));
    vi.stubEnv("HOME", join(base, "home"));
    vi.stubEnv("GROKBUILD_HOME", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    ctx = { repoRoot: repo, worktreeRoot: repo, stateDir: join(repo, ".git/superskill"), envCommand: "superskill-cli worktree env --eval", superskillCli: null };
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    await rm(base, { recursive: true, force: true });
  });

  for (const { adapter, file, event } of configAdapters) {
    for (const invalid of ["{ broken", "// JSONC\n{}", "[]", "null", "42", '{"hooks":[]}', JSON.stringify({ hooks: { [event]: "user-owned" } })]) {
      it(`${adapter.id} refuses malformed or unsupported config ${invalid}`, async () => {
        const path = join(repo, file);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, invalid);
        for (const run of [adapter.plan, adapter.install, adapter.uninstall]) {
          const result = await run(ctx);
          expect(result.changed).toBe(false);
          expect(result.files).toEqual([]);
          expect(result.notes.join(" ")).toContain("unchanged");
          expect(await readFile(path, "utf8")).toBe(invalid);
          expect(existsSync(`${path}.bak.superskill`)).toBe(false);
        }
      });
    }
  }

  for (const { adapter, file } of allAdapters) {
    it(`${adapter.id} refuses symlink files and leaves targets untouched`, async () => {
      const target = join(base, "user-file");
      await writeFile(target, "user data\n");
      const path = join(repo, file);
      await mkdir(dirname(path), { recursive: true });
      await symlink(target, path);
      for (const run of [adapter.plan, adapter.install, adapter.uninstall]) {
        const result = await run(ctx);
        expect(result.changed).toBe(false);
        expect(result.notes.join(" ")).toContain("symlink");
        expect((await lstat(path)).isSymbolicLink()).toBe(true);
        expect(await readFile(target, "utf8")).toBe("user data\n");
      }
    });

    if (file.includes("/")) {
      it(`${adapter.id} refuses symlink parents even when their targets are inside the repository`, async () => {
        const target = join(repo, "user-directory");
        await mkdir(target);
        await symlink(target, join(repo, file.split("/")[0]));
        for (const run of [adapter.plan, adapter.install, adapter.uninstall]) {
          expect((await run(ctx)).changed).toBe(false);
        }
        expect(existsSync(join(target, file.split("/").slice(1).join("/")))).toBe(false);
      });
    }
  }

  it("never restores stale settings after the user removed old settings", async () => {
    const path = join(repo, ".claude/settings.local.json");
    await mkdir(dirname(path));
    await writeFile(path, '{"oldUserSetting":"do not resurrect"}');
    await claudeAdapter.install(ctx);
    const installed = JSON.parse(await readFile(path, "utf8"));
    delete installed.oldUserSetting;
    await writeFile(path, JSON.stringify(installed));
    await claudeAdapter.uninstall(ctx);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual({});
  });

  it("preserves user commands sharing an entry with an owned bootstrap", async () => {
    const path = join(repo, ".claude/settings.local.json");
    await mkdir(dirname(path));
    await writeFile(path, JSON.stringify({ hooks: { SessionStart: [{ matcher: "startup", hooks: [{ type: "command", command: "superskill-cli worktree bootstrap" }, { type: "command", command: "user-command" }] }] } }));
    await claudeAdapter.uninstall(ctx);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual({ hooks: { SessionStart: [{ matcher: "startup", hooks: [{ type: "command", command: "user-command" }] }] } });
  });

  it("preserves Cursor version values and the installed hook position among user hooks", async () => {
    const path = join(repo, ".cursor/hooks.json");
    await mkdir(dirname(path));
    const before = { command: "before" };
    const after = { command: "after" };
    await writeFile(path, JSON.stringify({ version: "user-version", hooks: { sessionStart: [before, { command: "/old/superskill-cli worktree bootstrap" }, after] } }));
    await cursorAdapter.install(ctx);
    const installed = JSON.parse(await readFile(path, "utf8"));
    expect(installed.version).toBe("user-version");
    expect(installed.hooks.sessionStart).toEqual([before, { command: "superskill-cli worktree bootstrap --source session" }, after]);
  });

  it("detects against the context repository without changing the process directory", async () => {
    await mkdir(join(repo, ".cursor"));
    const installed = await installAdapters(ctx);
    expect(installed.map((result) => result.adapter)).toEqual(["cursor"]);
  });

  it("uses private permissions for generated settings and their backups", async () => {
    const path = join(repo, ".claude/settings.local.json");
    await mkdir(dirname(path));
    await writeFile(path, "{}", { mode: 0o644 });
    await chmod(path, 0o644);
    await claudeAdapter.install(ctx);
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    expect((await stat(`${path}.bak.superskill`)).mode & 0o777).toBe(0o600);
  });

  it("refuses a symlink backup rather than writing or restoring its target", async () => {
    const path = join(repo, ".claude/settings.local.json");
    await mkdir(dirname(path));
    await writeFile(path, "{}");
    const target = join(base, "backup-target");
    await writeFile(target, "private user backup");
    await symlink(target, `${path}.bak.superskill`);
    expect((await claudeAdapter.install(ctx)).changed).toBe(false);
    expect(await readFile(target, "utf8")).toBe("private user backup");
  });

  it("refuses stale atomic replacements rather than overwriting newer user changes", async () => {
    const path = join(repo, "settings.json");
    await writeFile(path, "newer user settings");
    await expect(writeTextAtomic(path, "old settings", 0o600, repo, "older snapshot")).rejects.toThrow(/changed during write/);
    expect(await readFile(path, "utf8")).toBe("newer user settings");
  });

  it("preserves a modified OpenCode plugin on uninstall", async () => {
    await opencodeAdapter.install(ctx);
    const path = join(repo, ".opencode/plugins/superskill-worktree.js");
    const modified = `${await readFile(path, "utf8")}\nexport const userSetting = true;\n`;
    await writeFile(path, modified);
    expect((await opencodeAdapter.uninstall(ctx)).changed).toBe(false);
    expect(await readFile(path, "utf8")).toBe(modified);
  });

  it("leaves unterminated generic instruction blocks and user tails intact", async () => {
    const path = join(repo, "AGENTS.md");
    const text = "# User\n<!-- superskill:worktree-start -->\nuser tail\n";
    await writeFile(path, text);
    expect((await genericAdapter.install(ctx)).changed).toBe(false);
    expect(await readFile(path, "utf8")).toBe(text);
  });

  it("preserves an existing empty generic instruction file on uninstall", async () => {
    const path = join(repo, "AGENTS.md");
    await writeFile(path, "");
    await genericAdapter.install(ctx);
    await genericAdapter.uninstall(ctx);
    expect(await readFile(path, "utf8")).toBe("");
  });

  it("preserves an existing empty GrokBuild hooks file on uninstall", async () => {
    const path = join(repo, ".grokbuild/hooks.json");
    await mkdir(dirname(path));
    await writeFile(path, "{ }\n");
    await grokbuildAdapter.install(ctx);
    await grokbuildAdapter.uninstall(ctx);
    expect(await readFile(path, "utf8")).toBe("{ }\n");
  });

  it.each([
    'echo "superskill-cli worktree bootstrap"',
    "printf superskill-cli worktree bootstrap",
    "not-superskill-cli worktree bootstrap",
    "old superskill-cli worktree bootstrap",
    "superskill-cli --help worktree bootstrap",
    'bash -lc \'echo "superskill-cli worktree bootstrap"\'',
    "superskill-cli worktree bootstrap && user-command",
    "superskill-cli worktree bootstrap\nuser-command",
  ])("does not claim user commands merely mentioning bootstrap: %s", (command) => {
    expect(isSuperskillBootstrapCommand(command)).toBe(false);
  });
});
