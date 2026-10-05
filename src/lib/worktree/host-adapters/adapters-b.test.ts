import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cursorAdapter } from "./cursor.js";
import { geminiAdapter } from "./gemini.js";
import { grokbuildAdapter } from "./grokbuild.js";
import { genericAdapter } from "./generic.js";
import type { AdapterContext } from "./types.js";

const CLI = "/opt/superskill/dist/cli.js";
const BOOTSTRAP_COMMAND = `${CLI} worktree bootstrap --source session`;

const GENERIC_START = "<!-- superskill:worktree-start -->";
const GENERIC_END = "<!-- superskill:worktree-end -->";
const GENERIC_BLOCK = [
  GENERIC_START,
  "## SuperSkill worktree caches",
  "- Run `superskill-cli worktree env --eval` (or the MCP tool `worktree_env`) before installing dependencies in a worktree.",
  "- Never symlink `node_modules` or share `target/`, `.venv`, `DerivedData` between worktrees.",
  "- `superskill-cli worktree audit` reports cache duplication; `worktree gc` is report-only unless `--apply`.",
  GENERIC_END,
].join("\n");

function ctxFor(repoRoot: string): AdapterContext {
  return {
    repoRoot,
    worktreeRoot: repoRoot,
    stateDir: join(repoRoot, ".git", "superskill"),
    envCommand: `${CLI} worktree env --eval`,
    superskillCli: CLI,
  };
}

async function readText(filePath: string): Promise<string> {
  return readFile(filePath, "utf-8");
}

