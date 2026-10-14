import { afterEach, describe, expect, it, vi } from "vitest";
import { createRegistry } from "./registry.js";
import * as gc from "../commands/worktree/gc.js";
import type { WorktreeGcArgs } from "../commands/worktree/gc.js";
import * as env from "../commands/worktree/env.js";
import type { WorktreeEnvArgs } from "../commands/worktree/env.js";
import { createTestContext } from "../test-helpers.js";

afterEach(() => vi.restoreAllMocks());

function gcArgs(overrides: WorktreeGcArgs): WorktreeGcArgs {
  return {
    tool: undefined,
    olderThan: undefined,
    newerThan: undefined,
    minSize: undefined,
    maxSize: undefined,
    tier: undefined,
    include: undefined,
    exclude: undefined,
    keepLatest: undefined,
    project: undefined,
    all: false,
    undo: undefined,
    journalId: undefined,
    purge: false,
    worktree: undefined,
    apply: false,
    yes: false,
    json: false,
    ...overrides,
  };
}

describe("worktree registry option contracts", () => {
  it("declares bounded environment timeout and a safe nonempty GC journal id", () => {
    const registry = createRegistry();
    expect(registry.get("worktree_env")!.toolDef.inputSchema.properties?.timeout_ms).toMatchObject({
      type: "integer", minimum: 1, maximum: 30_000,
    });
    expect(registry.get("worktree_gc")!.toolDef.inputSchema.properties?.journal_id).toMatchObject({
      type: "string", minLength: 1, pattern: expect.any(String),
    });
  });

  it.each([undefined, 1, 10_000, 30_000])("forwards timeout_ms=%s using the actual environment command argument name", async timeoutMs => {
    const command = vi.spyOn(env, "worktreeEnvCommand").mockResolvedValue({
      worktreeRoot: "/repo", repoRoot: "/repo", repoId: "repo", providers: [], text: "", json: {}, notes: [],
    });
    const { ctx, cleanup } = await createTestContext();
    const expected: WorktreeEnvArgs = { json: true, shell: "fish", providers: ["node"], timeoutMs };
    try {
      await createRegistry().execute("worktree_env", { json: true, shell: "fish", providers: ["node"], timeout_ms: timeoutMs }, ctx);
      expect(command).toHaveBeenCalledExactlyOnceWith(expected, ctx);
    } finally {
      await cleanup();
    }
  });

  it("rejects invalid timeout values before invoking the environment command", async () => {
    const command = vi.spyOn(env, "worktreeEnvCommand").mockResolvedValue({
      worktreeRoot: "/repo", repoRoot: "/repo", repoId: "repo", providers: [], text: "", json: {}, notes: [],
    });
    const registry = createRegistry();
    const { ctx, cleanup } = await createTestContext();
    try {
      for (const timeout_ms of [0, -1, 1.5, 30_001, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, -Infinity, "1000", null, false]) {
        await expect(registry.execute("worktree_env", { timeout_ms }, ctx)).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
      }
      expect(command).not.toHaveBeenCalled();
    } finally {
      await cleanup();
    }
  });

  it.each([undefined, "journal-1", "2026-10-14T04:00:00.000Z_recovery", "A.a_b:c-9"])(
    "forwards journal_id=%s using the actual GC command argument name", async journalId => {
      const command = vi.spyOn(gc, "worktreeGcCommand").mockResolvedValue({ action: "purge", applied: false });
      const { ctx, cleanup } = await createTestContext();
      try {
        await createRegistry().execute("worktree_gc", { purge: true, journal_id: journalId }, ctx);
        expect(command).toHaveBeenCalledExactlyOnceWith(gcArgs({ purge: true, journalId }), ctx);
      } finally {
        await cleanup();
      }
    },
  );

  it("rejects malformed journal ids rather than broadening a targeted purge", async () => {
    const command = vi.spyOn(gc, "worktreeGcCommand").mockResolvedValue({ ok: true });
    const registry = createRegistry();
    const { ctx, cleanup } = await createTestContext();
    try {
      for (const journal_id of ["", " ", "../../other", "/absolute", "a/b", "a\\b", ".hidden", "-prefix", "a b", "journal\n", "journal\r", "journal\0", "é", 42, null, false, []]) {
        await expect(registry.execute("worktree_gc", { purge: true, confirm: true, journal_id }, ctx))
          .rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
      }
      expect(command).not.toHaveBeenCalled();
    } finally {
      await cleanup();
    }
  });

  it.each([undefined, false, true])("forwards confirm=%s to yes for undo, purge and ordinary apply", async confirm => {
    const command = vi.spyOn(gc, "worktreeGcCommand").mockResolvedValue({ ok: true });
    const registry = createRegistry();
    const { ctx, cleanup } = await createTestContext();
    const authorized = confirm === true;
    const cases: Array<{ raw: Record<string, unknown>; args: WorktreeGcArgs }> = [
      { raw: { undo: "journal-1" }, args: { undo: "journal-1" } },
      { raw: { purge: true, journal_id: "journal-1" }, args: { purge: true, journalId: "journal-1" } },
      { raw: {}, args: {} },
    ];
    try {
      for (const { raw, args } of cases) {
        command.mockClear();
        await registry.execute("worktree_gc", { ...raw, confirm }, ctx);
        expect(command).toHaveBeenCalledExactlyOnceWith(gcArgs({ ...args, apply: authorized, yes: authorized }), ctx);
      }
      command.mockClear();
      await expect(registry.execute("worktree_gc", { undo: "journal-1", confirm: "true" }, ctx))
        .rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
      expect(command).not.toHaveBeenCalled();
    } finally {
      await cleanup();
    }
  });
});
