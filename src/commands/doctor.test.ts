// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandContext } from "../core/types.js";
import { doctorCommand, parseMcpProcesses, renderDoctor, summarizeChecks, type DoctorCheck } from "./doctor.js";

const PS_FIXTURE = `Mon Oct  5 09:58:02 2026 22357 node /Users/arvee/.local/bin/superskill
Mon Oct  5 12:55:03 2026 24160 node /Users/arvee/.local/bin/superskill
Mon Oct  5 12:55:03 2026 24164 /Users/arvee/.local/bin/superskill
Mon Oct  5 12:56:00 2026 99999 node /Users/arvee/.local/bin/superskill-cli status
this line is not a process
`;

describe("parseMcpProcesses", () => {
  it("keeps MCP server processes and ignores the CLI and junk", () => {
    const processes = parseMcpProcesses(PS_FIXTURE);
    expect(processes.map((entry) => entry.pid)).toEqual(["22357", "24160", "24164"]);
    expect(processes[0].started.toISOString()).toBe(new Date("Mon Oct  5 09:58:02 2026").toISOString());
  });

  it("handles empty output", () => {
    expect(parseMcpProcesses("")).toEqual([]);
  });
});

describe("summarizeChecks", () => {
  it("counts by status", () => {
    const checks: DoctorCheck[] = [
      { id: "a", label: "a", status: "ok", detail: "" },
      { id: "b", label: "b", status: "warn", detail: "" },
      { id: "c", label: "c", status: "warn", detail: "" },
      { id: "d", label: "d", status: "fail", detail: "" },
      { id: "e", label: "e", status: "skip", detail: "" },
    ];
    expect(summarizeChecks(checks)).toEqual({ ok: 1, warn: 2, fail: 1, skip: 1 });
  });
});

describe("doctorCommand", () => {
  it("reports every layer with stable ids and a consistent summary", async () => {
    const vault = await mkdtemp(join(tmpdir(), "doctor-vault-"));
    try {
      const ctx = {
        vaultFs: {} as CommandContext["vaultFs"],
        vaultPath: vault,
        sessionRegistry: {} as CommandContext["sessionRegistry"],
        config: { vaultPath: vault, maxInjectTokens: 1500, sessionTtlHours: 2 },
        log: { debug() {}, info() {}, warn() {}, error() {} },
        projectSlug: null,
      } satisfies CommandContext;

      const result = await doctorCommand({}, ctx, { skipCatalog: true, skipToolchains: true });
      expect(result.checks.map((entry) => entry.id)).toEqual([
        "node",
        "install",
        "mcp-freshness",
        "vault",
        "project-map",
        "graph",
        "graph-sharing",
        "catalog",
        "toolchains",
        "telemetry",
        "clients",
      ]);
      const total = Object.values(result.summary).reduce((acc, n) => acc + n, 0);
      expect(total).toBe(result.checks.length);
      expect(result.healthy).toBe(result.summary.fail === 0);
      const text = renderDoctor(result);
      expect(text).toContain("superskill doctor");
      expect(text).toContain("Summary:");
    } finally {
      await rm(vault, { recursive: true, force: true });
    }
  });
});
