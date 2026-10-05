// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { CommandContext } from "../core/types.js";
import { VaultFS } from "../lib/vault-fs.js";
import { SessionRegistryManager } from "../lib/session-registry.js";
import { createFrontmatter, serializeFrontmatter } from "../lib/frontmatter.js";
import { noopLog } from "../app-context.js";
import { capFindings, mergeFindings, watchdogCommand } from "./watchdog.js";
import type { Finding } from "../lib/watchdog/types.js";

describe("capFindings", () => {
  it("caps medium/low findings per category and folds the rest into a rollup", () => {
    const findings = Array.from({ length: 12 }, (_, i) => ({
      id: `f_${String(i).padStart(10, "0")}`,
      category: "tool-economy" as const,
      severity: "medium" as const,
      title: `noise ${i}`,
      detail: "",
      evidence: [],
      proposal: "",
      weight: 12 - i,
    }));
    const capped = capFindings(findings, 8);
    expect(capped.filter((finding) => !finding.title.includes("folded"))).toHaveLength(8);
    const rollup = capped.find((finding) => finding.title.includes("folded"));
    expect(rollup).toBeDefined();
    expect(rollup!.evidence.length).toBeGreaterThan(0);
  });

  it("never caps high and critical findings", () => {
    const findings = Array.from({ length: 10 }, (_, i) => ({
      id: `f_${i}`,
      category: "verification" as const,
      severity: "high" as const,
      title: `real ${i}`,
      detail: "",
      evidence: [],
      proposal: "",
    }));
    expect(capFindings(findings, 3)).toHaveLength(10);
  });
});

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, JSON.stringify(value), "utf-8");
}

