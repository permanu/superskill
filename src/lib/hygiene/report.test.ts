// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { DEFAULT_HYGIENE_POLICY } from "./policy.js";
import { buildHygieneReport } from "./report.js";
import type {
  HygieneCategory,
  HygieneItem,
  HygieneProbe,
  HygieneProbeOptions,
  HygieneProbeResult,
  HygieneSkip,
} from "./types.js";

function item(overrides: Partial<HygieneItem> = {}): HygieneItem {
  return {
    id: "item",
    category: "caches",
    title: "Item",
    path: null,
    bytes: null,
    ageDays: null,
    tier: "auto",
    due: false,
    reason: "probe reason",
    plan: null,
    meta: {},
    ...overrides,
  };
}

function probe(id: HygieneCategory, items: HygieneItem[], skipped: HygieneSkip | null = null): HygieneProbe {
  return {
    id,
    run: async (): Promise<HygieneProbeResult> => ({ category: id, label: id, items, skipped }),
  };
}

describe("buildHygieneReport", () => {
  it("collects items, sorts deterministically, and computes totals", async () => {
    const caches = probe("caches", [
      item({ id: "a", title: "Beta cache", bytes: 1000, due: true }),
      item({ id: "b", title: "Alpha cache", bytes: 1000, due: true }),
      item({ id: "c", title: "Low cache", bytes: 300, due: true }),
      item({ id: "d", title: "Unknown cache", bytes: null, due: true }),
      item({ id: "e", title: "Fresh big", bytes: 5000, due: false }),
      item({ id: "f", title: "Fresh unknown", bytes: null, due: false }),
    ]);
    const docker: HygieneProbe = {
      id: "docker",
      run: async () => {
        throw new Error("docker daemon unavailable");
      },
    };
    const scratch = probe(
      "scratch",
      [item({ id: "s", category: "scratch", title: "Scratch dir", bytes: 128, due: false })],
      { probe: "scratch", reason: "root missing" },
    );

    const report = await buildHygieneReport({
      probes: [caches, docker, scratch],
      repoPaths: ["/repo/a"],
      sizes: true,
      policy: DEFAULT_HYGIENE_POLICY,
      now: 1_700_000_000_000,
    });

    expect(report.repoPaths).toEqual(["/repo/a"]);
    expect(report.generatedAt).toBe(new Date(1_700_000_000_000).toISOString());
    expect(report.items.map((entry) => entry.title)).toEqual([
      "Alpha cache",
      "Beta cache",
      "Low cache",
      "Unknown cache",
      "Fresh big",
      "Scratch dir",
      "Fresh unknown",
    ]);
    expect(report.skipped).toEqual([
      { probe: "docker", reason: "docker daemon unavailable" },
      { probe: "scratch", reason: "root missing" },
    ]);

    expect(report.totals.itemCount).toBe(7);
    expect(report.totals.dueCount).toBe(4);
    expect(report.totals.knownBytes).toBe(7428);
    expect(report.totals.dueBytes).toBe(2300);
    expect(report.totals.byCategory.caches).toEqual({
      itemCount: 6,
      dueCount: 4,
      knownBytes: 7300,
      dueBytes: 2300,
    });
    expect(report.totals.byCategory.scratch).toEqual({
      itemCount: 1,
      dueCount: 0,
      knownBytes: 128,
      dueBytes: 0,
    });
    expect(report.totals.byCategory.docker).toEqual({
      itemCount: 0,
      dueCount: 0,
      knownBytes: 0,
      dueBytes: 0,
    });
  });

  it("defaults every category total and honors an explicit generatedAt", async () => {
    const report = await buildHygieneReport({
      probes: [],
      repoPaths: [],
      sizes: false,
      policy: DEFAULT_HYGIENE_POLICY,
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(report.generatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(Object.keys(report.totals.byCategory).sort()).toEqual([
      "caches",
      "docker",
      "scratch",
      "worktrees",
      "xcode",
    ]);
    for (const total of Object.values(report.totals.byCategory)) {
      expect(total).toEqual({ itemCount: 0, dueCount: 0, knownBytes: 0, dueBytes: 0 });
    }
    expect(report.items).toEqual([]);
    expect(report.skipped).toEqual([]);
  });

  it("runs probes concurrently with the injected options", async () => {
    const seen: HygieneProbeOptions[] = [];
    let active = 0;
    let maxActive = 0;
    const make = (id: HygieneCategory): HygieneProbe => ({
      id,
      run: async (opts) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        seen.push(opts);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return { category: id, label: id, items: [], skipped: null };
      },
    });

    await buildHygieneReport({
      probes: [make("caches"), make("docker")],
      repoPaths: ["/repo/a", "/repo/b"],
      sizes: false,
      policy: DEFAULT_HYGIENE_POLICY,
      now: 42,
    });

    expect(maxActive).toBe(2);
    expect(seen).toEqual([
      { repoPaths: ["/repo/a", "/repo/b"], sizes: false, policy: DEFAULT_HYGIENE_POLICY, now: 42 },
      { repoPaths: ["/repo/a", "/repo/b"], sizes: false, policy: DEFAULT_HYGIENE_POLICY, now: 42 },
    ]);
  });

  it("stringifies non-Error probe rejections", async () => {
    const failing: HygieneProbe = {
      id: "xcode",
      run: async () => {
        throw "xcode-select missing";
      },
    };

    const report = await buildHygieneReport({
      probes: [failing],
      repoPaths: [],
      sizes: false,
      policy: DEFAULT_HYGIENE_POLICY,
    });

    expect(report.skipped).toEqual([{ probe: "xcode", reason: "xcode-select missing" }]);
    expect(Number.isNaN(Date.parse(report.generatedAt))).toBe(false);
  });
});
