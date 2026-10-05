import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { claudeAdapter } from "./claude.js";
import { codexAdapter } from "./codex.js";
import { opencodeAdapter } from "./opencode.js";
import {
  ALL_ADAPTERS,
  adapterById,
  backupOnce,
  detectAdapters,
  installAdapters,
  isSuperskillBootstrapCommand,
  planAdapters,
  readJsonSafe,
  uninstallAdapters,
} from "./index.js";
import type { AdapterContext } from "./types.js";

const CLI = "/usr/local/bin/superskill-cli";
const CLAUDE_COMMAND = `${CLI} worktree bootstrap --source session --claude-env`;
const CODEX_COMMAND = `${CLI} worktree bootstrap --source session`;
const OPENCODE_MARKER = "// superskill worktree plugin";

function ctxFor(repo: string): AdapterContext {
  return {
    repoRoot: repo,
    worktreeRoot: repo,
    stateDir: join(repo, ".git", "superskill"),
    envCommand: `${CLI} worktree env --eval`,
    superskillCli: CLI,
  };
}

function claudePath(repo: string): string {
  return join(repo, ".claude", "settings.local.json");
}

function codexPath(repo: string): string {
  return join(repo, ".codex", "hooks.json");
}

function opencodePath(repo: string): string {
  return join(repo, ".opencode", "plugins", "superskill-worktree.js");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

async function readJson<T = unknown>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf-8")) as T;
}

function claudeEntries(settings: Record<string, unknown>): unknown[] {
  return asRecord(asRecord(settings.hooks).SessionStart) as unknown as unknown[];
}

