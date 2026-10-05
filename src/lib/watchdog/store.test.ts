// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { VaultFS } from "../vault-fs.js";
import type { WatchdogReport } from "./types.js";
import { listReports, loadReportFile, recurrenceCounts, saveReport, setFindingStatus } from "./store.js";

function sampleReport(): WatchdogReport {
  return {
    id: "wd_test",
    kind: "dig",
    scope: { kind: "session", sessionIds: ["ses_1"], tool: "opencode", project: "/tmp/proj" },
    generatedAt: "2026-10-05T10:00:00.000Z",
    sessions: 1,
    findings: [
      {
        id: "f_abc1234567",
        category: "verification",
        severity: "high",
        title: "No verification ran",
        detail: "wrote files, ran nothing",
        evidence: [{ source: "trace", ref: "wrote src/a.ts" }],
        proposal: "run npm test",
      },
    ],
    summary: { critical: 0, high: 1, medium: 0, low: 0, total: 1 },
    digests: ["## digest"],
  };
}

describe("watchdog report store", () => {
  let dir: string;
  let vaultFs: VaultFS;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "watchdog-store-"));
    vaultFs = new VaultFS(dir, { projectSlug: "proj" });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("saves, lists, and reloads reports with machine-readable findings", async () => {
    const path = await saveReport(vaultFs, sampleReport());
    expect(path).toMatch(/^watchdog\/001-session-/);

    const reports = await listReports(vaultFs);
    expect(reports).toHaveLength(1);
    expect(reports[0].findings).toHaveLength(1);
    expect(reports[0].findings[0].status).toBe("open");
    expect(reports[0].frontmatter.high).toBe(1);
  });

  it("counts recurrences and updates finding status", async () => {
    const first = await saveReport(vaultFs, sampleReport());
    await saveReport(vaultFs, { ...sampleReport(), generatedAt: "2026-10-06T10:00:00.000Z" });

    const counts = await recurrenceCounts(vaultFs, new Set(["f_abc1234567"]));
    expect(counts.get("f_abc1234567")).toBe(2);

    const changed = await setFindingStatus(vaultFs, first, "f_abc1234567", "applied");
    expect(changed).toBe(true);
    const reloaded = await loadReportFile(vaultFs, first);
    expect(reloaded?.findings[0].status).toBe("applied");
  });
});
