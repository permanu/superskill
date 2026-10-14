import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { createCommandContext } from "../test-helpers.js";
import type { CommandContext } from "../core/types.js";
import type { Session } from "../lib/session-registry.js";
import { VaultError, VaultFS } from "../lib/vault-fs.js";
import { parseFrontmatter, serializeFrontmatter } from "../lib/frontmatter.js";
import * as knowledgeIndex from "../lib/knowledge-index.js";
import { contextCommand } from "./context.js";
import { linkCommand } from "./link.js";
import { deprecateCommand, pruneCommand, statsCommand } from "./prune.js";
import { formatResumeContext, resumeCommand, type ResumeContext } from "./resume.js";
import { credRefsCommand, envFactsCommand, rollbackCommand, snapshotRepoState } from "./snapshot.js";

const project = "memory-boundary";
const base = `projects/${project}`;
const old = "2000-01-01T00:00:00.000Z";

describe("memory command boundaries", () => {
  let root: string;
  let vaultFs: VaultFS;
  let ctx: CommandContext;

  beforeEach(async () => {
    vi.resetAllMocks();
    const parent = join(tmpdir(), "opencode");
    await mkdir(parent, { recursive: true });
    root = await mkdtemp(join(parent, "memory-boundary-"));
    vi.stubEnv("HOME", root);
    vaultFs = new VaultFS(root);
    ctx = createCommandContext(vaultFs, { projectSlug: project });
    await mkdir(join(root, base), { recursive: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    const db = knowledgeIndex.indexPathFor(root, project);
    if (await vaultFs.exists(relative(root, db))) knowledgeIndex.KnowledgeIndex.open(db).close();
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  });

  async function note(path: string, data: Record<string, unknown>, body = "# Note\n"): Promise<string> {
    const raw = serializeFrontmatter(data, body);
    await vaultFs.write(path, raw);
    return raw;
  }

  describe("repository and state notes", () => {
    it("replaces an explicit repository snapshot with deliberate empty defaults", async () => {
      const first = await snapshotRepoState({ project, branch: "feature/memory", dirty_files: ["src/changed.ts"], last_commit: "abc123" }, ctx);
      const stored = parseFrontmatter(await vaultFs.read(first.path));
      expect(stored.data).toMatchObject({ type: "repo-state", project, branch: "feature/memory", dirty_files: ["src/changed.ts"], last_commit: "abc123", snapshot_at: first.snapshot_at });
      expect(stored.content).toContain("**Branch**: feature/memory");
      expect(Number.isFinite(Date.parse(first.snapshot_at))).toBe(true);

      const cleared = await snapshotRepoState({ project }, ctx);
      expect(cleared).toMatchObject({ path: first.path, branch: null, dirty_files: [], last_commit: null });
      const updated = parseFrontmatter(await vaultFs.read(first.path));
      expect(updated.data).toMatchObject({ branch: null, dirty_files: [], last_commit: null });
      expect(updated.content).toContain("**Branch**: unknown");
      expect(updated.content).toContain("**Last Commit**: unknown");
      expect(updated.content).not.toContain("abc123");
    });

    it("lists missing state collections without creating state notes", async () => {
      expect(await envFactsCommand({ action: "list", project }, ctx)).toEqual({ facts: [] });
      expect(await credRefsCommand({ action: "list", project }, ctx)).toEqual({ references: [] });
      expect(await rollbackCommand({ action: "list", project }, ctx)).toEqual({ path: `${base}/_state/rollback-points.md`, checkpoints: [] });
      expect(await vaultFs.exists(`${base}/_state`)).toBe(false);
    });

    it.each([
      ["env-facts", "facts"],
      ["credential-references", "references"],
      ["rollback-points", "checkpoints"],
    ])("reads malformed %s state conservatively without rewriting it", async (name, field) => {
      const path = `${base}/_state/${name}.md`;
      for (const raw of [`---\n${field}: [\n---\nInvalid YAML\n`, serializeFrontmatter({ [field]: "not-a-list" }, "# State\n")]) {
        await vaultFs.write(path, raw);
        const result = name === "env-facts"
          ? await envFactsCommand({ action: "list", project }, ctx)
          : name === "credential-references"
            ? await credRefsCommand({ action: "list", project }, ctx)
            : await rollbackCommand({ action: "list", project }, ctx);
        expect(result).toHaveProperty(field, []);
        expect(await vaultFs.read(path)).toBe(raw);
      }
    });

    it.each([{ key: "region" }, { value: "eu" }, { key: "", value: "eu" }])("rejects incomplete environment facts before writing: %j", async (fields) => {
      await expect(envFactsCommand({ action: "add", project, ...fields }, ctx)).rejects.toThrow("key and value required");
      expect(await vaultFs.exists(`${base}/_state/env-facts.md`)).toBe(false);
    });

    it("normalizes legacy environment facts and replaces a matching key without duplicates", async () => {
      const path = `${base}/_state/env-facts.md`;
      await note(path, { facts: [{}, { key: 7, value: false, context: 9 }, { key: "region", value: "old", context: "legacy context" }] });
      expect((await envFactsCommand({ action: "list", project }, ctx)).facts).toEqual([
        { key: "", value: "", context: undefined },
        { key: "7", value: "false", context: undefined },
        { key: "region", value: "old", context: "legacy context" },
      ]);
      const replaced = await envFactsCommand({ action: "add", project, key: "region", value: "eu", context: "deployment region" }, ctx);
      expect(replaced.facts).toHaveLength(3);
      expect(replaced.facts[2]).toEqual({ key: "region", value: "eu", context: "deployment region" });
      expect(parseFrontmatter(await vaultFs.read(path)).content).toContain("- **region**: eu (deployment region)");

      await envFactsCommand({ action: "add", project, key: "region", value: "us", context: "" }, ctx);
      const cleared = parseFrontmatter(await vaultFs.read(path));
      expect((cleared.data.facts as Array<Record<string, unknown>>)[2]).toEqual({ key: "region", value: "us" });
      expect(cleared.content).not.toContain("deployment region");
    });

    it("replaces invalid collection metadata when adding a valid environment fact", async () => {
      const path = `${base}/_state/env-facts.md`;
      await note(path, { facts: "invalid" });
      expect((await envFactsCommand({ action: "add", project, key: "port", value: "3000" }, ctx)).facts).toEqual([{ key: "port", value: "3000", context: undefined }]);
      expect(parseFrontmatter(await vaultFs.read(path)).data.facts).toEqual([{ key: "port", value: "3000" }]);
    });

    it.each([{ name: "database" }, { location: "docs/secrets" }, { name: "", location: "docs/secrets" }])("rejects incomplete credential references without a state note: %j", async (fields) => {
      await expect(credRefsCommand({ action: "add", project, ...fields }, ctx)).rejects.toThrow("name and location required");
      expect(await vaultFs.exists(`${base}/_state/credential-references.md`)).toBe(false);
    });

    it("normalizes legacy credential references and replaces their optional notes", async () => {
      const path = `${base}/_state/credential-references.md`;
      await note(path, { references: [{}, { name: 7, location: false, notes: 9 }, { name: "database", location: "old-docs", notes: "old note" }] });
      expect((await credRefsCommand({ action: "list", project }, ctx)).references).toEqual([
        { name: "", location: "", notes: undefined },
        { name: "7", location: "false", notes: undefined },
        { name: "database", location: "old-docs", notes: "old note" },
      ]);
      const result = await credRefsCommand({ action: "add", project, name: "database", location: "docs/credential-location", notes: "owner contact" }, ctx);
      expect(result.references).toHaveLength(3);
      expect(result.references[2]).toEqual({ name: "database", location: "docs/credential-location", notes: "owner contact" });
      expect(parseFrontmatter(await vaultFs.read(path)).content).toContain("docs/credential-location — owner contact");

      await credRefsCommand({ action: "add", project, name: "database", location: "docs/new-location", notes: "" }, ctx);
      const cleared = parseFrontmatter(await vaultFs.read(path));
      expect((cleared.data.references as Array<Record<string, unknown>>)[2]).toEqual({ name: "database", location: "docs/new-location" });
      expect(cleared.content).not.toContain("owner contact");
    });

    it("replaces invalid reference metadata when adding a valid pointer", async () => {
      const path = `${base}/_state/credential-references.md`;
      await note(path, { references: "invalid" });
      expect((await credRefsCommand({ action: "add", project, name: "database", location: "docs/database" }, ctx)).references).toEqual([{ name: "database", location: "docs/database", notes: undefined }]);
      expect(parseFrontmatter(await vaultFs.read(path)).data.references).toEqual([{ name: "database", location: "docs/database" }]);
    });

    it("normalizes legacy rollback fields without modifying the recorded collection", async () => {
      const path = `${base}/_state/rollback-points.md`;
      const raw = await note(path, { checkpoints: [{}, { commit_hash: 7, purpose: false, scope: 9, created_at: 12, follow_up_started: true }] });
      expect((await rollbackCommand({ action: "list", project }, ctx)).checkpoints).toEqual([
        { commit_hash: "", purpose: "", scope: undefined, created_at: "", follow_up_started: false },
        { commit_hash: "7", purpose: "false", scope: undefined, created_at: "12", follow_up_started: true },
      ]);
      expect(await vaultFs.read(path)).toBe(raw);
    });

    it.each([{ commit_hash: "abc123" }, { purpose: "Before schema work" }])("rejects incomplete rollback points atomically: %j", async (fields) => {
      const path = `${base}/_state/rollback-points.md`;
      const raw = await note(path, { checkpoints: [] }, "# Existing rollback log\n");
      await expect(rollbackCommand({ action: "add", project, ...fields }, ctx)).rejects.toThrow("commit_hash and purpose required");
      expect(await vaultFs.read(path)).toBe(raw);
    });

    it("marks rollback follow-up by timestamp or commit while preserving scope and other checkpoints", async () => {
      const path = `${base}/_state/rollback-points.md`;
      await note(path, { checkpoints: [
        { commit_hash: "first-commit", purpose: "Before API", created_at: "2026-01-01T00:00:00.000Z", follow_up_started: false },
        { commit_hash: "second-commit", purpose: "Before schema", scope: "database", created_at: "2026-01-02T00:00:00.000Z", follow_up_started: false },
      ] });
      const byTime = await rollbackCommand({ action: "mark-follow-up", project, checkpoint_id: "2026-01-02T00:00:00.000Z" }, ctx);
      expect(byTime.checkpoints.map((entry) => entry.follow_up_started)).toEqual([false, true]);
      expect(byTime.checkpoints[1].scope).toBe("database");
      const byCommit = await rollbackCommand({ action: "mark-follow-up", project, checkpoint_id: "first-commit" }, ctx);
      expect(byCommit.checkpoints.map((entry) => entry.follow_up_started)).toEqual([true, true]);
      const body = parseFrontmatter(await vaultFs.read(path)).content;
      expect(body).toContain("Before schema [follow-up started] — scope: database");
      expect(body).toContain("Before API [follow-up started]");
    });

    it.each([undefined, "missing-checkpoint"])("does not modify rollback state for an invalid follow-up reference: %j", async (checkpoint_id) => {
      const path = `${base}/_state/rollback-points.md`;
      const raw = await note(path, { checkpoints: [] });
      await expect(rollbackCommand({ action: "mark-follow-up", project, checkpoint_id }, ctx)).rejects.toThrow(checkpoint_id ? "Checkpoint not found" : "checkpoint_id required");
      expect(await vaultFs.read(path)).toBe(raw);
    });

    it("preserves permission errors from rollback reads instead of treating them as missing state", async () => {
      const path = `${base}/_state/rollback-points.md`;
      const raw = await note(path, { checkpoints: [] });
      const scoped = { ...ctx, vaultFs: new VaultFS(root, { projectSlug: "other-project" }) };
      await expect(rollbackCommand({ action: "list", project }, scoped)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
      expect(await vaultFs.read(path)).toBe(raw);
    });
  });

  describe("context input, budgets, and derived metadata", () => {
    it.each(["invalid", "", null])("rejects unsupported detail levels without writing context: %j", async (detailLevel) => {
      await expect(contextCommand({ project, detailLevel: detailLevel as never }, ctx)).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
      expect(await vaultFs.list(base, 2)).toEqual([]);
    });

    it.each([0, -1, 1.5, Number.NaN, Infinity, 50_001, "100", null])("rejects invalid explicit token budgets without writing context: %j", async (maxTokens) => {
      await expect(contextCommand({ project, maxTokens: maxTokens as never }, ctx)).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
      expect(await vaultFs.list(base, 2)).toEqual([]);
    });

    it("honors explicit full budgets, uses summary configuration, and leaves full output unbounded only when requested", async () => {
      const path = `${base}/context.md`;
      const raw = await note(path, { updated: "not-a-date" }, `# Context\n\n${"Useful context paragraph. ".repeat(500)}\nEND_MARKER\n`);
      ctx.config.maxInjectTokens = 60;
      const summary = await contextCommand({ project }, ctx);
      expect(summary.truncated).toBe(true);
      expect(summary.context_md).not.toContain("END_MARKER");
      expect(summary.stale_context).toBe(false);
      const bounded = await contextCommand({ project, detailLevel: "full", maxTokens: 100 }, ctx);
      expect(bounded.truncated).toBe(true);
      expect(bounded.context_md).not.toContain("END_MARKER");
      const complete = await contextCommand({ project, detailLevel: "full" }, ctx);
      expect(complete.truncated).toBe(false);
      expect(complete.context_md).toBe(raw);
      expect(await vaultFs.read(path)).toBe(raw);
    });

    it("counts only learning markdown and derives empty metadata from a session without frontmatter", async () => {
      await note(`${base}/context.md`, {}, "# Context\n");
      await vaultFs.write(`${base}/learnings/001-note.md`, "# Learning\n");
      await vaultFs.write(`${base}/learnings/sidecar.txt`, "not a learning note");
      await vaultFs.write(`${base}/sessions/2026-01-01.md`, "# Session without metadata\n");
      const result = await contextCommand({ project }, ctx);
      expect(result.learning_count).toBe(1);
      expect(result.last_session).toEqual({ outcome: "", completed_at: "" });
      expect(result.open_threads).toEqual({ count: 0, items: [] });
    });

    it("does not treat non-markdown session sidecars as a last session", async () => {
      await note(`${base}/context.md`, {}, "# Context\n");
      await vaultFs.write(`${base}/sessions/trace.jsonl`, "{}");
      const result = await contextCommand({ project }, ctx);
      expect(result.last_session).toBeNull();
      expect(result.open_threads.items).toEqual([]);
    });

    it("filters malformed thread entries, deduplicates by kind, and bounds long previews", async () => {
      await note(`${base}/context.md`, {}, "# Context\n");
      await note(`${base}/sessions/new.md`, {
        blocked: [7, null, "", "   ", " Shared blocker ", "shared blocker", "x".repeat(200)],
        partially_completed: ["Shared blocker", "Partial work"],
      });
      const result = await contextCommand({ project }, ctx);
      expect(result.open_threads).toEqual({ count: 4, items: ["blocked: Shared blocker", `blocked: ${"x".repeat(157)}...`, "partial: Shared blocker"] });
    });

    it("treats raw ENOENT from optional collections as missing without error logs", async () => {
      const raw = await note(`${base}/context.md`, {}, "# Context\n");
      const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(vaultFs, "list").mockRejectedValue(Object.assign(new Error("removed concurrently"), { code: "ENOENT" }));
      const result = await contextCommand({ project }, ctx);
      expect(result).toMatchObject({ context_md: raw, learning_count: 0, last_session: null, open_threads: { count: 0, items: [] } });
      expect(errorLog).not.toHaveBeenCalled();
      expect(ctx.log.error).not.toHaveBeenCalled();
    });

    it.each([new VaultError("PERMISSION_DENIED", "auxiliary access denied"), new Error("auxiliary read failed"), "auxiliary read failed"])("logs unexpected optional collection failures without losing project context: %s", async (failure) => {
      const raw = await note(`${base}/context.md`, {}, "# Context\n");
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(vaultFs, "list").mockRejectedValue(failure);
      const result = await contextCommand({ project }, ctx);
      expect(result).toMatchObject({ context_md: raw, learning_count: 0, last_session: null, open_threads: { count: 0, items: [] } });
      expect(errors.mock.calls.map(([message]) => message)).toEqual(["[context] Error counting learnings:", "[context] Error reading last session:", "[context] Error deriving open threads:"]);
      expect(ctx.log.error).toHaveBeenCalledWith("[context] collectInjectAlways error:", failure instanceof Error ? failure.message : failure);
    });

    it.each([new VaultError("FILE_NOT_FOUND", "session vanished"), new VaultError("PERMISSION_DENIED", "session denied")])("keeps readable threads when a listed session cannot be opened: %s", async (failure) => {
      await note(`${base}/context.md`, {}, "# Context\n");
      const bad = `${base}/sessions/z-unreadable.md`;
      await note(bad, { outcome: "unavailable" });
      await note(`${base}/sessions/a-readable.md`, { blocked: ["Readable blocker"] });
      const read = vaultFs.read.bind(vaultFs);
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(vaultFs, "read").mockImplementation((path) => path === bad ? Promise.reject(failure) : read(path));
      const result = await contextCommand({ project }, ctx);
      expect(result.last_session).toBeNull();
      expect(result.open_threads).toEqual({ count: 1, items: ["blocked: Readable blocker"] });
      if (failure.code === "FILE_NOT_FOUND") expect(errors).not.toHaveBeenCalled();
      else expect(errors).toHaveBeenCalledWith("[context] Error reading session for open threads:", "session denied");
      expect(await read(bad)).toContain("outcome: unavailable");
    });

    it("keeps readable injected notes when one shared file cannot be read", async () => {
      const raw = await note(`${base}/context.md`, {}, "# Context\n");
      const bad = `${base}/shared/bad.md`;
      await note(bad, { inject: "always" }, "SHOULD_NOT_APPEAR\n");
      await note(`${base}/shared/good.md`, { inject: "always" }, "GOOD_SHARED_MARKER\n");
      const read = vaultFs.read.bind(vaultFs);
      vi.spyOn(vaultFs, "read").mockImplementation((path) => path === bad ? Promise.reject("read interrupted") : read(path));
      const result = await contextCommand({ project, detailLevel: "full" }, ctx);
      expect(result.context_md).toContain("GOOD_SHARED_MARKER");
      expect(result.context_md).not.toContain("SHOULD_NOT_APPEAR");
      expect(result.context_md).toContain(raw);
      expect(ctx.log.error).toHaveBeenCalledWith(`[context] Failed to read shared file ${bad}:`, "read interrupted");
    });
  });

  describe("retention, statistics, and deprecation", () => {
    it.each(["30", Infinity, -Infinity])("rejects invalid retention values before deleting anything: %j", async (sessions) => {
      const path = `${base}/sessions/old.md`;
      const raw = await note(path, { completed_at: old });
      await expect(pruneCommand({ project, mode: "delete", policy: { sessions: sessions as never } }, ctx)).rejects.toThrow(/Invalid retention policy/);
      expect(await vaultFs.read(path)).toBe(raw);
    });

    it("returns an empty dry-run for missing retention directories without creating archives", async () => {
      const result = await pruneCommand({ project, mode: "dry-run" }, ctx);
      expect(result[0]).toMatchObject({ archived: [], deleted: [], stats: { sessions_scanned: 0, tasks_scanned: 0 } });
      expect(await vaultFs.list(base, 2)).toEqual([]);
    });

    it.each(["dry-run", "archive", "delete"] as const)("applies %s only to old completed tasks and dated sessions", async (mode) => {
      const future = new Date(Date.now() + 86_400_000).toISOString();
      const targets = [
        [`${base}/sessions/old.md`, { created: old }],
        [`${base}/tasks/done.md`, { status: "done", created: old }],
        [`${base}/tasks/cancelled.md`, { status: "cancelled", updated: old }],
      ] as const;
      const retained = [
        [`${base}/sessions/no-date.md`, {}],
        [`${base}/sessions/invalid-date.md`, { completed_at: "invalid" }],
        [`${base}/sessions/future.md`, { completed_at: future, created: old }],
        [`${base}/tasks/active.md`, { status: "in-progress", updated: old }],
        [`${base}/tasks/no-date.md`, { status: "done" }],
        [`${base}/tasks/invalid-date.md`, { status: "done", updated: "invalid" }],
        [`${base}/tasks/future.md`, { status: "done", updated: future, created: old }],
      ] as const;
      const originals = new Map<string, string>();
      for (const [path, data] of [...targets, ...retained]) originals.set(path, await note(path, data));
      await vaultFs.write(`${base}/sessions/sidecar.txt`, "unchanged");
      await vaultFs.write(`${base}/tasks/sidecar.txt`, "unchanged");
      const result = (await pruneCommand({ project, mode, policy: { sessions: 1, doneTasks: 1 } }, ctx))[0];
      const affected = mode === "delete" ? result.deleted : result.archived.map((entry) => entry.from);
      expect(affected.sort()).toEqual(targets.map(([path]) => path).sort());
      expect(result.stats).toMatchObject({ sessions_scanned: 4, tasks_scanned: 6 });
      for (const [path] of retained) expect(await vaultFs.read(path)).toBe(originals.get(path));
      for (const [path] of targets) {
        if (mode === "dry-run") expect(await vaultFs.read(path)).toBe(originals.get(path));
        else {
          expect(await vaultFs.exists(path)).toBe(false);
          if (mode === "archive") expect(await vaultFs.read(path.replace(`${base}/`, `${base}/_archive/`))).toBe(originals.get(path));
        }
      }
      expect(await vaultFs.read(`${base}/tasks/sidecar.txt`)).toBe("unchanged");
      if (mode === "dry-run") expect(await vaultFs.exists(`${base}/_archive`)).toBe(false);
    });

    it("counts task status buckets and chooses the oldest valid frontmatter date without writing notes", async () => {
      const paths: string[] = [];
      for (const [index, status] of ["backlog", "in-progress", "done", "cancelled", "blocked"].entries()) {
        const path = `${base}/tasks/${index}.md`;
        await note(path, { status, created: `2025-01-0${index + 1}` });
        paths.push(path);
      }
      await note(`${base}/sessions/undated.md`, { completed_at: 7 });
      await note(`${base}/learnings/invalid.md`, { created: "not-a-date" });
      const oldest = `${base}/decisions/old.md`;
      await note(oldest, { created: old });
      await vaultFs.write(`${base}/brainstorms/readme.txt`, "not a markdown note");
      await vaultFs.write(`${base}/tasks/trace.jsonl`, "{}");
      const before = await Promise.all(paths.map((path) => vaultFs.read(path)));
      expect(await statsCommand({ project }, ctx)).toEqual({
        project, sessions: 1, learnings: 1, adrs: 1, brainstorms: 0,
        tasks: { total: 5, backlog: 1, inProgress: 1, done: 1, cancelled: 1 }, totalFiles: 8, oldestFile: oldest,
      });
      expect(await Promise.all(paths.map((path) => vaultFs.read(path)))).toEqual(before);
    });

    it.each(["count", "dates", "tasks", "session-read", "task-read"])("surfaces unexpected statistics failures during %s without modifying notes", async (stage) => {
      const session = `${base}/sessions/session.md`;
      const task = `${base}/tasks/task.md`;
      const sessionRaw = await note(session, { created: old });
      const taskRaw = await note(task, { status: "backlog", created: old });
      const failure = new VaultError("PERMISSION_DENIED", `denied during ${stage}`);
      const read = vaultFs.read.bind(vaultFs);
      const list = vaultFs.list.bind(vaultFs);
      let sessionLists = 0;
      vi.spyOn(vaultFs, "list").mockImplementation((path, depth) => {
        if (path === `${base}/sessions`) sessionLists++;
        if ((stage === "count" && path === `${base}/sessions`) || (stage === "dates" && path === `${base}/sessions` && sessionLists === 2) || (stage === "tasks" && path === `${base}/tasks`)) return Promise.reject(failure);
        return list(path, depth);
      });
      vi.spyOn(vaultFs, "read").mockImplementation((path) => ((stage === "session-read" && path === session) || (stage === "task-read" && path === task)) ? Promise.reject(failure) : read(path));
      await expect(statsCommand({ project }, ctx)).rejects.toBe(failure);
      expect(await read(session)).toBe(sessionRaw);
      expect(await read(task)).toBe(taskRaw);
    });

    it.each([new Error("index unavailable"), "index unavailable"])("keeps a successful archive durable when optional index maintenance fails: %s", async (failure) => {
      const path = `${base}/sessions/old.md`;
      const raw = await note(path, { created: old });
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(knowledgeIndex, "removeVaultFileFromIndex").mockImplementation(() => { throw failure; });
      vi.spyOn(knowledgeIndex, "upsertVaultFile").mockImplementation(() => { throw failure; });
      const result = (await pruneCommand({ project, mode: "archive" }, ctx))[0];
      expect(result.archived).toEqual([{ from: path, to: `${base}/_archive/sessions/old.md` }]);
      expect(await vaultFs.exists(path)).toBe(false);
      expect(await vaultFs.read(result.archived[0].to)).toBe(raw);
      expect(errors.mock.calls.map(([message]) => message)).toEqual([`[prune] Index removal skipped for ${path}:`, `[prune] Index upsert skipped for ${result.archived[0].to}:`]);
    });

    it.each([undefined, "Superseded by the replacement note"])("deprecates a note while preserving its body and optional reason: %j", async (reason) => {
      const path = `${base}/decisions/001-old.md`;
      await note(path, { status: "active", created: "2020-01-01", tags: ["architecture"] }, "# Existing decision\n\nOriginal rationale.\n");
      expect(await deprecateCommand({ path, reason }, ctx)).toEqual({ path, status: "deprecated" });
      const updated = parseFrontmatter(await vaultFs.read(path));
      expect(updated.data).toMatchObject({ status: "deprecated", created: "2020-01-01", tags: ["architecture"] });
      expect(updated.content).toContain("Original rationale.");
      if (reason) expect(updated.content).toContain(`**Deprecated**: ${reason}`);
      else expect(updated.content).not.toContain("**Deprecated**:");
    });
  });

  describe("links", () => {
    it.each(["bad[link", "bad]link", "bad|alias", "bad#anchor", "bad\nline", "bad\u0000control", "bad\u007fcontrol"])("rejects unsafe targets before touching the source: %j", async (target) => {
      const source = `${base}/source.md`;
      const raw = await note(source, { updated: "2020-01-01" }, "# Source\n");
      await expect(linkCommand({ source, target }, ctx)).rejects.toThrow("Invalid link target");
      expect(await vaultFs.read(source)).toBe(raw);
    });

    it("does not create a missing link source", async () => {
      const source = `${base}/missing.md`;
      await expect(linkCommand({ source, target: "target.md" }, ctx)).rejects.toThrow(`Source note not found: ${source}`);
      expect(await vaultFs.exists(source)).toBe(false);
    });

    it("recognizes aliased links and keeps duplicate-link requests byte-for-byte unchanged", async () => {
      const source = `${base}/source.md`;
      const raw = await note(source, { updated: "2020-01-01" }, "# Source\n[[docs/target|Friendly title]]\n[[docs/other]]\n[[docs/other]]\n");
      expect(await linkCommand({ source, target: "docs/target.md" }, ctx)).toEqual({ source, target: "docs/target.md", added: false, existing_links: ["docs/target", "docs/other"] });
      expect(await vaultFs.read(source)).toBe(raw);
    });

    it("cannot link into another project's source from a jailed context", async () => {
      const source = "projects/other-project/source.md";
      const raw = await note(source, {}, "# Other source\n");
      const scoped = { ...ctx, vaultFs: new VaultFS(root, { projectSlug: project }) };
      await expect(linkCommand({ source, target: "safe.md" }, scoped)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
      expect(await vaultFs.read(source)).toBe(raw);
    });
  });

  describe("resume fallbacks and output boundaries", () => {
    it("rejects an unresolved project before reading or creating coordination state", async () => {
      await expect(resumeCommand({ project }, { ...ctx, projectSlug: null })).rejects.toThrow("resolved project context");
      expect(await vaultFs.exists("coordination")).toBe(false);
    });

    it("returns normalized session metadata and a path fallback for a task without a heading", async () => {
      await note(`${base}/sessions/new.md`, {
        tool: "opencode", outcome: "Partial delivery", created: "2026-01-01",
        files_touched: ["src/one.ts", 7], tasks_completed: ["task-001", false], completed: ["Done", null],
        blocked: ["Review", 9], partially_completed: ["Parser", false], verification_run: "Focused tests passed",
        commands_to_resume: ["npm test", 1],
      });
      await vaultFs.write(`${base}/sessions/trace.jsonl`, "{}");
      const taskPath = `${base}/tasks/in-progress.md`;
      await note(taskPath, { status: "in-progress" }, "Work without a Markdown title\n");
      await note(`${base}/tasks/done.md`, { status: "done" }, "# Finished\n");
      await vaultFs.write(`${base}/tasks/trace.jsonl`, "{}");
      const result = await resumeCommand({ project, limit: 1 }, ctx);
      expect(result.last_sessions).toEqual([{
        tool: "opencode", outcome: "Partial delivery", completed_at: "2026-01-01", files_touched: ["src/one.ts"],
        tasks_completed: ["task-001"], completed: ["Done"], blocked: ["Review"], partially_completed: ["Parser"],
        verification_run: "Focused tests passed", commands_to_resume: ["npm test"],
      }]);
      expect(result.suggested_next_steps).toEqual(["Last session (opencode): Partial delivery", `In-progress task: ${taskPath}`]);
    });

    it.each([Object.assign(new Error("permission denied"), { code: "EACCES" }), Object.assign(new Error("vanished"), { code: "ENOENT" }), new Error("interrupted"), "interrupted"])("keeps readable resume entries when one session and task read fail: %s", async (failure) => {
      const sessionPath = `${base}/sessions/z-unreadable.md`;
      const taskPath = `${base}/tasks/unreadable.md`;
      await note(sessionPath, { outcome: "Do not expose unreadable metadata" });
      await note(`${base}/sessions/a-readable.md`, { tool: "opencode", outcome: "Readable session" });
      await note(taskPath, { status: "in-progress" }, "# Unreadable task\n");
      await note(`${base}/tasks/readable.md`, { status: "in-progress" }, "# Readable task\n");
      const read = vaultFs.read.bind(vaultFs);
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(vaultFs, "read").mockImplementation((path) => path === sessionPath || path === taskPath ? Promise.reject(failure) : read(path));
      const result = await resumeCommand({ project }, ctx);
      expect(result.last_sessions.map((entry) => entry.outcome)).toEqual(["Readable session"]);
      expect(result.suggested_next_steps).toEqual(["Last session (opencode): Readable session", "In-progress task: Readable task"]);
      expect(await read(taskPath)).toContain("# Unreadable task");
      if (failure instanceof Error && "code" in failure && failure.code === "EACCES") expect(errors).toHaveBeenCalledWith("[resume] Skipping unreadable task file:", "permission denied");
    });

    it.each([Object.assign(new Error("permission denied"), { code: "EACCES" }), Object.assign(new Error("vanished"), { code: "ENOENT" }), new Error("interrupted"), "interrupted"])("returns safe empty resume collections when enumeration fails: %s", async (failure) => {
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(vaultFs, "list").mockRejectedValue(failure);
      const result = await resumeCommand({ project }, ctx);
      expect(result).toEqual({ project, last_sessions: [], active_sessions: [], interrupted_sessions: [], suggested_next_steps: [] });
      if (failure instanceof Error && "code" in failure && failure.code === "EACCES") expect(errors).toHaveBeenCalledWith("[resume] Error listing session files:", "permission denied");
    });

    it("formats nullable summaries, missing outcomes, blockers, and at most three resume commands", () => {
      const session: Session = { id: "session-1", tool: "opencode", project, task_summary: null, files_touched: [], started_at: old, last_heartbeat: old, completed_at: null, status: "active" };
      const result: ResumeContext = {
        project, interrupted_sessions: [session], active_sessions: [session], suggested_next_steps: [],
        last_sessions: [{ tool: "opencode", outcome: "", completed_at: old, files_touched: [], tasks_completed: [], completed: [], partially_completed: [], blocked: ["Needs review"], verification_run: null, commands_to_resume: ["first", "second", "third", "fourth"] }],
      };
      const formatted = formatResumeContext(result);
      expect(formatted).toContain("**opencode**: unknown");
      expect(formatted).toContain("no outcome recorded");
      expect(formatted).toContain("Blocked: Needs review");
      expect(formatted).toContain("Resume: first, second, third");
      expect(formatted).not.toContain("fourth");
      expect(formatted).not.toContain("  Files:");
      expect(formatted).not.toContain("### Suggested Next Steps");
    });
  });
});
