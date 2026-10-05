import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { chmod, mkdtemp, mkdir, rm, writeFile, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  WorkstreamQueue,
  collectEntries,
  defaultWorkstreamsDir,
  initState,
  loadPlan,
  planFile,
  readState,
  resolveWorkstreamsDir,
  stateFile,
  stateFromPlan,
  writeStateFile,
  type CampaignPlan,
  type CampaignState,
} from "./queue.js";

const FIXED = new Date("2026-10-04T12:00:00.000Z");

function fixturePlan(): CampaignPlan {
  return {
    version: 1,
    generated: "2026-10-04",
    contract: "docs/authoring/CONTRACT.md",
    targetTotal: 30,
    languages: [
      { lang: "rust", baseline: "latest", target: 20, batches: 2 },
      { lang: "python", baseline: "latest", target: 10, batches: 1 },
    ],
    batches: [
      { id: "rust/own", lang: "rust", prefix: "own", title: "Ownership", target: 12, status: "pending", updated: null },
      { id: "rust/err", lang: "rust", prefix: "err", title: "Error handling", target: 8, status: "pending", updated: null },
      { id: "python/py", lang: "python", prefix: "py", title: "Pythonic idioms", target: 10, status: "pending", updated: null },
    ],
    nonContent: [
      { id: "harness/ci", title: "Harness CI", description: "CI jobs", status: "pending", updated: null },
    ],
  };
}

async function stateFileExists(workstreamsDir: string): Promise<boolean> {
  try {
    await stat(join(workstreamsDir, "state.json"));
    return true;
  } catch {
    return false;
  }
}

