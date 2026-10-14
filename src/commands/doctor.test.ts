// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readdir, stat, readFile, symlink, realpath } from "node:fs/promises";
import { performance } from "node:perf_hooks";
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
  launcherStatusCheck,
  backupResidue,
  inspectInstall,
  vaultWritableCheck,
  scanVaultMutationLocks,
  type DoctorCheck,
} from "./doctor.js";
import { CLIENT_REGISTRY } from "../setup/clients.js";
import { reconcileTomlBlock } from "../setup/toml-config.js";
import type { DetectedClient } from "../setup/types.js";
import { VaultFS } from "../lib/vault-fs.js";

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

  it("recognizes package entrypoints and aliases without matching arbitrary process arguments", () => {
    const lines = [
      "node /Users/x/.local/bin/superskill-cli",
      "/Users/x/.local/bin/superskill-cli",
      "node --enable-source-maps /opt/node_modules/superskill/dist/main.js",
      "node /opt/node_modules/superskill/dist/mcp-server.js",
      'node "/work/with spaces/dist/main.js"',
      "node /opt/node_modules/superskill-cli/dist/mcp-server.js",
      "node /opt/node_modules/superskill/dist/main.js doctor",
      "node /another/dist/main.js",
      "grep superskill",
      "echo /opt/node_modules/superskill/dist/mcp-server.js",
      "node -e superskill",
      "node --eval=code superskill",
      "node -pcode superskill",
    ].map((command, index) => `Mon Oct  5 09:58:02 2026 ${index + 1} ${command}`);
    expect(parseMcpProcesses(lines.join("\n"), "/work/with spaces").map((entry) => entry.pid)).toEqual(["1", "2", "3", "4", "5", "6"]);
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
  it("accepts the shared fast argument without probing toolchains or validating the catalog", async () => {
    const vault = await mkdtemp(join(tmpdir(), "doctor-fast-"));
    try {
      const ctx = {
        vaultFs: new VaultFS(vault),
        vaultPath: vault,
        sessionRegistry: {} as CommandContext["sessionRegistry"],
        config: { vaultPath: vault, maxInjectTokens: 1500, sessionTtlHours: 2 },
        log: { debug() {}, info() {}, warn() {}, error() {} },
        projectSlug: null,
      } satisfies CommandContext;
      const result = await doctorCommand({ fast: true }, ctx);
      expect(result.checks.find((entry) => entry.id === "catalog")?.status).toBe("skip");
      expect(result.checks.find((entry) => entry.id === "toolchains")?.status).toBe("skip");
    } finally {
      await rm(vault, { recursive: true, force: true });
    }
  });

  it("reports every layer with stable ids and a consistent summary", async () => {
    const vault = await mkdtemp(join(tmpdir(), "doctor-vault-"));
    try {
      const ctx = {
        vaultFs: new VaultFS(vault),
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
        "vault-writable",
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
      vaultFs: new VaultFS(missing),
      vaultPath: missing,
      sessionRegistry: {} as CommandContext["sessionRegistry"],
      config: { vaultPath: missing, maxInjectTokens: 1500, sessionTtlHours: 2 },
      log: { debug() {}, info() {}, warn() {}, error() {} },
      projectSlug: null,
    } satisfies CommandContext;

    const result = await doctorCommand({}, ctx, { skipCatalog: true, skipToolchains: true });

    expect(result.checks.find((entry) => entry.id === "vault")?.status).toBe("fail");
    expect(result.checks.find((entry) => entry.id === "project-map")?.status).toBe("skip");
    const locks = result.checks.find((entry) => entry.id === "locks");
    expect(locks?.status).not.toBe("ok");
    expect(locks?.detail).toContain("unassessed");
    expect(locks?.detail).not.toContain("no known");
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
        vaultFs: new VaultFS(vault),
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
      const futureDb = new DatabaseSync(join(vault, "projects", "demo", ".knowledge-index.sqlite"));
      futureDb.exec("PRAGMA user_version = 2");
      futureDb.close();
      const future = await doctorCommand({ fast: true }, ctx);
      const futureIndex = future.checks.find((entry) => entry.id === "index");
      expect(futureIndex?.status).toBe("warn");
      expect(futureIndex?.detail).toContain("newer than");
    } finally {
      await rm(vault, { recursive: true, force: true });
    }
  });
});

