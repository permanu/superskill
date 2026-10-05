// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { CommandContext } from "../core/types.js";
import { VaultFS } from "../lib/vault-fs.js";
import { SessionRegistryManager } from "../lib/session-registry.js";
import { noopLog } from "../app-context.js";
import { capFindings, watchdogCommand } from "./watchdog.js";

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
