// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { formatBytes, formatHygieneReport } from "./format.js";
import type { HygieneReport } from "./types.js";

const GB = 1024 ** 3;
const MB = 1024 ** 2;

const report: HygieneReport = {
  generatedAt: "2026-10-05T12:00:00.000Z",
  repoPaths: ["/repo"],
  items: [
    {
      id: "caches:pnpm",
      category: "caches",
      title: "pnpm store",
      path: "/c/pnpm",
      bytes: 2 * GB,
      ageDays: 45.2,
      tier: "auto",
      due: true,
      reason: "older than 30d",
      plan: "quarantine then delete",
      meta: {},
    },
    {
      id: "caches:sccache",
      category: "caches",
      title: "sccache",
      path: "/c/sccache",
      bytes: null,
      ageDays: null,
      tier: "consent",
      due: false,
      reason: "size below consent threshold",
      plan: null,
      meta: {},
    },
    {
      id: "worktrees:feat",
      category: "worktrees",
      title: "feature worktree",
      path: "/repo/.worktrees/feat",
      bytes: 512 * MB,
      ageDays: 3.6,
      tier: "review",
      due: false,
      reason: "clean but recent",
      plan: "git worktree remove",
      meta: {},
    },
    {
      id: "docker:vol",
      category: "docker",
      title: "dangling volume",
      path: null,
      bytes: 10 * GB,
      ageDays: 20,
      tier: "consent",
      due: true,
      reason: "unreferenced for 20d",
      plan: "docker volume rm vol",
      meta: {},
    },
  ],
  totals: {
    itemCount: 4,
    dueCount: 2,
    knownBytes: 12.5 * GB,
    dueBytes: 12 * GB,
    byCategory: {
      caches: { itemCount: 2, dueCount: 1, knownBytes: 2 * GB, dueBytes: 2 * GB },
      worktrees: { itemCount: 1, dueCount: 0, knownBytes: 512 * MB, dueBytes: 0 },
      docker: { itemCount: 1, dueCount: 1, knownBytes: 10 * GB, dueBytes: 10 * GB },
      xcode: { itemCount: 0, dueCount: 0, knownBytes: 0, dueBytes: 0 },
      scratch: { itemCount: 0, dueCount: 0, knownBytes: 0, dueBytes: 0 },
    },
  },
  skipped: [{ probe: "xcode", reason: "xcode-select not found" }],
};

describe("formatBytes", () => {
  it("mirrors the worktree audit formatting", () => {
    expect(formatBytes(null)).toBe("unknown");
    expect(formatBytes(Number.NaN)).toBe("unknown");
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(100 * MB)).toBe("100 MB");
    expect(formatBytes(12.5 * GB)).toBe("12.5 GB");
  });
});

describe("formatHygieneReport", () => {
  it("renders the header, grouped items, plans, skips, and footer", () => {
    const output = formatHygieneReport(report);

    expect(output).toContain(
      "Superskill hygiene report — 2026-10-05T12:00:00.000Z — 4 item(s), 2 due (known 12.5 GB, due 12 GB)",
    );
    expect(output).toContain("  [due] pnpm store — 2 GB — 45d — auto — older than 30d");
    expect(output).toContain("      plan: quarantine then delete");
    expect(output).toContain("  [   ] sccache — unknown — unknown — consent — size below consent threshold");
    expect(output).toContain("  [due] dangling volume — 10 GB — 20d — consent — unreferenced for 20d");
    expect(output).toContain("  [   ] feature worktree — 512 MB — 4d — review — clean but recent");
    expect(output).not.toContain("plan: git worktree remove");

    expect(output.indexOf("Caches:")).toBeGreaterThan(-1);
    expect(output.indexOf("Caches:")).toBeLessThan(output.indexOf("Worktrees:"));
    expect(output.indexOf("Worktrees:")).toBeLessThan(output.indexOf("Docker:"));
    expect(output).not.toContain("Xcode:");
    expect(output).not.toContain("Scratch:");

    expect(output).toContain("Skipped:");
    expect(output).toContain("  xcode: xcode-select not found");
    expect(output).toContain("Nothing was deleted. Everything above is a recommendation.");
    expect(output).toContain("superskill-cli hygiene --due");
    expect(output).toContain("superskill-cli worktree gc --all");
  });

  it("filters to due items when requested", () => {
    const output = formatHygieneReport(report, { dueOnly: true });

    expect(output).toContain("  [due] pnpm store — 2 GB — 45d — auto — older than 30d");
    expect(output).toContain("  [due] dangling volume — 10 GB — 20d — consent — unreferenced for 20d");
    expect(output).not.toContain("sccache");
    expect(output).not.toContain("feature worktree");
    expect(output).toContain("Nothing was deleted. Everything above is a recommendation.");
  });
});