async function readJson<T = unknown>(filePath: string): Promise<T> {
  return JSON.parse(await readText(filePath)) as T;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function record(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return value as unknown[];
}

function cursorEntries(file: Record<string, unknown>): Array<{ command?: string }> {
  return asArray(record(file.hooks).sessionStart) as Array<{ command?: string }>;
}

interface SessionStartEntry {
  hooks?: Array<{ type?: string; command?: string }>;
}

function geminiEntries(file: Record<string, unknown>): SessionStartEntry[] {
  return asArray(record(file.hooks).SessionStart) as SessionStartEntry[];
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

describe("worktree host adapters (b)", () => {
  let base: string;
  let repo: string;
  let home: string;
  let originalHome: string | undefined;
  let originalCwd: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "adapters-b-"));
    repo = join(base, "repo");
    home = join(base, "home");
    await mkdir(repo, { recursive: true });
    await mkdir(home, { recursive: true });
    originalHome = process.env.HOME;
    originalCwd = process.cwd();
    process.env.HOME = home;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    await rm(base, { recursive: true, force: true });
  });

  describe("cursorAdapter", () => {
    it("detects through repo or home .cursor directories", async () => {
      process.chdir(repo);
      expect(await cursorAdapter.detect()).toBe(false);
      await mkdir(join(repo, ".cursor"), { recursive: true });
      expect(await cursorAdapter.detect()).toBe(true);
      await rm(join(repo, ".cursor"), { recursive: true, force: true });
      await mkdir(join(home, ".cursor"), { recursive: true });
      expect(await cursorAdapter.detect()).toBe(true);
    });

    it("plans without writing, installs the sessionStart hook, and is idempotent", async () => {
      const filePath = join(repo, ".cursor", "hooks.json");
      const plan = await cursorAdapter.plan(ctxFor(repo));
      expect(plan.dryRun).toBe(true);
      expect(plan.changed).toBe(true);
      expect(plan.files).toEqual([filePath]);
      expect(await exists(filePath)).toBe(false);

      const first = await cursorAdapter.install(ctxFor(repo));
      expect(first.changed).toBe(true);
      expect(first.dryRun).toBe(false);
      const file = await readJson<Record<string, unknown>>(filePath);
      expect(file.version).toBe(1);
      expect(cursorEntries(file)).toEqual([{ command: BOOTSTRAP_COMMAND }]);

      const second = await cursorAdapter.install(ctxFor(repo));
      expect(second.changed).toBe(false);
      expect(second.files).toEqual([]);
    });

    it("preserves unrelated keys and hooks while deduping bootstrap entries", async () => {
      const dir = join(repo, ".cursor");
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(dir, "hooks.json"),
        JSON.stringify(
          {
            version: 1,
            theme: "dark",
            hooks: {
              preToolUse: [{ command: "keep-me" }],
              sessionStart: [
                { command: "other-tool start" },
                { command: "/old/superskill-cli worktree bootstrap --source session" },
              ],
            },
          },
          null,
          2,
        ),
      );

      const res = await cursorAdapter.install(ctxFor(repo));
      expect(res.changed).toBe(true);
      const file = await readJson<Record<string, unknown>>(join(dir, "hooks.json"));
      expect(file.theme).toBe("dark");
      expect(record(file.hooks).preToolUse).toEqual([{ command: "keep-me" }]);
      expect(cursorEntries(file)).toEqual([
        { command: "other-tool start" },
        { command: BOOTSTRAP_COMMAND },
      ]);
    });

    it("preserves foreign worktree bootstrap entries and removes only ours", async () => {
      const dir = join(repo, ".cursor");
      await mkdir(dir, { recursive: true });
      const foreign = { command: 'echo "worktree bootstrap notes"' };
      const wrapped = {
        command: 'bash -lc "superskill-cli worktree bootstrap --source session"',
      };
      await writeFile(
        join(dir, "hooks.json"),
        JSON.stringify({ version: 1, hooks: { sessionStart: [foreign, wrapped] } }, null, 2),
      );

      const installed = await cursorAdapter.install(ctxFor(repo));
      expect(installed.changed).toBe(true);
      expect(cursorEntries(await readJson(join(dir, "hooks.json")))).toEqual([
        foreign,
        { command: BOOTSTRAP_COMMAND },
      ]);

      const removed = await cursorAdapter.uninstall(ctxFor(repo));
      expect(removed.changed).toBe(true);
      expect(cursorEntries(await readJson(join(dir, "hooks.json")))).toEqual([foreign]);
    });

    it("uninstalls only bootstrap entries", async () => {
      const dir = join(repo, ".cursor");
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(dir, "hooks.json"),
        JSON.stringify(
          {
            version: 1,
            hooks: {
              sessionStart: [
                { command: BOOTSTRAP_COMMAND },
                { command: "other-tool start" },
              ],
            },
          },
          null,
          2,
        ),
      );

      const res = await cursorAdapter.uninstall(ctxFor(repo));
      expect(res.changed).toBe(true);
      const file = await readJson<Record<string, unknown>>(join(dir, "hooks.json"));
      expect(cursorEntries(file)).toEqual([{ command: "other-tool start" }]);

      const again = await cursorAdapter.uninstall(ctxFor(repo));
      expect(again.changed).toBe(false);
    });

    it("notes Claude Code auto-import when settings.local.json already has the hook", async () => {
      const claudeDir = join(repo, ".claude");
      await mkdir(claudeDir, { recursive: true });
      await writeFile(
        join(claudeDir, "settings.local.json"),
        JSON.stringify({
          hooks: {
            SessionStart: [
              { hooks: [{ type: "command", command: "superskill-cli worktree bootstrap" }] },
            ],
          },
        }),
      );
      const res = await cursorAdapter.install(ctxFor(repo));
      expect(res.changed).toBe(true);
      expect(res.notes.join(" ")).toContain("Claude Code hooks");
    });

    it("does not note Claude auto-import for foreign worktree bootstrap entries", async () => {
      const claudeDir = join(repo, ".claude");
      await mkdir(claudeDir, { recursive: true });
      await writeFile(
        join(claudeDir, "settings.local.json"),
        JSON.stringify({
          hooks: {
            SessionStart: [
              { hooks: [{ type: "command", command: 'echo "worktree bootstrap notes"' }] },
            ],
          },
        }),
      );
      const res = await cursorAdapter.install(ctxFor(repo));
      expect(res.notes.join(" ")).not.toContain("Claude Code hooks");
    });
  });

  describe("geminiAdapter", () => {
    it("detects through repo or home .gemini directories", async () => {
      process.chdir(repo);
      expect(await geminiAdapter.detect()).toBe(false);
      await mkdir(join(repo, ".gemini"), { recursive: true });
      expect(await geminiAdapter.detect()).toBe(true);
      await mkdir(join(home, ".gemini"), { recursive: true });
      expect(await geminiAdapter.detect()).toBe(true);
    });

    it("installs the SessionStart hook and is idempotent", async () => {
      const filePath = join(repo, ".gemini", "settings.json");
      const plan = await geminiAdapter.plan(ctxFor(repo));
      expect(plan.dryRun).toBe(true);
      expect(plan.changed).toBe(true);
      expect(await exists(filePath)).toBe(false);

      const first = await geminiAdapter.install(ctxFor(repo));
      expect(first.changed).toBe(true);
      const file = await readJson<Record<string, unknown>>(filePath);
      expect(geminiEntries(file)).toEqual([
        { hooks: [{ type: "command", command: BOOTSTRAP_COMMAND }] },
      ]);

      const second = await geminiAdapter.install(ctxFor(repo));
      expect(second.changed).toBe(false);
      expect(second.files).toEqual([]);
    });

    it("preserves unrelated settings while deduping bootstrap hooks", async () => {
      const dir = join(repo, ".gemini");
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(dir, "settings.json"),
        JSON.stringify(
          {
            theme: "dark",
            hooks: {
              BeforeTool: [{ hooks: [{ type: "command", command: "lint" }] }],
              SessionStart: [
                { hooks: [{ type: "command", command: "keep" }] },
                { hooks: [{ type: "command", command: "old superskill-cli worktree bootstrap" }] },
              ],
            },
          },
          null,
          2,
        ),
      );

      const res = await geminiAdapter.install(ctxFor(repo));
      expect(res.changed).toBe(true);
      const file = await readJson<Record<string, unknown>>(join(dir, "settings.json"));
      expect(file.theme).toBe("dark");
      expect(record(file.hooks).BeforeTool).toEqual([
        { hooks: [{ type: "command", command: "lint" }] },
      ]);
      expect(geminiEntries(file)).toEqual([
        { hooks: [{ type: "command", command: "keep" }] },
        { hooks: [{ type: "command", command: BOOTSTRAP_COMMAND }] },
      ]);
    });

    it("uninstalls only bootstrap hooks", async () => {
      const dir = join(repo, ".gemini");
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(dir, "settings.json"),
        JSON.stringify(
          {
            hooks: {
              SessionStart: [
                { hooks: [{ type: "command", command: BOOTSTRAP_COMMAND }] },
                { hooks: [{ type: "command", command: "keep" }] },
                {
                  hooks: [
                    { type: "command", command: "superskill-cli worktree bootstrap" },
                    { type: "command", command: "also-keep" },
                  ],
                },
              ],
            },
          },
          null,
          2,
        ),
      );

      const res = await geminiAdapter.uninstall(ctxFor(repo));
      expect(res.changed).toBe(true);
      const file = await readJson<Record<string, unknown>>(join(dir, "settings.json"));
      expect(geminiEntries(file)).toEqual([
        { hooks: [{ type: "command", command: "keep" }] },
        { hooks: [{ type: "command", command: "also-keep" }] },
      ]);

      const again = await geminiAdapter.uninstall(ctxFor(repo));
      expect(again.changed).toBe(false);
    });

    it("preserves foreign worktree bootstrap entries and removes only ours", async () => {
      const dir = join(repo, ".gemini");
      await mkdir(dir, { recursive: true });
      const foreign = { hooks: [{ type: "command", command: 'echo "worktree bootstrap notes"' }] };
      const wrapped = {
        hooks: [
          {
            type: "command",
            command: 'bash -lc "superskill-cli worktree bootstrap --source session"',
          },
        ],
      };
      await writeFile(
        join(dir, "settings.json"),
        JSON.stringify({ hooks: { SessionStart: [foreign, wrapped] } }, null, 2),
      );

      const installed = await geminiAdapter.install(ctxFor(repo));
      expect(installed.changed).toBe(true);
      expect(geminiEntries(await readJson(join(dir, "settings.json")))).toEqual([
        foreign,
        { hooks: [{ type: "command", command: BOOTSTRAP_COMMAND }] },
      ]);

      const removed = await geminiAdapter.uninstall(ctxFor(repo));
      expect(removed.changed).toBe(true);
      expect(geminiEntries(await readJson(join(dir, "settings.json")))).toEqual([foreign]);
    });
  });

  describe("grokbuildAdapter", () => {
    it("detects through GROKBUILD_HOME or a home .grokbuild directory", async () => {
      const originalEnv = process.env.GROKBUILD_HOME;
      delete process.env.GROKBUILD_HOME;
      process.chdir(repo);
      try {
        expect(await grokbuildAdapter.detect()).toBe(false);
        process.env.GROKBUILD_HOME = join(base, "gb-home");
        expect(await grokbuildAdapter.detect()).toBe(true);
        delete process.env.GROKBUILD_HOME;
        await mkdir(join(home, ".grokbuild"), { recursive: true });
        expect(await grokbuildAdapter.detect()).toBe(true);
      } finally {
        if (originalEnv === undefined) delete process.env.GROKBUILD_HOME;
        else process.env.GROKBUILD_HOME = originalEnv;
      }
    });

    it("falls back with a note when no .grokbuild directory exists", async () => {
      const res = await grokbuildAdapter.install(ctxFor(repo));
      expect(res.changed).toBe(false);
      expect(res.files).toEqual([]);
      expect(res.notes).toEqual([
        "GrokBuild hook surface unverified; relying on MCP tools + git post-checkout hook",
      ]);
      expect(await exists(join(repo, ".grokbuild"))).toBe(false);
    });

    it("writes hooks.json when .grokbuild exists and is idempotent", async () => {
      await mkdir(join(repo, ".grokbuild"), { recursive: true });
      const first = await grokbuildAdapter.install(ctxFor(repo));
      expect(first.changed).toBe(true);
      const file = await readJson<Record<string, unknown>>(
        join(repo, ".grokbuild", "hooks.json"),
      );
      expect(geminiEntries(file)).toEqual([
        { hooks: [{ type: "command", command: BOOTSTRAP_COMMAND }] },
      ]);

      const second = await grokbuildAdapter.install(ctxFor(repo));
      expect(second.changed).toBe(false);
      expect(second.files).toEqual([]);
    });

    it("preserves unrelated hooks while deduping bootstrap hooks", async () => {
      const dir = join(repo, ".grokbuild");
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(dir, "hooks.json"),
        JSON.stringify(
          {
            other: true,
            hooks: {
              SessionStart: [
                { hooks: [{ type: "command", command: "keep" }] },
                { hooks: [{ type: "command", command: "old superskill-cli worktree bootstrap" }] },
              ],
            },
          },
          null,
          2,
        ),
      );

      const res = await grokbuildAdapter.install(ctxFor(repo));
      expect(res.changed).toBe(true);
      const file = await readJson<Record<string, unknown>>(join(dir, "hooks.json"));
      expect(file.other).toBe(true);
      expect(geminiEntries(file)).toEqual([
        { hooks: [{ type: "command", command: "keep" }] },
        { hooks: [{ type: "command", command: BOOTSTRAP_COMMAND }] },
      ]);
    });

    it("uninstalls only when a marker is present and leaves other content intact", async () => {
      const dir = join(repo, ".grokbuild");
      await mkdir(dir, { recursive: true });
      const filePath = join(dir, "hooks.json");
      await writeFile(
        filePath,
        JSON.stringify(
          { hooks: { SessionStart: [{ hooks: [{ type: "command", command: "keep" }] }] } },
          null,
          2,
        ),
      );
      const before = await readText(filePath);
      const res = await grokbuildAdapter.uninstall(ctxFor(repo));
      expect(res.changed).toBe(false);
      expect(await readText(filePath)).toBe(before);
    });

    it("removes our entry and deletes the file when nothing else remains", async () => {
      await mkdir(join(repo, ".grokbuild"), { recursive: true });
      await grokbuildAdapter.install(ctxFor(repo));
      const res = await grokbuildAdapter.uninstall(ctxFor(repo));
      expect(res.changed).toBe(true);
      expect(await exists(join(repo, ".grokbuild", "hooks.json"))).toBe(false);
    });

    it("preserves foreign worktree bootstrap entries and removes only ours", async () => {
      const dir = join(repo, ".grokbuild");
      await mkdir(dir, { recursive: true });
      const foreign = { hooks: [{ type: "command", command: 'echo "worktree bootstrap notes"' }] };
      const wrapped = {
        hooks: [
          {
            type: "command",
            command: 'bash -lc "superskill-cli worktree bootstrap --source session"',
          },
        ],
      };
      await writeFile(
        join(dir, "hooks.json"),
        JSON.stringify({ hooks: { SessionStart: [foreign, wrapped] } }, null, 2),
      );

      const installed = await grokbuildAdapter.install(ctxFor(repo));
      expect(installed.changed).toBe(true);
      expect(geminiEntries(await readJson(join(dir, "hooks.json")))).toEqual([
        foreign,
        { hooks: [{ type: "command", command: BOOTSTRAP_COMMAND }] },
      ]);

      const removed = await grokbuildAdapter.uninstall(ctxFor(repo));
      expect(removed.changed).toBe(true);
      expect(geminiEntries(await readJson(join(dir, "hooks.json")))).toEqual([foreign]);
    });
  });

  describe("genericAdapter", () => {
    it("is always detected", async () => {
      expect(await genericAdapter.detect()).toBe(true);
    });

    it("plans without writing, creates AGENTS.md, and is idempotent", async () => {
      const filePath = join(repo, "AGENTS.md");
      const plan = await genericAdapter.plan(ctxFor(repo));
      expect(plan.dryRun).toBe(true);
      expect(plan.changed).toBe(true);
      expect(plan.files).toEqual([filePath]);
      expect(await exists(filePath)).toBe(false);

      const first = await genericAdapter.install(ctxFor(repo));
      expect(first.changed).toBe(true);
      expect(await readText(filePath)).toBe(`${GENERIC_BLOCK}\n`);

      const second = await genericAdapter.install(ctxFor(repo));
      expect(second.changed).toBe(false);
      expect(await readText(filePath)).toBe(`${GENERIC_BLOCK}\n`);
    });

    it("appends without altering existing bytes and replaces a tampered block", async () => {
      const filePath = join(repo, "AGENTS.md");
      const original = "# Project\n\nSome notes.\n";
      await writeFile(filePath, original);
      const res = await genericAdapter.install(ctxFor(repo));
      expect(res.changed).toBe(true);
      expect(await readText(filePath)).toBe(`${original}${GENERIC_BLOCK}\n`);
      expect(countOccurrences(await readText(filePath), GENERIC_START)).toBe(1);

      const tampered = `${original}${GENERIC_START}\nold text\n${GENERIC_END}\n`;
      await writeFile(filePath, tampered);
      const repaired = await genericAdapter.install(ctxFor(repo));
      expect(repaired.changed).toBe(true);
      expect(await readText(filePath)).toBe(`${original}${GENERIC_BLOCK}\n`);
      expect(countOccurrences(await readText(filePath), GENERIC_START)).toBe(1);
    });

    it("uninstall restores surrounding bytes and removes an otherwise-empty created file", async () => {
      const filePath = join(repo, "AGENTS.md");
      const original = "# Project\n\ntext\n";
      await writeFile(filePath, original);
      await genericAdapter.install(ctxFor(repo));

      const res = await genericAdapter.uninstall(ctxFor(repo));
      expect(res.changed).toBe(true);
      expect(await readText(filePath)).toBe(original);

      await rm(filePath, { force: true });
      await genericAdapter.install(ctxFor(repo));
      await genericAdapter.uninstall(ctxFor(repo));
      expect(await exists(filePath)).toBe(false);
    });

    it("uninstall leaves a file without the marker untouched", async () => {
      const filePath = join(repo, "AGENTS.md");
      await writeFile(filePath, "# Project\n");
      const res = await genericAdapter.uninstall(ctxFor(repo));
      expect(res.changed).toBe(false);
      expect(await readText(filePath)).toBe("# Project\n");
    });
  });
});
