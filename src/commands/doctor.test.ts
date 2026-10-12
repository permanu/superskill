// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandContext } from "../core/types.js";
import {
  doctorCommand,
  parseMcpProcesses,
  renderDoctor,
  summarizeChecks,
  versionParity,
  launcherStaleness,
  backupResidue,
  type DoctorCheck,
} from "./doctor.js";
import { CLIENT_REGISTRY } from "../setup/clients.js";

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

  it("drops short lines, unrelated commands, and unparseable dates", () => {
    const processes = parseMcpProcesses(
      [
        "too short",
        "Mon Oct  5 09:58:02 2026 111 node /usr/bin/other-tool",
        "13 45 99 25:61:61 2026 222 node /usr/bin/superskill",
        "Mon Oct  5 09:58:02 2026 333 node /Users/x/superskill",
      ].join("\n"),
    );
    expect(processes.map((entry) => entry.pid)).toEqual(["333"]);
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

describe("renderDoctor", () => {
  it("renders every status mark, hints, and the unhealthy suffix", () => {
    const text = renderDoctor({
      version: "9.9.9",
      healthy: false,
      summary: { ok: 1, warn: 1, fail: 1, skip: 1 },
      checks: [
        { id: "a", label: "A", status: "ok", detail: "fine" },
        { id: "b", label: "B", status: "warn", detail: "careful", hint: "hint-b" },
        { id: "c", label: "C", status: "fail", detail: "broken" },
        { id: "d", label: "D", status: "skip", detail: "later" },
      ],
    });

    expect(text).toContain("[ok  ] A");
    expect(text).toContain("[warn] B");
    expect(text).toContain("↳ hint-b");
    expect(text).toContain("[FAIL] C");
    expect(text).toContain("[skip] D");
    expect(text).toContain("— fix the FAIL entries");
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
        "version-parity",
        "mcp-freshness",
        "vault",
        "project-map",
        "graph",
        "graph-sharing",
        "catalog",
        "toolchains",
        "telemetry",
        "clients",
        "launchers",
        "backup-residue",
        "locks",
        "sessions",
        "index",
        "worktree-policy",
        "worktree-hook",
        "worktree-caches",
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

  it("fails the vault check when the vault path does not exist", async () => {
    const missing = join(
      tmpdir(),
      `doctor-missing-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const ctx = {
      vaultFs: {} as CommandContext["vaultFs"],
      vaultPath: missing,
      sessionRegistry: {} as CommandContext["sessionRegistry"],
      config: { vaultPath: missing, maxInjectTokens: 1500, sessionTtlHours: 2 },
      log: { debug() {}, info() {}, warn() {}, error() {} },
      projectSlug: null,
    } satisfies CommandContext;

    const result = await doctorCommand({}, ctx, { skipCatalog: true, skipToolchains: true });

    expect(result.checks.find((entry) => entry.id === "vault")?.status).toBe("fail");
    expect(result.checks.find((entry) => entry.id === "project-map")?.status).toBe("skip");
    expect(result.healthy).toBe(false);
  });

  it("reports session expiry and index schema for a mapped project", async () => {
    const vault = await mkdtemp(join(tmpdir(), "doctor-health-"));
    try {
      await mkdir(join(vault, "projects", "demo"), { recursive: true });
      await mkdir(join(vault, "coordination"), { recursive: true });
      await writeFile(join(vault, "project-map.json"), JSON.stringify({ [process.cwd()]: "demo" }));
      await writeFile(
        join(vault, "coordination", "session-registry.json"),
        JSON.stringify({
          sessions: [
            { id: "fresh", status: "active", last_heartbeat: new Date().toISOString() },
            { id: "expired", status: "active", last_heartbeat: new Date(Date.now() - 10 * 3600 * 1000).toISOString() },
            { id: "done", status: "completed" },
          ],
        }),
      );
      const { DatabaseSync } = await import("node:sqlite");
      const db = new DatabaseSync(join(vault, "projects", "demo", ".knowledge-index.sqlite"));
      db.exec("PRAGMA user_version = 1");
      db.close();

      const ctx = {
        vaultFs: {} as CommandContext["vaultFs"],
        vaultPath: vault,
        sessionRegistry: {} as CommandContext["sessionRegistry"],
        config: { vaultPath: vault, maxInjectTokens: 1500, sessionTtlHours: 2 },
        log: { debug() {}, info() {}, warn() {}, error() {} },
        projectSlug: null,
      } satisfies CommandContext;

      const result = await doctorCommand({}, ctx, { skipCatalog: true, skipToolchains: true });
      const sessions = result.checks.find((entry) => entry.id === "sessions");
      expect(sessions?.status).toBe("warn");
      expect(sessions?.detail).toContain("1 expired");
      const index = result.checks.find((entry) => entry.id === "index");
      expect(index?.status).toBe("ok");
      expect(index?.detail).toContain("schema v1");
    } finally {
      await rm(vault, { recursive: true, force: true });
    }
  });
});

describe("versionParity", () => {
  async function fixture(versions: { package: string; plugin: string; metadata: string; pluginEntry: string }): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), "doctor-versions-"));
    await mkdir(join(root, ".claude-plugin"), { recursive: true });
    await writeFile(join(root, ".claude-plugin", "plugin.json"), JSON.stringify({ version: versions.plugin }));
    await writeFile(
      join(root, ".claude-plugin", "marketplace.json"),
      JSON.stringify({ metadata: { version: versions.metadata }, plugins: [{ version: versions.pluginEntry }] }),
    );
    return root;
  }

  it("reports ok when every source matches package.json", async () => {
    const root = await fixture({ package: "1.2.3", plugin: "1.2.3", metadata: "1.2.3", pluginEntry: "1.2.3" });
    try {
      const result = versionParity(root, "1.2.3");
      expect(result.status).toBe("ok");
      expect(result.detail).toContain("1.2.3");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails on any mismatch and names the offending sources", async () => {
    const root = await fixture({ package: "2.0.0", plugin: "1.9.9", metadata: "2.0.0", pluginEntry: "1.9.9" });
    try {
      const result = versionParity(root, "2.0.0");
      expect(result.status).toBe("fail");
      expect(result.detail).toContain("plugin.json 1.9.9");
      expect(result.detail).toContain("plugins[0] 1.9.9");
      expect(result.detail).toContain("package.json 2.0.0");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("warns when plugin metadata is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "doctor-versions-"));
    try {
      const result = versionParity(root, "1.0.0");
      expect(result.status).toBe("warn");
      expect(result.detail).toContain("plugin.json not readable");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("launcherStaleness and backupResidue", () => {
  const detected = {
    config: CLIENT_REGISTRY.find((client) => client.slug === "claude-code")!,
    mcpConfigPath: "",
    instructionPath: undefined,
  };

  it("flags stale launchers and preserves custom entries", async () => {
    const dir = await mkdtemp(join(tmpdir(), "doctor-launchers-"));
    try {
      const stalePath = join(dir, "stale.json");
      await writeFile(stalePath, JSON.stringify({ mcpServers: { superskill: { command: "npx", args: ["-y", "superskill"], env: { VAULT_PATH: "/v" } } } }));
      const currentPath = join(dir, "current.json");
      await writeFile(currentPath, JSON.stringify({ mcpServers: { superskill: { command: "npx", args: ["-y", "--prefer-online", "superskill@latest"], env: { VAULT_PATH: "/v" } } } }));
      const customPath = join(dir, "custom.json");
      await writeFile(customPath, JSON.stringify({ mcpServers: { superskill: { command: "custom-wrapper" } } }));

      const report = launcherStaleness([
        { ...detected, mcpConfigPath: stalePath },
        { ...detected, mcpConfigPath: currentPath },
        { ...detected, mcpConfigPath: customPath },
      ]);
      expect(report.stale).toEqual(["Claude Code"]);
      expect(report.current).toBe(1);
      expect(report.custom).toEqual(["Claude Code"]);
      const residues = backupResidue([{ ...detected, mcpConfigPath: stalePath }]);
      expect(residues).toEqual([]);
      await writeFile(`${stalePath}.bak.superskill`, "{}");
      expect(backupResidue([{ ...detected, mcpConfigPath: stalePath }])).toEqual([`${stalePath}.bak.superskill`]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