describe("doctor filesystem probes", () => {
  it("warns about unknown install metadata instead of using the epoch as a valid install date", async () => {
    const root = await mkdtemp(join(tmpdir(), "doctor-install-"));
    try {
      const result = await inspectInstall(root, "1.2.3");
      expect(result.installedAt).toBeNull();
      expect(result.check.status).toBe("warn");
      expect(result.check.detail).toContain("unknown");
      expect(result.check.detail).not.toContain("1970");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("uses a private vault probe and removes it after checking write access", async () => {
    const root = await mkdtemp(join(tmpdir(), "doctor-write-"));
    try {
      const vaultFs = new VaultFS(root);
      const remove = vaultFs.delete.bind(vaultFs);
      let mode = 0;
      vi.spyOn(vaultFs, "delete").mockImplementation(async (path) => {
        mode = (await stat(join(root, path))).mode & 0o777;
        await remove(path);
      });
      const result = await vaultWritableCheck(vaultFs);
      expect(result.status).toBe("ok");
      expect(mode).toBe(0o600);
      expect(await readdir(root)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("cleans a partially written probe in finally", async () => {
    const root = await mkdtemp(join(tmpdir(), "doctor-write-failure-"));
    try {
      const vaultFs = new VaultFS(root);
      const create = vaultFs.createExclusive.bind(vaultFs);
      vi.spyOn(vaultFs, "createExclusive").mockImplementation(async (path, content) => {
        await create(path, content);
        throw Object.assign(new Error("probe failure"), { code: "EIO" });
      });
      const result = await vaultWritableCheck(vaultFs);
      expect(result.status).toBe("fail");
      expect(result.detail).toContain("probe failure");
      expect(await readdir(root)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("never overwrites or removes an existing probe-path collision", async () => {
    const root = await mkdtemp(join(tmpdir(), "doctor-write-collision-"));
    try {
      const vaultFs = new VaultFS(root);
      vi.spyOn(vaultFs, "createExclusive").mockImplementation(async (path) => {
        await writeFile(join(root, path), "preserve user file");
        throw Object.assign(new Error("already exists"), { code: "EEXIST" });
      });
      const result = await vaultWritableCheck(vaultFs);
      expect(result.status).toBe("fail");
      const files = await readdir(root);
      expect(files).toHaveLength(1);
      expect(await readFile(join(root, files[0]), "utf-8")).toBe("preserve user file");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports per-note mutation locks without deleting or reading note contents", async () => {
    const root = await mkdtemp(join(tmpdir(), "doctor-note-lock-"));
    try {
      await mkdir(join(root, "projects", "demo"), { recursive: true });
      await writeFile(join(root, "projects", "demo", "note.md"), "preserve");
      await writeFile(join(root, "projects", "demo", ".note.md.lock"), "unknown-owner");
      const vaultFs = new VaultFS(root);
      const read = vi.spyOn(vaultFs, "read");
      const scan = await scanVaultMutationLocks(vaultFs);
      expect(scan.paths).toContain("projects/demo/.note.md.lock");
      expect(read).not.toHaveBeenCalledWith("projects/demo/note.md");
      expect(await readFile(join(root, "projects", "demo", ".note.md.lock"), "utf-8")).toBe("unknown-owner");
      expect(await readFile(join(root, "projects", "demo", "note.md"), "utf-8")).toBe("preserve");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("bounds the mutation-lock scan and reports incomplete coverage", async () => {
    const root = await mkdtemp(join(tmpdir(), "doctor-scan-limit-"));
    try {
      for (let i = 0; i < 6; i += 1) await writeFile(join(root, `${i}.md`), "note");
      const scan = await scanVaultMutationLocks(new VaultFS(root), 2);
      expect(scan.truncated).toBe(true);
      expect(scan.scanned).toBe(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("finds hidden orphan locks without reading their contents", async () => {
    const root = await mkdtemp(join(tmpdir(), "doctor-orphan-lock-"));
    try {
      await mkdir(join(root, ".pending"));
      await writeFile(join(root, ".pending", ".missing-note.md.lock"), "preserve lock");
      const vaultFs = new VaultFS(root);
      const read = vi.spyOn(vaultFs, "read");
      const scan = await scanVaultMutationLocks(vaultFs);
      expect(scan.paths).toContain(".pending/.missing-note.md.lock");
      expect(scan.assessed).toBe(true);
      expect(read).not.toHaveBeenCalled();
      expect(await readFile(join(root, ".pending", ".missing-note.md.lock"), "utf-8")).toBe("preserve lock");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("never follows directory or lock symlinks outside the canonical vault", async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), "doctor-scan-links-")));
    const outside = await mkdtemp(join(tmpdir(), "doctor-scan-outside-"));
    try {
      await writeFile(join(outside, ".outside.md.lock"), "keep");
      await symlink(outside, join(root, "linked"));
      await symlink(join(outside, ".outside.md.lock"), join(root, ".linked.md.lock"));
      const scan = await scanVaultMutationLocks(new VaultFS(root));
      expect(scan.paths).toEqual([]);
      expect(scan.errors.join(" ")).toContain("symlink");
      expect(scan.assessed).toBe(false);
      expect(await readFile(join(outside, ".outside.md.lock"), "utf-8")).toBe("keep");
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("reports an unreadable scan root instead of claiming no locks", async () => {
    const root = await mkdtemp(join(tmpdir(), "doctor-scan-missing-"));
    try {
      const scan = await scanVaultMutationLocks(new VaultFS(join(root, "missing")));
      expect(scan.assessed).toBe(false);
      expect(scan.errors.length).toBeGreaterThan(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not report no locks when the doctor cannot assess the vault scope", async () => {
    const root = await mkdtemp(join(tmpdir(), "doctor-unassessed-"));
    try {
      const ctx = {
        vaultFs: new VaultFS(root, { projectSlug: null }),
        vaultPath: root,
        sessionRegistry: {} as CommandContext["sessionRegistry"],
        config: { vaultPath: root, maxInjectTokens: 1500, sessionTtlHours: 2 },
        log: { debug() {}, info() {}, warn() {}, error() {} },
        projectSlug: null,
      } satisfies CommandContext;
      const result = await doctorCommand({ fast: true }, ctx);
      const locks = result.checks.find((entry) => entry.id === "locks");
      expect(locks?.status).toBe("warn");
      expect(locks?.detail).toContain("unassessed");
      expect(locks?.detail).not.toContain("no superskill lock");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("times out a pending metadata check without continuing the scan", async () => {
    const root = await mkdtemp(join(tmpdir(), "doctor-pending-metadata-"));
    try {
      const vaultFs = new VaultFS(root);
      vi.spyOn(vaultFs, "verifyNoSymlinkEscape").mockImplementation(() => new Promise<void>(() => {}));
      const scan = await scanVaultMutationLocks(vaultFs, 500, { timeoutMs: 15 });
      expect(scan.truncated).toBe(true);
      expect(scan.assessed).toBe(false);
      expect(scan.scanned).toBe(0);
      expect(scan.errors.join(" ")).toContain("time budget");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports depth and elapsed-time scan limits", async () => {
    const root = await mkdtemp(join(tmpdir(), "doctor-scan-budget-"));
    try {
      await mkdir(join(root, "deep"));
      await writeFile(join(root, "deep", ".note.md.lock"), "keep");
      const depth = await scanVaultMutationLocks(new VaultFS(root), 500, { maxDepth: 0 });
      expect(depth.truncated).toBe(true);
      expect(depth.assessed).toBe(false);
      const now = vi.spyOn(performance, "now");
      let elapsed = 0;
      now.mockImplementation(() => { elapsed += 5; return elapsed; });
      try {
        const timed = await scanVaultMutationLocks(new VaultFS(root), 500, { timeoutMs: 1 });
        expect(timed.truncated).toBe(true);
        expect(timed.assessed).toBe(false);
        expect(timed.errors.join(" ")).toContain("time budget");
      } finally {
        now.mockRestore();
      }
    } finally {
      await rm(root, { recursive: true, force: true });
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
      await writeFile(customPath, JSON.stringify({ mcpServers: { superskill: { command: "npx", args: ["-y", "superskill", "--custom"] } } }));

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

  it("classifies JSON and TOML launchers by ownership and exact upgrade eligibility", async () => {
    const dir = await mkdtemp(join(tmpdir(), "doctor-launcher-classes-"));
    try {
      const fixtureClient = (name: string, configFormat: "json" | "toml", mcpConfigPath: string) => ({
        ...detected,
        config: {
          ...detected.config,
          name,
          configFormat,
          rootKey: configFormat === "json" ? "mcpServers" : "mcp_servers",
        },
        mcpConfigPath,
      });
      const jsonEntry = (command: unknown, args?: string[]) => ({ command, ...(args === undefined ? {} : { args }) });
      const tomlEntry = (command: unknown, args?: string[]) => [
        "[mcp_servers.superskill]",
        `command = ${JSON.stringify(command)}`,
        ...(args === undefined ? [] : [`args = ${JSON.stringify(args)}`]),
      ].join("\n");
      const fixtures = [
        { name: "JSON pinned", format: "json" as const, entry: jsonEntry("npx", ["-y", "superskill@0.13.0"]) },
        { name: "JSON custom", format: "json" as const, entry: jsonEntry("npx", ["-y", "superskill", "--custom"]) },
        { name: "JSON direct", format: "json" as const, entry: jsonEntry("superskill", ["--custom"]) },
        { name: "JSON noncanonical latest", format: "json" as const, entry: jsonEntry("npx", ["-y", "--prefer-online", "superskill@latest", "--debug"]) },
        { name: "JSON legacy", format: "json" as const, entry: jsonEntry("npx", ["-y", "superskill"]) },
        { name: "JSON current", format: "json" as const, entry: jsonEntry("npx", ["-y", "--prefer-online", "superskill@latest"]) },
        { name: "JSON foreign", format: "json" as const, entry: jsonEntry("npx", ["-y", "other-mcp-server"]) },
        { name: "JSON missing", format: "json" as const, entry: undefined },
        { name: "TOML pinned", format: "toml" as const, entry: tomlEntry("npx", ["-y", "superskill@0.13.0"]) },
        { name: "TOML custom", format: "toml" as const, entry: tomlEntry("npx", ["-y", "superskill", "--custom"]) },
        { name: "TOML preserved syntax", format: "toml" as const, entry: "[mcp_servers.superskill]\ncommand = 'npx'\nargs = [\n  '-y',\n  'superskill',\n]" },
        { name: "TOML direct", format: "toml" as const, entry: tomlEntry("superskill", ["--custom"]) },
        { name: "TOML noncanonical latest", format: "toml" as const, entry: tomlEntry("npx", ["-y", "--prefer-online", "superskill@latest", "--debug"]) },
        { name: "TOML legacy", format: "toml" as const, entry: tomlEntry("npx", ["-y", "superskill"]) },
        { name: "TOML current", format: "toml" as const, entry: tomlEntry("npx", ["-y", "--prefer-online", "superskill@latest"]) },
        { name: "TOML array legacy", format: "toml" as const, entry: "[mcp_servers.superskill]\ncommand = [\"npx\", \"-y\", \"superskill\"]" },
        { name: "TOML array current", format: "toml" as const, entry: "[mcp_servers.superskill]\ncommand = [\"npx\", \"-y\", \"--prefer-online\", \"superskill@latest\"]" },
        { name: "TOML foreign", format: "toml" as const, entry: tomlEntry("npx", ["-y", "other-mcp-server"]) },
        { name: "TOML missing", format: "toml" as const, entry: "[mcp_servers.superskill.env]\nVAULT_PATH = \"/vault\"" },
      ];
      const clients: DetectedClient[] = [];
      for (const [index, fixture] of fixtures.entries()) {
        const path = join(dir, `${index}.config`);
        const contents = fixture.format === "json"
          ? JSON.stringify({ mcpServers: fixture.entry === undefined ? {} : { superskill: fixture.entry } })
          : fixture.entry as string;
        await writeFile(path, contents);
        clients.push(fixtureClient(fixture.name, fixture.format, path));
      }

      const report = launcherStaleness(clients);
      expect(report.stale).toEqual(["JSON legacy", "TOML legacy", "TOML array legacy"]);
      expect(report.current).toBe(3);
      expect(report.custom).toEqual([
        "JSON pinned", "JSON custom", "JSON direct", "JSON noncanonical latest",
        "TOML pinned", "TOML custom", "TOML preserved syntax", "TOML direct", "TOML noncanonical latest",
      ]);
      expect(report.foreign).toEqual(["JSON foreign", "TOML foreign"]);
      expect(report.missing).toEqual(["JSON missing", "TOML missing"]);

      const clientByName = (name: string) => clients.find((client) => client.config.name === name)!;
      const checkFor = (name: string) => launcherStatusCheck(launcherStaleness([clientByName(name)]));
      for (const name of ["JSON pinned", "JSON custom", "JSON direct", "JSON noncanonical latest", "TOML pinned", "TOML custom", "TOML preserved syntax", "TOML direct", "TOML noncanonical latest", "JSON current", "TOML current", "TOML array current"]) {
        expect(checkFor(name).status).toBe("ok");
        expect(checkFor(name).hint).toBeUndefined();
      }
      for (const name of ["JSON legacy", "TOML legacy", "TOML array legacy"]) {
        expect(checkFor(name).status).toBe("warn");
        expect(checkFor(name).hint).toContain("superskill upgrade");
      }
      for (const name of ["JSON foreign", "TOML foreign"]) {
        expect(checkFor(name).status).toBe("warn");
        expect(checkFor(name).detail).toContain("never replaced automatically");
        expect(checkFor(name).hint).toBeUndefined();
      }
      for (const name of ["JSON missing", "TOML missing"]) {
        expect(checkFor(name).status).toBe("warn");
        expect(checkFor(name).hint).toContain("setup --dry-run");
      }
      for (const name of ["TOML legacy", "TOML array legacy"]) {
        const content = await readFile(clientByName(name).mcpConfigPath, "utf-8");
        expect(reconcileTomlBlock(content, "unused")).not.toBeNull();
      }
      for (const name of ["TOML pinned", "TOML custom", "TOML preserved syntax", "TOML direct", "TOML noncanonical latest", "TOML current", "TOML array current", "TOML foreign"]) {
        const content = await readFile(clientByName(name).mcpConfigPath, "utf-8");
        expect(reconcileTomlBlock(content, "unused")).toBeNull();
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