describe("worktree host adapters", () => {
  let base: string;
  let repo: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "host-adapters-"));
    repo = join(base, "repo");
    await mkdir(repo, { recursive: true });
    originalHome = process.env.HOME;
    process.env.HOME = join(base, "home");
    await mkdir(process.env.HOME, { recursive: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    await rm(base, { recursive: true, force: true });
  });

  describe("claudeAdapter", () => {
    it("installs the SessionStart hook into .claude/settings.local.json", async () => {
      const ctx = ctxFor(repo);
      const result = await claudeAdapter.install(ctx);
      expect(result).toMatchObject({ adapter: "claude-code", changed: true, dryRun: false });
      expect(result.files).toEqual([claudePath(repo)]);
      expect(await readJson(claudePath(repo))).toEqual({
        hooks: {
          SessionStart: [{ hooks: [{ type: "command", command: CLAUDE_COMMAND, timeout: 10 }] }],
        },
      });
    });

    it("is idempotent", async () => {
      const ctx = ctxFor(repo);
      await claudeAdapter.install(ctx);
      const again = await claudeAdapter.install(ctx);
      expect(again.changed).toBe(false);
      expect(again.files).toEqual([]);
    });

    it("preserves unrelated keys and hook entries while deduping", async () => {
      const original = {
        permissions: { allow: ["Bash(npm run test:*)"] },
        hooks: {
          SessionStart: [{ hooks: [{ type: "command", command: "echo hello" }] }],
          PreToolUse: [{ matcher: "Write", hooks: [{ type: "command", command: "echo pre" }] }],
        },
      };
      await mkdir(join(repo, ".claude"), { recursive: true });
      await writeFile(claudePath(repo), `${JSON.stringify(original, null, 2)}\n`);

      const result = await claudeAdapter.install(ctxFor(repo));
      expect(result.changed).toBe(true);
      const settings = await readJson<Record<string, unknown>>(claudePath(repo));
      expect(settings.permissions).toEqual(original.permissions);
      expect(asRecord(settings.hooks).PreToolUse).toEqual(original.hooks.PreToolUse);
      expect(claudeEntries(settings)).toEqual([
        original.hooks.SessionStart[0],
        { hooks: [{ type: "command", command: CLAUDE_COMMAND, timeout: 10 }] },
      ]);
      expect(await readJson(`${claudePath(repo)}.bak.superskill`)).toEqual(original);

      const again = await claudeAdapter.install(ctxFor(repo));
      expect(again.changed).toBe(false);
      expect(claudeEntries(await readJson(claudePath(repo)))).toHaveLength(2);
    });

    it("preserves user entries that only mention worktree bootstrap", async () => {
      const foreign = { hooks: [{ type: "command", command: 'echo "worktree bootstrap notes"' }] };
      await mkdir(join(repo, ".claude"), { recursive: true });
      await writeFile(
        claudePath(repo),
        `${JSON.stringify({ hooks: { SessionStart: [foreign] } }, null, 2)}\n`,
      );

      const installed = await claudeAdapter.install(ctxFor(repo));
      expect(installed.changed).toBe(true);
      expect(claudeEntries(await readJson(claudePath(repo)))).toEqual([
        foreign,
        { hooks: [{ type: "command", command: CLAUDE_COMMAND, timeout: 10 }] },
      ]);

      const removed = await claudeAdapter.uninstall(ctxFor(repo));
      expect(removed.changed).toBe(true);
      expect(claudeEntries(await readJson(claudePath(repo)))).toEqual([foreign]);
    });

    it("dedupes and removes commands that combine superskill with worktree bootstrap", async () => {
      const wrapped = 'bash -lc "superskill-cli worktree bootstrap --source session"';
      await mkdir(join(repo, ".claude"), { recursive: true });
      await writeFile(
        claudePath(repo),
        `${JSON.stringify(
          { model: "opus", hooks: { SessionStart: [{ hooks: [{ type: "command", command: wrapped }] }] } },
          null,
          2,
        )}\n`,
      );

      const installed = await claudeAdapter.install(ctxFor(repo));
      expect(installed.changed).toBe(true);
      expect(claudeEntries(await readJson(claudePath(repo)))).toEqual([
        { hooks: [{ type: "command", command: CLAUDE_COMMAND, timeout: 10 }] },
      ]);

      const removed = await claudeAdapter.uninstall(ctxFor(repo));
      expect(removed.changed).toBe(true);
      const settings = await readJson<Record<string, unknown>>(claudePath(repo));
      expect(settings.model).toBe("opus");
      expect(settings.hooks).toBeUndefined();
    });

    it("uninstalls only our entries and keeps unrelated ones", async () => {
      const original = {
        permissions: { allow: ["Bash"] },
        hooks: {
          SessionStart: [{ hooks: [{ type: "command", command: "echo hello" }] }],
        },
      };
      await mkdir(join(repo, ".claude"), { recursive: true });
      await writeFile(claudePath(repo), `${JSON.stringify(original, null, 2)}\n`);
      await claudeAdapter.install(ctxFor(repo));

      const result = await claudeAdapter.uninstall(ctxFor(repo));
      expect(result.changed).toBe(true);
      const settings = await readJson<Record<string, unknown>>(claudePath(repo));
      expect(settings.permissions).toEqual(original.permissions);
      expect(claudeEntries(settings)).toEqual(original.hooks.SessionStart);

      const again = await claudeAdapter.uninstall(ctxFor(repo));
      expect(again.changed).toBe(false);
    });

    it("restores the pre-install backup when the config becomes empty", async () => {
      await mkdir(join(repo, ".claude"), { recursive: true });
      await writeFile(claudePath(repo), '{ "hooks": {} }\n');
      await claudeAdapter.install(ctxFor(repo));

      const result = await claudeAdapter.uninstall(ctxFor(repo));
      expect(result.changed).toBe(true);
      expect(result.notes).toContain("restored pre-install backup");
      expect(await readFile(claudePath(repo), "utf-8")).toBe('{ "hooks": {} }\n');
    });

    it("leaves an empty object behind when no backup exists", async () => {
      await claudeAdapter.install(ctxFor(repo));
      const result = await claudeAdapter.uninstall(ctxFor(repo));
      expect(result.changed).toBe(true);
      expect(await readJson(claudePath(repo))).toEqual({});
    });

    it("plans without writing", async () => {
      const result = await claudeAdapter.plan(ctxFor(repo));
      expect(result).toMatchObject({ changed: true, dryRun: true, files: [claudePath(repo)] });
      expect(existsSync(claudePath(repo))).toBe(false);
    });
  });

  describe("codexAdapter", () => {
    it("installs the SessionStart hook into .codex/hooks.json", async () => {
      const result = await codexAdapter.install(ctxFor(repo));
      expect(result).toMatchObject({ adapter: "codex", changed: true, dryRun: false });
      expect(result.files).toEqual([codexPath(repo)]);
      expect(await readJson(codexPath(repo))).toEqual({
        hooks: {
          SessionStart: [{ hooks: [{ type: "command", command: CODEX_COMMAND }] }],
        },
      });
    });

    it("is idempotent", async () => {
      await codexAdapter.install(ctxFor(repo));
      const again = await codexAdapter.install(ctxFor(repo));
      expect(again.changed).toBe(false);
      expect(again.files).toEqual([]);
    });

    it("preserves unrelated keys and hook entries while deduping", async () => {
      const original = {
        model: "gpt-5",
        hooks: {
          SessionStart: [{ hooks: [{ type: "command", command: "echo codex" }] }],
          Stop: [{ hooks: [{ type: "command", command: "echo stop" }] }],
        },
      };
      await mkdir(join(repo, ".codex"), { recursive: true });
      await writeFile(codexPath(repo), `${JSON.stringify(original, null, 2)}\n`);

      const result = await codexAdapter.install(ctxFor(repo));
      expect(result.changed).toBe(true);
      const settings = await readJson<Record<string, unknown>>(codexPath(repo));
      expect(settings.model).toBe("gpt-5");
      expect(asRecord(settings.hooks).Stop).toEqual(original.hooks.Stop);
      expect(asRecord(settings.hooks).SessionStart).toEqual([
        original.hooks.SessionStart[0],
        { hooks: [{ type: "command", command: CODEX_COMMAND }] },
      ]);

      const removed = await codexAdapter.uninstall(ctxFor(repo));
      expect(removed.changed).toBe(true);
      const after = await readJson<Record<string, unknown>>(codexPath(repo));
      expect(asRecord(after.hooks).SessionStart).toEqual(original.hooks.SessionStart);
      expect(asRecord(after.hooks).Stop).toEqual(original.hooks.Stop);
      expect(after.model).toBe("gpt-5");
    });

    it("plans without writing", async () => {
      const result = await codexAdapter.plan(ctxFor(repo));
      expect(result).toMatchObject({ changed: true, dryRun: true });
      expect(existsSync(codexPath(repo))).toBe(false);
    });
  });

  describe("opencodeAdapter", () => {
    it("writes the plugin with the marker and expected shape", async () => {
      const result = await opencodeAdapter.install(ctxFor(repo));
      expect(result).toMatchObject({ adapter: "opencode", changed: true, dryRun: false });
      expect(result.files).toEqual([opencodePath(repo)]);
      const content = await readFile(opencodePath(repo), "utf-8");
      expect(content.startsWith(`${OPENCODE_MARKER}\n`)).toBe(true);
      expect(content).toContain("export const SuperskillWorktree = async ({ $ }) => ({");
      expect(content).toContain('"shell.env": async (_input, output) => {');
      expect(content).toContain('process.env.SUPERSKILL_CLI ?? "superskill-cli"');
      expect(content).toContain("await $`${cli} worktree env --json`.quiet().nothrow();");
      expect(content).toContain("Object.assign(output.env, JSON.parse(result.stdout))");
    });

    it("is idempotent", async () => {
      await opencodeAdapter.install(ctxFor(repo));
      const again = await opencodeAdapter.install(ctxFor(repo));
      expect(again.changed).toBe(false);
      expect(again.files).toEqual([]);
    });

    it("never overwrites a plugin file without the marker", async () => {
      const filePath = opencodePath(repo);
      await mkdir(join(repo, ".opencode", "plugins"), { recursive: true });
      await writeFile(filePath, "// hand-written plugin\nexport default {};\n");

      const result = await opencodeAdapter.install(ctxFor(repo));
      expect(result.changed).toBe(false);
      expect(result.files).toEqual([]);
      expect(result.notes.join(" ")).toContain("marker");
      expect(await readFile(filePath, "utf-8")).toBe(
        "// hand-written plugin\nexport default {};\n",
      );
    });

    it("overwrites a stale marked file and keeps a backup", async () => {
      const filePath = opencodePath(repo);
      await mkdir(join(repo, ".opencode", "plugins"), { recursive: true });
      await writeFile(filePath, `${OPENCODE_MARKER}\nold content\n`);

      const result = await opencodeAdapter.install(ctxFor(repo));
      expect(result.changed).toBe(true);
      expect(await readFile(`${filePath}.bak.superskill`, "utf-8")).toBe(
        `${OPENCODE_MARKER}\nold content\n`,
      );
      expect(await readFile(filePath, "utf-8")).not.toContain("old content");
    });

    it("uninstall removes marked files and prunes the empty plugins dir", async () => {
      const filePath = opencodePath(repo);
      await opencodeAdapter.install(ctxFor(repo));
      const result = await opencodeAdapter.uninstall(ctxFor(repo));
      expect(result.changed).toBe(true);
      expect(existsSync(filePath)).toBe(false);
      expect(existsSync(join(repo, ".opencode", "plugins"))).toBe(false);
    });

    it("uninstall leaves files without the marker untouched", async () => {
      const filePath = opencodePath(repo);
      await mkdir(join(repo, ".opencode", "plugins"), { recursive: true });
      await writeFile(filePath, "// hand-written plugin\n");
      const result = await opencodeAdapter.uninstall(ctxFor(repo));
      expect(result.changed).toBe(false);
      expect(existsSync(filePath)).toBe(true);
    });

    it("plans without writing", async () => {
      const result = await opencodeAdapter.plan(ctxFor(repo));
      expect(result).toMatchObject({ changed: true, dryRun: true });
      expect(existsSync(opencodePath(repo))).toBe(false);
    });
  });

  describe("registry", () => {
    it("exposes every adapter in stable order", () => {
      expect(ALL_ADAPTERS.map((adapter) => adapter.id)).toEqual([
        "claude-code",
        "opencode",
        "codex",
        "cursor",
        "gemini",
        "grokbuild",
        "generic",
      ]);
    });

    it("resolves adapters by id", () => {
      expect(adapterById("claude-code")).toBe(claudeAdapter);
      expect(adapterById("opencode")).toBe(opencodeAdapter);
      expect(adapterById("codex")).toBe(codexAdapter);
      expect(adapterById("missing")).toBeUndefined();
    });

    it("detectAdapters returns detected hosts and omits generic", async () => {
      for (const adapter of ALL_ADAPTERS) {
        vi.spyOn(adapter, "detect").mockResolvedValue(adapter.id === "cursor");
      }
      const detected = await detectAdapters();
      expect(detected.map((adapter) => adapter.id)).toEqual(["cursor"]);
    });

    it("detectAdapters falls back to generic when nothing is detected", async () => {
      for (const adapter of ALL_ADAPTERS) {
        vi.spyOn(adapter, "detect").mockResolvedValue(false);
      }
      const detected = await detectAdapters();
      expect(detected.map((adapter) => adapter.id)).toEqual(["generic"]);
    });

    it("installs an explicit subset, dedupes ids, and reports unknown ids", async () => {
      const ctx = ctxFor(repo);
      const results = await installAdapters(ctx, ["claude-code", "bogus", "claude-code"]);
      expect(results.map((result) => result.adapter)).toEqual(["claude-code", "bogus"]);
      expect(results[0].changed).toBe(true);
      expect(results[1]).toEqual({
        adapter: "bogus",
        changed: false,
        dryRun: false,
        files: [],
        notes: ["unknown adapter"],
      });
      expect(existsSync(claudePath(repo))).toBe(true);
    });

    it("installs detected adapters when ids are omitted", async () => {
      const ctx = ctxFor(repo);
      for (const adapter of ALL_ADAPTERS) {
        vi.spyOn(adapter, "detect").mockResolvedValue(adapter.id === "codex");
      }
      const results = await installAdapters(ctx);
      expect(results.map((result) => result.adapter)).toEqual(["codex"]);
      expect(existsSync(codexPath(repo))).toBe(true);
    });

    it("returns nothing for an empty explicit id list", async () => {
      expect(await installAdapters(ctxFor(repo), [])).toEqual([]);
    });

    it("plan does not write and uninstall tears down", async () => {
      const ctx = ctxFor(repo);
      const planned = await planAdapters(ctx, ["claude-code"]);
      expect(planned[0]).toMatchObject({ adapter: "claude-code", changed: true, dryRun: true });
      expect(existsSync(claudePath(repo))).toBe(false);

      await installAdapters(ctx, ["claude-code"]);
      const removed = await uninstallAdapters(ctx, ["claude-code"]);
      expect(removed[0].changed).toBe(true);
      expect(await readJson(claudePath(repo))).toEqual({});
    });

    it("uninstall reports unknown ids without touching disk", async () => {
      const results = await uninstallAdapters(ctxFor(repo), ["nope"]);
      expect(results).toEqual([
        { adapter: "nope", changed: false, dryRun: false, files: [], notes: ["unknown adapter"] },
      ]);
    });
  });

  describe("shared helpers", () => {
    it("backupOnce keeps the first backup", async () => {
      const filePath = join(repo, "data.json");
      await writeFile(filePath, '{"a":1}');
      expect(await backupOnce(filePath)).toBe(`${filePath}.bak.superskill`);
      await writeFile(filePath, '{"a":2}');
      expect(await backupOnce(filePath)).toBe(`${filePath}.bak.superskill`);
      expect(await readJson(`${filePath}.bak.superskill`)).toEqual({ a: 1 });
      expect(await backupOnce(join(repo, "missing.json"))).toBeNull();
    });

    it("readJsonSafe tolerates missing and corrupt files", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(await readJsonSafe(join(repo, "missing.json"))).toBeNull();
      const corrupt = join(repo, "corrupt.json");
      await writeFile(corrupt, "{not json");
      expect(await readJsonSafe(corrupt)).toBeNull();
      const arrayFile = join(repo, "array.json");
      await writeFile(arrayFile, "[1,2]");
      expect(await readJsonSafe(arrayFile)).toBeNull();
      spy.mockRestore();
    });

    it("isSuperskillBootstrapCommand requires a superskill token plus worktree bootstrap", () => {
      expect(isSuperskillBootstrapCommand(`${CLI} worktree bootstrap --source session`)).toBe(true);
      expect(
        isSuperskillBootstrapCommand('bash -lc "superskill-cli worktree bootstrap --source session"'),
      ).toBe(true);
      expect(isSuperskillBootstrapCommand("npx superskill worktree   bootstrap")).toBe(true);
      expect(isSuperskillBootstrapCommand("/usr/local/bin/superskill worktree bootstrap")).toBe(true);
      expect(isSuperskillBootstrapCommand('echo "worktree bootstrap notes"')).toBe(false);
      expect(isSuperskillBootstrapCommand("worktree bootstrap --source session")).toBe(false);
      expect(isSuperskillBootstrapCommand("superskill worktree env --eval")).toBe(false);
      expect(isSuperskillBootstrapCommand("superskill worktree-bootstrap")).toBe(false);
      expect(isSuperskillBootstrapCommand(undefined)).toBe(false);
      expect(isSuperskillBootstrapCommand(["superskill-cli worktree bootstrap"])).toBe(false);
    });
  });
});
