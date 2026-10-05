// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import type { CommandContext } from "../../core/types.js";
import { repoStateDir } from "../../lib/worktree/paths.js";
import { seedWorktree } from "../../lib/worktree/seed.js";
import { appendJournal, readJournal } from "../../lib/worktree/state.js";
import { worktreeApplyCommand, renderWorktreeApply, type WorktreeApplyResult } from "./apply.js";

const execFileAsync = promisify(execFile);

const GIT_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};

const ctx = {
  log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
} as unknown as CommandContext;

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd, env: GIT_ENV, timeout: 20000 });
  return stdout;
}

async function optionalModule(specifier: string): Promise<Record<string, unknown> | null> {
  try {
    return (await import(specifier)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const auditModule = await optionalModule("../../lib/worktree/audit.js");
const activateModule = await optionalModule("../../lib/worktree/activate.js");
const hasAudit = typeof auditModule?.auditRepo === "function";
const hasActivate = typeof activateModule?.activateRepo === "function";

describe("worktree apply", () => {
  let base: string;
  let repo: string;
  let previous: string;

  beforeEach(async () => {
    previous = process.cwd();
    base = await mkdtemp(join(tmpdir(), "worktree-apply-"));
    repo = join(base, "repo");
    await mkdir(repo, { recursive: true });
    await git(repo, ["init", "-q", "-b", "main"]);
    await git(repo, ["config", "core.hooksPath", ".githooks"]);
    await writeFile(join(repo, "package.json"), '{"name":"apply-test","private":true}\n');
    await git(repo, ["add", "."]);
    await git(repo, ["commit", "-q", "-m", "init"]);
    process.chdir(repo);
  });

  afterEach(async () => {
    process.chdir(previous);
    await rm(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it("returns a plan and writes nothing without --yes", async () => {
    const result = await worktreeApplyCommand({ allSafe: true }, ctx);

    expect(result.dryRun).toBe(true);
    expect(result.applied).toEqual([]);
    expect(Array.isArray(result.planned)).toBe(true);

    const stateDir = await repoStateDir(repo);
    expect(existsSync(join(stateDir, "policy.json"))).toBe(false);
    expect(existsSync(join(stateDir, "journal.jsonl"))).toBe(false);

    const rendered = renderWorktreeApply(result);
    expect(typeof rendered).toBe("string");
    expect(rendered).toContain("(plan)");
  });

  it("does not include consent items for --all-safe even with --yes", async () => {
    const result = await worktreeApplyCommand({ allSafe: true, yes: true }, ctx);
    expect(result.planned.every((item) => item.consent === false)).toBe(true);
  });

  const applyDescribe = hasAudit && hasActivate ? describe : describe.skip;
  applyDescribe("with a real audit and activate module", () => {
    it("applies safe items and installs policy.json plus the hook", async () => {
      const plan = await worktreeApplyCommand({ allSafe: true }, ctx);
      expect(plan.planned.some((item) => item.kind === "policy")).toBe(true);

      const result: WorktreeApplyResult = await worktreeApplyCommand({ allSafe: true, yes: true }, ctx);
      expect(result.dryRun).toBe(false);
      expect(result.applied.some((outcome) => outcome.status === "applied")).toBe(true);

      const stateDir = await repoStateDir(repo);
      expect(existsSync(join(stateDir, "policy.json"))).toBe(true);

      const hooksDir = join(await realpath(repo), ".githooks");
      expect(existsSync(join(hooksDir, "post-checkout"))).toBe(true);
    });

    it("runs a consent-gated tool prune when named with --yes", async () => {
      await writeFile(join(repo, "go.mod"), "module example.com/test\n");
      await git(repo, ["add", "go.mod"]);
      await git(repo, ["commit", "-q", "-m", "add go module"]);
      const binDir = join(base, "bin");
      const record = join(base, "go-invocation.txt");
      await mkdir(binDir, { recursive: true });
      await writeFile(
        join(binDir, "go"),
        `#!/bin/sh\nprintf '%s\\n' "$@" >> '${record}'\nexit 0\n`,
        { mode: 0o755 },
      );
      const previousPath = process.env.PATH;
      process.env.PATH = `${binDir}${delimiter}${previousPath ?? ""}`;
      try {
        const result = await worktreeApplyCommand({ item: ["prune:go"], yes: true }, ctx);

        expect(result.dryRun).toBe(false);
        const outcome = result.applied.find((entry) => entry.id === "prune:go");
        expect(outcome).toBeDefined();
        expect(outcome!.status).toBe("applied");
        const res = outcome!.result as { applied: boolean; note: string; command: string };
        expect(res.applied).toBe(true);
        expect(res.note).toBe("executed");
        expect(res.command).toContain("clean");
        expect(await readFile(record, "utf-8")).toContain("clean");
      } finally {
        if (previousPath === undefined) delete process.env.PATH;
        else process.env.PATH = previousPath;
      }
    }, 20000);

    it("quarantines a worktree-local cache with consent and restores it with undo", async () => {
      await writeFile(join(repo, ".gitignore"), "node_modules/\n");
      await git(repo, ["add", ".gitignore"]);
      await git(repo, ["commit", "-q", "-m", "ignore node_modules"]);
      await mkdir(join(repo, "node_modules", "pkg"), { recursive: true });
      await writeFile(join(repo, "node_modules", "pkg", "index.js"), "module.exports = 1;\n");

      const worktree = join(base, "wt-reclaim");
      await git(repo, ["worktree", "add", "-q", "-b", "wt-reclaim", worktree]);

      process.chdir(worktree);
      const cwd = process.cwd();
      try {
        const seeded = await seedWorktree(cwd);
        expect(seeded.seeded.map((entry) => entry.relative)).toContain("node_modules");

        const plan = await worktreeApplyCommand({ item: ["reclaim:node:node-modules"] }, ctx);
        expect(plan.dryRun).toBe(true);
        expect(plan.skipped).toEqual([
          { id: "reclaim:node:node-modules", reason: "consent item requires --yes" },
        ]);
        expect(existsSync(join(cwd, "node_modules"))).toBe(true);

        const applied = await worktreeApplyCommand({ item: ["reclaim:node:node-modules"], yes: true }, ctx);
        const outcome = applied.applied.find((entry) => entry.id === "reclaim:node:node-modules");
        expect(outcome).toBeDefined();
        expect(outcome!.status).toBe("applied");
        expect(existsSync(join(cwd, "node_modules"))).toBe(false);

        const move = outcome!.result as { journalId: string; from: string; to: string };
        const stateDir = await repoStateDir(repo);
        expect(move.to.startsWith(join(stateDir, "quarantine"))).toBe(true);
        expect(existsSync(join(stateDir, "quarantine", move.journalId, "node_modules"))).toBe(true);

        const quarantineEntry = (await readJournal(cwd)).find((entry) => entry.id === move.journalId);
        expect(quarantineEntry?.action).toBe("quarantine");
        expect(quarantineEntry?.detail).toBe("worktree-local");
        expect(quarantineEntry?.paths).toEqual([join(cwd, "node_modules")]);

        const undone = await worktreeApplyCommand({ undo: move.journalId, yes: true }, ctx);
        expect(undone.applied[0]?.status).toBe("applied");
        expect(existsSync(join(cwd, "node_modules", "pkg", "index.js"))).toBe(true);
        expect((await readJournal(cwd)).some((entry) => entry.action === "restore")).toBe(true);
      } finally {
        process.chdir(repo);
      }
    }, 20000);
  });

  describe("undo and selection error paths", () => {
    it("requires --yes before touching an undo and rejects unsafe ids", async () => {
      const planned = await worktreeApplyCommand({ undo: "journal-1" }, ctx);
      expect(planned.dryRun).toBe(true);
      expect(planned.applied).toEqual([]);
      expect(planned.notes.join(" ")).toContain("requires --yes");

      const unsafe = await worktreeApplyCommand({ undo: "../evil", yes: true }, ctx);
      expect(unsafe.applied[0]).toMatchObject({ status: "skipped", detail: "invalid journal id" });
    });

    it("reports missing journal entries and missing quarantine dirs", async () => {
      const absent = await worktreeApplyCommand({ undo: "no-such-journal", yes: true }, ctx);
      expect(absent.applied[0]).toMatchObject({
        status: "skipped",
        detail: "no quarantine journal entry for no-such-journal",
      });

      await appendJournal(repo, {
        id: "orphan-journal",
        ts: new Date().toISOString(),
        action: "quarantine",
        paths: [join(repo, "gone")],
        bytes: 0,
        detail: "test",
      });
      const orphan = await worktreeApplyCommand({ undo: "orphan-journal", yes: true }, ctx);
      expect(orphan.applied[0].detail).toBe("quarantine directory missing");
    });

    it("restores recorded paths and skips entries with no original or an existing target", async () => {
      const cwd = process.cwd();
      const stateDir = await repoStateDir(cwd);
      const quarantineDir = join(stateDir, "quarantine", "j-restore");
      await mkdir(join(quarantineDir, "node_modules"), { recursive: true });
      await writeFile(join(quarantineDir, "node_modules", "index.js"), "module.exports = 1;\n");
      await writeFile(join(quarantineDir, "stray"), "not recorded\n");
      await appendJournal(cwd, {
        id: "j-restore",
        ts: new Date().toISOString(),
        action: "quarantine",
        paths: [join(cwd, "node_modules")],
        bytes: 1,
        detail: "test",
      });

      const result = await worktreeApplyCommand({ undo: "j-restore", yes: true }, ctx);
      expect(result.applied[0].status).toBe("applied");
      expect(existsSync(join(cwd, "node_modules", "index.js"))).toBe(true);
      const details = result.applied[0].result as {
        restored: string[];
        skipped: Array<{ path: string; reason: string }>;
      };
      expect(details.restored).toEqual([join(cwd, "node_modules")]);
      expect(details.skipped.some((entry) => entry.reason === "no recorded original path")).toBe(true);

      await mkdir(join(stateDir, "quarantine", "j-blocked", "blocked"), { recursive: true });
      await mkdir(join(cwd, "blocked"), { recursive: true });
      await writeFile(join(stateDir, "quarantine", "j-blocked", "blocked", "file.txt"), "x");
      await appendJournal(cwd, {
        id: "j-blocked",
        ts: new Date().toISOString(),
        action: "quarantine",
        paths: [join(cwd, "blocked")],
        bytes: 1,
        detail: "test",
      });
      const blocked = await worktreeApplyCommand({ undo: "j-blocked", yes: true }, ctx);
      expect(blocked.applied[0]).toMatchObject({ status: "skipped", detail: "target already exists" });
    });

    it("skips quarantine entries outside the worktree and unreadable targets", async () => {
      const cwd = process.cwd();
      const stateDir = await repoStateDir(cwd);
      const quarantineDir = join(stateDir, "quarantine", "j-outside");
      await mkdir(quarantineDir, { recursive: true });
      await writeFile(join(quarantineDir, "outside"), "x");
      await appendJournal(cwd, {
        id: "j-outside",
        ts: new Date().toISOString(),
        action: "quarantine",
        paths: [join(base, "outside")],
        bytes: 1,
        detail: "test",
      });

      const result = await worktreeApplyCommand({ undo: "j-outside", yes: true }, ctx);
      expect(result.applied[0].status).toBe("skipped");
      const details = result.applied[0].result as { skipped: Array<{ reason: string }> };
      expect(details.skipped[0]?.reason).toBe("outside worktree");

      await writeFile(join(cwd, "plain-file"), "x");
      await mkdir(join(stateDir, "quarantine", "j-unreadable"), { recursive: true });
      await writeFile(join(stateDir, "quarantine", "j-unreadable", "child"), "x");
      await appendJournal(cwd, {
        id: "j-unreadable",
        ts: new Date().toISOString(),
        action: "quarantine",
        paths: [join(cwd, "plain-file", "child")],
        bytes: 1,
        detail: "test",
      });
      const unreadable = await worktreeApplyCommand({ undo: "j-unreadable", yes: true }, ctx);
      const unreadableDetails = unreadable.applied[0].result as {
        skipped: Array<{ reason: string }>;
      };
      expect(unreadableDetails.skipped.some((entry) => entry.reason.includes("cannot stat target"))).toBe(true);
    });

    it("reports unknown item ids and suggests a selection when nothing is chosen", async () => {
      const unknown = await worktreeApplyCommand({ item: ["does-not-exist"], yes: true }, ctx);
      expect(unknown.skipped).toContainEqual({ id: "does-not-exist", reason: "unknown item" });
      expect(unknown.applied).toEqual([]);

      const none = await worktreeApplyCommand({}, ctx);
      expect(none.notes.join(" ")).toContain("no selection");
    });

    it("renders plans, outcomes, skips, and notes, falling back to JSON for foreign input", () => {
      const text = renderWorktreeApply({
        worktreeRoot: "/wt",
        dryRun: true,
        planned: [
          {
            id: "policy:1",
            kind: "policy",
            title: "Policy",
            safe: true,
            consent: false,
            command: "superskill activate",
          },
        ],
        applied: [],
        skipped: [{ id: "x", reason: "unknown item" }],
        notes: ["audit unavailable: nope"],
      });
      expect(text).toContain("(plan): /wt");
      expect(text).toContain("policy:1 [policy] Policy :: superskill activate");
      expect(text).toContain("re-run with --yes to apply");
      expect(text).toContain("skipped: x — unknown item");
      expect(text).toContain("note: audit unavailable: nope");

      const applied = renderWorktreeApply({
        worktreeRoot: "/wt",
        dryRun: false,
        planned: [],
        applied: [{ id: "seed:1", kind: "seed", status: "applied", detail: "seeded node_modules" }],
        skipped: [],
        notes: [],
      });
      expect(applied).toContain("(applied): /wt");
      expect(applied).toContain("no items selected");
      expect(applied).toContain("applied: seed:1 — seeded node_modules");

      expect(renderWorktreeApply(42)).toBe("42");
      expect(renderWorktreeApply({ planned: "no" })).toContain('"planned"');
    });
  });
});
