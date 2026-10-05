import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, rm, writeFile, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  WorkstreamQueue,
  initState,
  readState,
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
});