describe("watchdog command", () => {
  let vaultDir: string;
  let home: string;
  let dataDir: string;
  let oldHome: string | undefined;
  let ctx: CommandContext;

  beforeEach(async () => {
    vaultDir = await mkdtemp(join(tmpdir(), "watchdog-cmd-vault-"));
    home = await mkdtemp(join(tmpdir(), "watchdog-cmd-home-"));
    dataDir = await mkdtemp(join(tmpdir(), "watchdog-cmd-oc-"));
    oldHome = process.env.HOME;
    process.env.HOME = home;
    process.env.SUPERSKILL_OPENCODE_DATA = dataDir;

    await writeJson(join(dataDir, "storage/session/hash1/ses_cmdtest.json"), {
      id: "ses_cmdtest",
      title: "Fixing tests",
      directory: process.cwd(),
      time: { created: 1000, updated: 2000 },
    });
    await writeJson(join(dataDir, "storage/message/ses_cmdtest/msg_1.json"), { id: "msg_1", role: "user", time: { created: 1 } });
    await writeJson(join(dataDir, "storage/message/ses_cmdtest/msg_2.json"), { id: "msg_2", role: "assistant", time: { created: 2 } });
    await writeJson(join(dataDir, "storage/part/msg_1/prt_1.json"), { type: "text", text: "fix the tests" });
    for (let i = 0; i < 3; i += 1) {
      await writeJson(join(dataDir, `storage/part/msg_2/prt_${i + 2}.json`), {
        type: "tool",
        tool: "bash",
        state: { status: "error", input: { command: "npm test" }, output: "Error: tests failed" },
      });
    }

    ctx = {
      vaultFs: new VaultFS(vaultDir, { projectSlug: "testproj" }),
      vaultPath: vaultDir,
      sessionRegistry: new SessionRegistryManager(vaultDir, 2),
      config: { vaultPath: vaultDir, maxInjectTokens: 1500, sessionTtlHours: 2 },
      log: noopLog,
      projectSlug: "testproj",
    };
  });

  afterEach(async () => {
    process.env.HOME = oldHome;
    delete process.env.SUPERSKILL_OPENCODE_DATA;
    await rm(vaultDir, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
    await rm(dataDir, { recursive: true, force: true });
  });

  it("digs a session, persists the report, and reports findings", async () => {
    const result = await watchdogCommand({ action: "dig", sessionId: "opencode:ses_cmdtest" }, ctx);
    expect(result.action).toBe("dig");
    if (result.action !== "dig") return;
    expect(result.report.sessions).toBe(1);
    const ids = result.report.findings.map((finding) => finding.category);
    expect(ids).toContain("tool-economy");
    expect(result.persisted_path).toBeDefined();
    expect(result.persisted_path!).toMatch(/^watchdog\//);

    const status = await watchdogCommand({ action: "status" }, ctx);
    expect(status.action).toBe("status");
    if (status.action !== "status") return;
    expect(status.reports.length).toBe(1);
    expect(status.reports[0].open.length).toBeGreaterThan(0);
  });

  it("fixes a finding (dry-run first, then apply) and quarantines leaked tmp files", async () => {
    const dig = await watchdogCommand({ action: "dig", sessionId: "opencode:ses_cmdtest" }, ctx);
    if (dig.action !== "dig") throw new Error("expected dig");
    const findingId = dig.report.findings[0].id;

    const dry = await watchdogCommand({ action: "fix", findingIds: [findingId] }, ctx);
    expect(dry.action).toBe("fix");
    if (dry.action !== "fix") return;
    expect(dry.dryRun).toBe(true);
    expect(dry.actions[0].status).toBe("planned");

    const applied = await watchdogCommand({ action: "fix", findingIds: [findingId], apply: true }, ctx);
    expect(applied.action).toBe("fix");
    if (applied.action !== "fix") return;
    expect(applied.actions[0].status).toBe("applied");

    const superHome = join(home, ".superskill");
    await mkdir(superHome, { recursive: true });
    await writeFile(join(superHome, "analytics.json.dead.tmp"), "leak", "utf-8");
    const tmpFix = await watchdogCommand({ action: "fix", categories: ["leaked-tmp"], apply: true }, ctx);
    expect(tmpFix.action).toBe("fix");
    if (tmpFix.action !== "fix") return;
    const quarantineAction = tmpFix.actions.find((action) => action.kind === "quarantine-files");
    expect(quarantineAction?.status).toBe("applied");
    const manifest = JSON.parse(await readFile(join(quarantineAction!.path!, "manifest.json"), "utf-8")) as { files: Array<{ name: string }> };
    expect(manifest.files[0].name).toBe("analytics.json.dead.tmp");
  });
});

describe("capFindings and mergeFindings edge paths", () => {
  function finding(overrides: Partial<Finding> & { id: string }): Finding {
    return {
      category: "tool-economy",
      severity: "medium",
      title: `finding ${overrides.id}`,
      detail: "",
      evidence: [],
      proposal: "",
      ...overrides,
    } as Finding;
  }

  it("rolls low-severity drops into a low rollup and sorts weighted and equal lists", () => {
    const low = Array.from({ length: 10 }, (_, i) =>
      finding({ id: `f_${String(i).padStart(3, "0")}`, severity: "low", title: `low ${i}` }),
    );
    const cappedLow = capFindings(low, 8);
    expect(cappedLow.find((entry) => entry.title.includes("folded"))?.severity).toBe("low");

    const mixed = [
      finding({ id: "f_high", severity: "medium", weight: 9 }),
      finding({ id: "f_low_a", severity: "medium", weight: 1 }),
      finding({ id: "f_low_b", severity: "medium", weight: 1 }),
      finding({ id: "f_unweighted", severity: "medium" }),
    ];
    const cappedMixed = capFindings(mixed, 2);
    expect(cappedMixed.filter((entry) => !entry.title.includes("folded"))).toHaveLength(2);
    expect(cappedMixed.some((entry) => entry.id === "f_high")).toBe(true);
  });

  it("merges duplicate findings, keeping the worst severity and unique evidence", () => {
    const first = finding({
      id: "f_dup",
      severity: "high",
      evidence: [{ source: "trace", ref: "one" }],
      sessionId: "s1",
    });
    const second = finding({
      id: "f_dup",
      severity: "low",
      evidence: [
        { source: "trace", ref: "one" },
        { source: "trace", ref: "two" },
      ],
      sessionId: "s2",
    });
    const merged = mergeFindings([[first], [second]]);
    expect(merged).toHaveLength(1);
    expect(merged[0].severity).toBe("high");
    expect(merged[0].evidence.map((item) => item.ref)).toEqual(["one", "two"]);
    expect(merged[0].sessionId).toBe("s1");

    const lower = finding({ id: "f_upgrade", severity: "low" });
    const higher = finding({ id: "f_upgrade", severity: "high", sessionId: "s9" });
    const upgraded = mergeFindings([[lower], [higher]]);
    expect(upgraded[0].severity).toBe("high");
    expect(upgraded[0].sessionId).toBe("s9");
  });
});

describe("watchdog command branch coverage", () => {
  let vaultDir: string;
  let home: string;
  let dataDir: string;
  let oldHome: string | undefined;
  let oldClaude: string | undefined;
  let oldCodex: string | undefined;
  let ctx: CommandContext;
  let logs: string[];

  beforeEach(async () => {
    vaultDir = await mkdtemp(join(tmpdir(), "watchdog-br-vault-"));
    home = await mkdtemp(join(tmpdir(), "watchdog-br-home-"));
    dataDir = await mkdtemp(join(tmpdir(), "watchdog-br-oc-"));
    oldHome = process.env.HOME;
    oldClaude = process.env.SUPERSKILL_CLAUDE_PROJECTS;
    oldCodex = process.env.SUPERSKILL_CODEX_SESSIONS;
    process.env.HOME = home;
    process.env.SUPERSKILL_OPENCODE_DATA = dataDir;
    process.env.SUPERSKILL_CLAUDE_PROJECTS = join(home, "claude-projects");
    process.env.SUPERSKILL_CODEX_SESSIONS = join(home, "codex-sessions");
    await mkdir(process.env.SUPERSKILL_CLAUDE_PROJECTS, { recursive: true });
    await mkdir(process.env.SUPERSKILL_CODEX_SESSIONS, { recursive: true });

    await writeJson(join(dataDir, "storage/session/h1/ses_branch.json"), {
      id: "ses_branch",
      title: "Branch test",
      directory: process.cwd(),
      time: { created: 1000, updated: 2000 },
    });
    await writeJson(join(dataDir, "storage/message/ses_branch/msg_1.json"), {
      id: "msg_1",
      role: "user",
      time: { created: 1 },
    });
    for (let i = 0; i < 3; i += 1) {
      await writeJson(join(dataDir, `storage/part/msg_1/prt_${i + 1}.json`), {
        type: "tool",
        tool: "bash",
        state: { status: "error", input: { command: "npm test" }, output: "Error: tests failed" },
      });
    }

    logs = [];
    ctx = {
      vaultFs: new VaultFS(vaultDir, { projectSlug: "testproj" }),
      vaultPath: vaultDir,
      sessionRegistry: new SessionRegistryManager(vaultDir, 2),
      config: { vaultPath: vaultDir, maxInjectTokens: 1500, sessionTtlHours: 2 },
      log: {
        ...noopLog,
        warn: (message: string) => {
          logs.push(message);
        },
      },
      projectSlug: "testproj",
    };
  });

  afterEach(async () => {
    process.env.HOME = oldHome;
    delete process.env.SUPERSKILL_OPENCODE_DATA;
    if (oldClaude === undefined) delete process.env.SUPERSKILL_CLAUDE_PROJECTS;
    else process.env.SUPERSKILL_CLAUDE_PROJECTS = oldClaude;
    if (oldCodex === undefined) delete process.env.SUPERSKILL_CODEX_SESSIONS;
    else process.env.SUPERSKILL_CODEX_SESSIONS = oldCodex;
    await rm(vaultDir, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
    await rm(dataDir, { recursive: true, force: true });
  });

  async function seedVaultNote(sessionId: string, extra: Record<string, unknown> = {}): Promise<void> {
    const fm = createFrontmatter({
      type: "session",
      session_id: sessionId,
      started_at: "2026-01-01T00:00:00.000Z",
      completed_at: "2026-01-01T01:00:00.000Z",
      ...extra,
    });
    await mkdir(join(vaultDir, "projects/testproj/sessions"), { recursive: true });
    await writeFile(
      join(vaultDir, `projects/testproj/sessions/2026-01-01-${sessionId}.md`),
      serializeFrontmatter(fm, "\n# Session\n"),
      "utf-8",
    );
  }

  it("throws on an unknown action", async () => {
    await expect(watchdogCommand({ action: "explode" } as never, ctx)).rejects.toThrow(/Unknown watchdog action/);
  });

  it("uses a scoped VaultFS for another project and persists nothing when asked", async () => {
    const result = await watchdogCommand(
      { action: "dig", scope: "window", project: "otherproj", count: 1, persist: false },
      ctx,
    );
    expect(result.action).toBe("dig");
    if (result.action !== "dig") return;
    expect(result.report.scope.kind).toBe("window");
    expect(result.report.sessions).toBe(0);
    expect(result.persisted_path).toBeUndefined();
  });

  it("digs unknown sessions and falls back to vault session notes", async () => {
    const empty = await watchdogCommand({ action: "dig", sessionId: "missing-session", allProjects: true, persist: false }, ctx);
    expect(empty.action).toBe("dig");
    if (empty.action !== "dig") return;
    expect(empty.report.sessions).toBe(0);

    const nullRef = await watchdogCommand({ action: "dig", sessionId: "nope:nope", persist: false }, ctx);
    expect(nullRef.action).toBe("dig");
    if (nullRef.action !== "dig") return;
    expect(nullRef.report.sessions).toBe(0);

    await seedVaultNote("ses_vault1", {
      outcome: "shipped",
      project: "/some/repo",
      blocked: ["creds"],
      files_touched: ["src/x.ts"],
      verification_run: "npm test",
    });
    const vault = await watchdogCommand({ action: "dig", sessionId: "ses_vault1" }, ctx);
    expect(vault.action).toBe("dig");
    if (vault.action !== "dig") return;
    expect(vault.report.sessions).toBe(1);
    expect(vault.report.scope.project).toBe("/some/repo");
    expect(vault.report.findings.some((entry) => entry.category === "prompt")).toBe(true);
    expect(vault.persisted_path).toBeDefined();

    const again = await watchdogCommand({ action: "dig", sessionId: "ses_vault1" }, ctx);
    expect(again.action).toBe("dig");
    if (again.action !== "dig") return;
    expect(again.report.findings.some((entry) => (entry.recurrences ?? 0) > 0)).toBe(true);

    const toolScoped = await watchdogCommand({ action: "dig", sessionId: "ses_vault1", tool: "superskill", persist: false }, ctx);
    expect(toolScoped.action).toBe("dig");

    const wrongTool = await watchdogCommand({ action: "dig", tool: "claude-code", persist: false }, ctx);
    expect(wrongTool.action).toBe("dig");
    if (wrongTool.action !== "dig") return;
    expect(wrongTool.report.sessions).toBe(0);
  });

  it("falls back to the repo root for a vault note without a project", async () => {
    await seedVaultNote("ses_noproj", { outcome: "done" });
    const result = await watchdogCommand({ action: "dig", sessionId: "ses_noproj", persist: false }, ctx);
    expect(result.action).toBe("dig");
    if (result.action !== "dig") return;
    expect(result.report.scope.project).toBe(process.cwd());
  });

  it("status tolerates reports with sparse frontmatter", async () => {
    const dir = join(vaultDir, "projects/testproj/watchdog");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "000-manual.md"), "---\ntype: watchdog\n---\n\nbody\n", "utf-8");

    const result = await watchdogCommand({ action: "status" }, ctx);
    expect(result.action).toBe("status");
    if (result.action !== "status") return;
    const manual = result.reports.find((report) => report.name === "000-manual.md");
    expect(manual).toBeDefined();
    expect(manual?.created).toBe("");
    expect(manual?.scope).toBe("");
    expect(manual?.summary).toEqual({ critical: 0, high: 0, medium: 0, low: 0, total: 0 });
    expect(manual?.open).toEqual([]);
  });

  it("fix returns an empty result when no report exists", async () => {
    const result = await watchdogCommand({ action: "fix", findingIds: ["f_missing"], apply: true }, ctx);
    expect(result.action).toBe("fix");
    if (result.action !== "fix") return;
    expect(result.reportId).toBe("");
    expect(result.actions).toEqual([]);
    expect(result.applied).toBe(0);
  });

  it("fix applies dismissals, report paths, and finding-id categories", async () => {
    const dig = await watchdogCommand({ action: "dig", sessionId: "opencode:ses_branch" }, ctx);
    if (dig.action !== "dig") throw new Error("expected dig");
    const id = dig.report.findings[0].id;

    const dismissed = await watchdogCommand({ action: "fix", findingIds: [id], dismiss: true, apply: true }, ctx);
    expect(dismissed.action).toBe("fix");
    if (dismissed.action !== "fix") return;
    expect(dismissed.actions[0].description).toContain("dismissed");

    const byIdCategory = await watchdogCommand({ action: "fix", categories: [id] }, ctx);
    expect(byIdCategory.action).toBe("fix");
    if (byIdCategory.action !== "fix") return;
    expect(byIdCategory.planned).toBe(1);

    const byReportPath = await watchdogCommand(
      { action: "fix", reportPath: dig.persisted_path, categories: ["tool-economy"], apply: false },
      ctx,
    );
    expect(byReportPath.action).toBe("fix");
    if (byReportPath.action !== "fix") return;
    expect(byReportPath.planned).toBeGreaterThan(0);
  });

  it("fix plans and applies leaked-tmp quarantine without files", async () => {
    const dig = await watchdogCommand({ action: "dig", sessionId: "opencode:ses_branch", persist: true }, ctx);
    expect(dig.action).toBe("dig");
    const dry = await watchdogCommand({ action: "fix", categories: ["leaked-tmp"] }, ctx);
    expect(dry.action).toBe("fix");
    if (dry.action !== "fix") return;
    const planned = dry.actions.find((action) => action.kind === "quarantine-files");
    expect(planned?.status).toBe("planned");
    expect(planned?.fileCount).toBe(0);

    const applied = await watchdogCommand({ action: "fix", categories: ["leaked-tmp"], apply: true }, ctx);
    expect(applied.action).toBe("fix");
    if (applied.action !== "fix") return;
    const quarantined = applied.actions.find((action) => action.kind === "quarantine-files");
    expect(quarantined?.status).toBe("applied");

    const findingIdsOnly = await watchdogCommand({ action: "fix", findingIds: ["f_nothing"] }, ctx);
    expect(findingIdsOnly.action).toBe("fix");
    if (findingIdsOnly.action !== "fix") return;
    expect(findingIdsOnly.actions).toEqual([]);
  });

  it("warns when a dig report cannot be persisted", async () => {
    const projectDir = join(vaultDir, "projects/testproj");
    await mkdir(projectDir, { recursive: true });
    await chmod(projectDir, 0o500);
    try {
      const result = await watchdogCommand({ action: "dig", sessionId: "opencode:ses_branch" }, ctx);
      expect(result.action).toBe("dig");
      if (result.action !== "dig") return;
      expect(result.persisted_path).toBeUndefined();
      expect(logs.some((line) => line.includes("could not persist"))).toBe(true);
    } finally {
      await chmod(projectDir, 0o700);
    }
  });

  it(
    "digs the env scope",
    async () => {
      const env = await watchdogCommand({ action: "dig", scope: "env", persist: false }, ctx);
      expect(env.action).toBe("dig");
      if (env.action !== "dig") return;
      expect(env.report.scope.kind).toBe("env");
    },
    30000,
  );

  it("digs window and all scopes", async () => {
    const window = await watchdogCommand({ action: "dig", scope: "window", count: 2, persist: false }, ctx);
    expect(window.action).toBe("dig");
    if (window.action !== "dig") return;
    expect(window.report.scope.kind).toBe("window");
    expect(window.report.sessions).toBeGreaterThan(0);

    const all = await watchdogCommand({ action: "dig", scope: "all", count: 1, persist: false }, ctx);
    expect(all.action).toBe("dig");
    if (all.action !== "dig") return;
    expect(all.report.scope.kind).toBe("all");
  }, 30000);
});