describe("WorkstreamQueue", () => {
  let root: string;
  let workstreamsDir: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "rules-queue-"));
    workstreamsDir = join(root, "workstreams");
    await mkdir(workstreamsDir, { recursive: true });
    await writeFile(join(workstreamsDir, "plan.json"), JSON.stringify(fixturePlan(), null, 2));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const queue = (overrides: Partial<ConstructorParameters<typeof WorkstreamQueue>[0]> = {}) =>
    new WorkstreamQueue({ workstreamsDir, now: () => FIXED, ...overrides });

  it("initializes state.json from plan.json on first claim", async () => {
    const result = await queue().claim("rust/own");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.id).toBe("rust/own");
      expect(result.entry.kind).toBe("batch");
      expect(result.entry.status).toBe("claimed");
      expect(result.entry.owner).toBe(`pid-${process.pid}`);
      expect(result.entry.claimed_at).toBe(FIXED.toISOString());
    }
    const state = await readState(workstreamsDir);
    expect(state).not.toBeNull();
    const batches = (state as CampaignState).batches;
    expect(batches["rust/own"].status).toBe("claimed");
    expect(batches["rust/err"].status).toBe("pending");
    expect(batches["python/py"].status).toBe("pending");
    expect((state as CampaignState).workstreams["harness/ci"].status).toBe("pending");
  });

  it("initState creates a pending state document from the plan", async () => {
    const state = await initState({ workstreamsDir, now: () => FIXED });
    expect(Object.keys(state.batches)).toHaveLength(3);
    expect(Object.values(state.batches).every((e) => e.status === "pending")).toBe(true);
  });

  it("rejects a second claim while the batch is claimed", async () => {
    const q = queue();
    const first = await q.claim("rust/own");
    expect(first.ok).toBe(true);
    const second = await q.claim("rust/own");
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.reason).toBe("not-pending");
      expect(second.status).toBe("claimed");
    }
  });

  it("records a custom owner", async () => {
    const result = await queue({ owner: "agent-7" }).claim("rust/own");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.entry.owner).toBe("agent-7");
  });

  it("release returns a claimed batch to pending and allows reclaiming", async () => {
    const q = queue();
    expect((await q.claim("rust/own")).ok).toBe(true);
    const released = await q.release("rust/own");
    expect(released.ok).toBe(true);
    if (released.ok) {
      expect(released.entry.status).toBe("pending");
      expect(released.entry.owner).toBeNull();
      expect(released.entry.claimed_at).toBeNull();
    }
    expect((await q.claim("rust/own")).ok).toBe(true);
    const releasePending = await q.release("rust/err");
    expect(releasePending.ok).toBe(false);
    if (!releasePending.ok) expect(releasePending.reason).toBe("not-claimed");
  });

  it("complete records a terminal status and blocks re-completion", async () => {
    const q = queue();
    expect((await q.claim("rust/err")).ok).toBe(true);
    const done = await q.complete("rust/err", "done");
    expect(done.ok).toBe(true);
    if (done.ok) {
      expect(done.entry.status).toBe("done");
      expect(done.entry.completed_at).toBe(FIXED.toISOString());
    }
    const again = await q.complete("rust/err", "done");
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe("not-claimed");
    const neverClaimed = await q.complete("python/py", "failed");
    expect(neverClaimed.ok).toBe(false);
    if (!neverClaimed.ok) expect(neverClaimed.reason).toBe("not-claimed");
  });

  it("complete rejects non-terminal statuses", async () => {
    const result = await queue().complete("rust/own", "pending" as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid-status");
  });

  it("rejects unknown batch ids across operations", async () => {
    const q = queue();
    for (const result of [await q.claim("nope/nope"), await q.release("nope/nope"), await q.complete("nope/nope", "done")]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("unknown-batch");
    }
  });

  it("breaks a lockfile older than the stale threshold", async () => {
    const locksDir = join(workstreamsDir, "locks");
    await mkdir(locksDir, { recursive: true });
    const lockPath = join(locksDir, "state.lock");
    await writeFile(lockPath, JSON.stringify({ pid: 999999 }));
    const stale = new Date(Date.now() - 11 * 60 * 1000);
    await utimes(lockPath, stale, stale);

    const result = await queue().claim("rust/own");
    expect(result.ok).toBe(true);
    await expect(stat(lockPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("times out on a fresh lockfile and leaves state untouched", async () => {
    const locksDir = join(workstreamsDir, "locks");
    await mkdir(locksDir, { recursive: true });
    await writeFile(join(locksDir, "state.lock"), JSON.stringify({ pid: process.pid }));

    const result = await queue({ retries: 2, retryDelayMs: 1 }).claim("rust/own");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("lock-timeout");
    expect(await stateFileExists(workstreamsDir)).toBe(false);
  });

  it("serializes concurrent claims to exactly one winner", async () => {
    const results = await Promise.all([queue().claim("rust/own"), queue().claim("rust/own")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const loser = results.find((r) => !r.ok);
    expect(loser && !loser.ok && loser.reason).toBe("not-pending");
    const state = await readState(workstreamsDir);
    expect((state as CampaignState).batches["rust/own"].status).toBe("claimed");
  });

  it("lists and filters entries in plan order", async () => {
    const q = queue();
    expect((await q.claim("rust/own")).ok).toBe(true);
    expect((await q.claim("rust/err")).ok).toBe(true);
    expect((await q.complete("rust/err", "done")).ok).toBe(true);

    const all = await q.list();
    expect(all.map((e) => e.id)).toEqual(["rust/own", "rust/err", "python/py"]);
    expect((await q.list({ lang: "rust" })).map((e) => e.status)).toEqual(["claimed", "done"]);
    expect((await q.list({ status: "pending" })).map((e) => e.id)).toEqual(["python/py"]);
    expect((await q.list({ lang: "python", status: "done" }))).toHaveLength(0);
    const withWorkstreams = await q.list({ kind: "all" });
    expect(withWorkstreams.map((e) => e.id)).toContain("harness/ci");
  });

  it("aggregates stats per status and per language", async () => {
    const q = queue();
    expect((await q.claim("rust/own")).ok).toBe(true);
    expect((await q.claim("rust/err")).ok).toBe(true);
    expect((await q.complete("rust/err", "done")).ok).toBe(true);

    const stats = await q.stats();
    expect(stats.totalBatches).toBe(3);
    expect(stats.totalTarget).toBe(30);
    expect(stats.byStatus).toEqual({ pending: 1, claimed: 1, done: 1, failed: 0, blocked: 0, superseded: 0 });
    expect(stats.percentDone).toBeCloseTo(100 / 3, 5);
    const rust = stats.byLang.find((l) => l.lang === "rust");
    expect(rust).toEqual({
      lang: "rust",
      target: 20,
      batches: 2,
      byStatus: { pending: 0, claimed: 1, done: 1, failed: 0, blocked: 0, superseded: 0 },
    });
    expect(stats.workstreams.total).toBe(1);
    expect(stats.workstreams.byStatus.pending).toBe(1);
  });

  it("can claim and complete a non-content workstream", async () => {
    const q = queue();
    const claimed = await q.claim("harness/ci");
    expect(claimed.ok).toBe(true);
    if (claimed.ok) expect(claimed.entry.kind).toBe("workstream");
    const done = await q.complete("harness/ci", "done");
    expect(done.ok).toBe(true);
    const state = await readState(workstreamsDir);
    expect((state as CampaignState).workstreams["harness/ci"].status).toBe("done");
  });

  it("releases a workstream back to pending", async () => {
    const q = queue();
    expect((await q.claim("harness/ci")).ok).toBe(true);
    const released = await q.release("harness/ci");
    expect(released.ok).toBe(true);
    if (released.ok) {
      expect(released.entry.kind).toBe("workstream");
      expect(released.entry.status).toBe("pending");
    }
    const again = await q.release("harness/ci");
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe("not-claimed");
  });

  it("completes a workstream with a blocked status", async () => {
    const q = queue();
    expect((await q.claim("harness/ci")).ok).toBe(true);
    const blocked = await q.complete("harness/ci", "blocked");
    expect(blocked.ok).toBe(true);
    if (blocked.ok) expect(blocked.entry.status).toBe("blocked");
  });

  it("uses defaults when state has no entry for a plan batch", async () => {
    await writeStateFile(workstreamsDir, {
      version: 1,
      updated: null,
      batches: {},
      workstreams: {},
    });
    const q = queue();
    const claimed = await q.claim("rust/own");
    expect(claimed.ok).toBe(true);
    if (claimed.ok) expect(claimed.entry.status).toBe("claimed");

    const entries = await q.list();
    expect(entries.map((entry) => entry.id)).toEqual(["rust/own", "rust/err", "python/py"]);
    expect(entries.find((entry) => entry.id === "rust/err")?.status).toBe("pending");
  });

  it("falls back to plan statuses for batches missing from state", async () => {
    const plan = fixturePlan();
    plan.batches[1].status = "done";
    const state = stateFromPlan(plan);
    delete state.batches["rust/err"];
    const entries = collectEntries(plan, state);
    const err = entries.find((entry) => entry.id === "rust/err");
    expect(err?.status).toBe("done");
  });

  it("collects workstreams and applies lang/status filters", async () => {
    const plan = fixturePlan();
    const state = stateFromPlan(plan, FIXED);
    expect(collectEntries(plan, state, { kind: "workstream" }).map((entry) => entry.id)).toEqual(["harness/ci"]);
    expect(collectEntries(plan, state, { kind: "all", lang: "rust" }).map((entry) => entry.id)).toEqual([
      "rust/own",
      "rust/err",
    ]);
    expect(collectEntries(plan, state, { kind: "workstream", status: "claimed" })).toEqual([]);
    expect(collectEntries(plan, state, { kind: "all", status: "pending" }).map((entry) => entry.id)).toContain("harness/ci");
  });

  it("defaults missing workstream state entries and plan metadata", async () => {
    const plan = { ...fixturePlan(), nonContent: [{ id: "harness/ci", title: "Harness CI" }] } as CampaignPlan;
    const state: CampaignState = { version: 1, updated: null, batches: {}, workstreams: {} };
    const entries = collectEntries(plan, state, { kind: "workstream" });
    expect(entries[0].status).toBe("pending");
    expect(entries[0].lang).toBeNull();
    expect(entries[0].prefix).toBeNull();
    expect(entries[0].owner).toBeNull();
    expect(entries[0].claimed_at).toBeNull();
    expect(entries[0].completed_at).toBeNull();
    expect(entries[0].updated).toBeNull();
    expect(entries[0].note).toBeNull();
  });

  it("tolerates a plan without a nonContent array", async () => {
    const plan = fixturePlan() as Partial<CampaignPlan>;
    delete plan.nonContent;
    const state = stateFromPlan(plan as CampaignPlan);
    expect(state.workstreams).toEqual({});
    expect(collectEntries(plan as CampaignPlan, state)).toHaveLength(3);
  });

  it("defaults version, updated and workstreams when reading a sparse state file", async () => {
    await writeFile(join(workstreamsDir, "state.json"), JSON.stringify({ batches: {} }), "utf-8");
    const state = await readState(workstreamsDir);
    expect(state).toEqual({ version: 1, updated: null, batches: {}, workstreams: {} });
  });

  it("initializes missing statuses and updated from the plan", async () => {
    const plan = fixturePlan();
    plan.batches[0].status = "claimed";
    plan.batches[1].status = undefined;
    plan.nonContent[0].status = undefined;
    const state = stateFromPlan(plan);
    expect(state.updated).toBeNull();
    expect(state.batches["rust/own"].status).toBe("claimed");
    expect(state.batches["rust/err"].status).toBe("pending");
    expect(state.workstreams["harness/ci"].status).toBe("pending");
  });

  it("rejects malformed plan and state documents", async () => {
    await writeFile(join(workstreamsDir, "plan.json"), "null", "utf-8");
    await expect(loadPlan(workstreamsDir)).rejects.toThrow(/malformed plan/);

    await writeFile(join(workstreamsDir, "plan.json"), JSON.stringify({ version: 1, batches: [] }), "utf-8");
    await expect(loadPlan(workstreamsDir)).rejects.toThrow(/malformed plan/);

    await writeFile(join(workstreamsDir, "plan.json"), JSON.stringify(fixturePlan()), "utf-8");
    await writeFile(join(workstreamsDir, "state.json"), JSON.stringify({ batches: 7 }), "utf-8");
    await expect(readState(workstreamsDir)).rejects.toThrow(/malformed state/);
  });

  it("propagates non-ENOENT state read errors", async () => {
    await rm(join(workstreamsDir, "state.json"), { force: true });
    await mkdir(join(workstreamsDir, "state.json"));
    await expect(readState(workstreamsDir)).rejects.toMatchObject({ code: "EISDIR" });
  });

  it("returns null for missing state and resolves the default workstreams dir", async () => {
    expect(await readState(workstreamsDir)).toBeNull();
    const repoState = await readState();
    expect(repoState === null || typeof repoState.batches === "object").toBe(true);
    expect((await loadPlan()).batches.length).toBeGreaterThan(0);
    expect(resolveWorkstreamsDir()).toContain("workstreams");
    expect(defaultWorkstreamsDir()).toContain("workstreams");
    expect(planFile(workstreamsDir).endsWith(join("workstreams", "plan.json"))).toBe(true);
    expect(stateFile(workstreamsDir).endsWith(join("workstreams", "state.json"))).toBe(true);
  });

  it("times out release and complete behind a fresh lock", async () => {
    const locksDir = join(workstreamsDir, "locks");
    await mkdir(locksDir, { recursive: true });
    await writeFile(join(locksDir, "state.lock"), JSON.stringify({ pid: process.pid }));
    const q = queue({ retries: 1, retryDelayMs: 1 });
    const released = await q.release("rust/own");
    expect(released.ok).toBe(false);
    if (!released.ok) expect(released.reason).toBe("lock-timeout");
    const completed = await q.complete("rust/own", "done");
    expect(completed.ok).toBe(false);
    if (!completed.ok) expect(completed.reason).toBe("lock-timeout");
  });

  it("throws a non-lock error when the lock cannot be created", async () => {
    const locksDir = join(workstreamsDir, "locks");
    await mkdir(locksDir, { recursive: true });
    await chmod(locksDir, 0o500);
    try {
      await expect(queue({ retries: 1 }).claim("rust/own")).rejects.toMatchObject({ code: "EACCES" });
    } finally {
      await chmod(locksDir, 0o700);
    }
  });

  it("gives up when a stale lock cannot be removed", async () => {
    const locksDir = join(workstreamsDir, "locks");
    await mkdir(locksDir, { recursive: true });
    const lockPath = join(locksDir, "state.lock");
    await mkdir(lockPath);
    const stale = new Date(Date.now() - 11 * 60 * 1000);
    await utimes(lockPath, stale, stale);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await queue({ retries: 1, retryDelayMs: 1 }).claim("rust/own");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("lock-timeout");
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("failed to break stale lock"), expect.any(String));
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("stats counts batches whose language is absent from the plan languages", async () => {
    const plan = { ...fixturePlan(), languages: [] } as CampaignPlan;
    await writeFile(join(workstreamsDir, "plan.json"), JSON.stringify(plan), "utf-8");
    await rm(join(workstreamsDir, "state.json"), { force: true });
    const stats = await queue().stats();
    expect(stats.byLang).toEqual([]);
    expect(stats.totalTarget).toBe(30);
    expect(stats.workstreams.total).toBe(1);
  });

  it("stats handles an empty plan and missing state entries", async () => {
    const emptyPlan: CampaignPlan = {
      version: 1,
      languages: [],
      batches: [],
      nonContent: [{ id: "flow/x", title: "Flow" }],
    };
    await writeFile(join(workstreamsDir, "plan.json"), JSON.stringify(emptyPlan), "utf-8");
    await writeStateFile(workstreamsDir, { version: 1, updated: null, batches: {}, workstreams: {} });
    const stats = await queue().stats();
    expect(stats.totalBatches).toBe(0);
    expect(stats.percentDone).toBe(0);
    expect(stats.workstreams.total).toBe(1);
    expect(stats.workstreams.byStatus.pending).toBe(1);
  });

  it("constructs a queue with the default clock", async () => {
    const claimed = await new WorkstreamQueue({ workstreamsDir }).claim("rust/own");
    expect(claimed.ok).toBe(true);
    if (claimed.ok) expect(claimed.entry.claimed_at).toMatch(/^\d{4}-/);
  });

  it("release falls back to a pending entry when state has no record", async () => {
    await writeStateFile(workstreamsDir, { version: 1, updated: null, batches: {}, workstreams: {} });
    const released = await queue().release("rust/own");
    expect(released.ok).toBe(false);
    if (!released.ok) expect(released.reason).toBe("not-claimed");
  });
});
