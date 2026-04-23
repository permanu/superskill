// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { skillCommand } from "./index.js";
import type { CommandContext } from "../../core/types.js";

vi.mock("../../lib/skills-sh/cli.js", () => ({
  findSkills: async () => [],
}));

vi.mock("../../lib/skills-sh/audit-cache.js", () => ({
  getAudit: async () => null,
  isStale: () => true,
  refreshAudit: async () => null,
}));

describe("skillCommand", () => {
  let projectDir: string;
  let ctx: CommandContext;

  beforeEach(async () => {
    projectDir = join(tmpdir(), `superskill-cmd-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(projectDir, { recursive: true });
    await mkdir(join(projectDir, ".superskill"), { recursive: true });
    vi.spyOn(process, "cwd").mockReturnValue(projectDir);
    ctx = {
      vaultFs: {} as any,
      vaultPath: projectDir,
      sessionRegistry: {} as any,
      config: {} as any,
      log: { debug() {}, info() {}, warn() {}, error() {} },
    };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(projectDir, { recursive: true, force: true }).catch(() => {});
  });

  describe("init action", () => {
    it("initializes the graph", async () => {
      const result = await skillCommand({ action: "init" }, ctx);
      expect(result.action).toBe("init");
      if (result.action === "init") {
        expect(result.result.success).toBe(true);
        expect(result.result.graph_path).toContain("graph.json");
      }
    });
  });

  describe("activate action", () => {
    it("returns error when graph is empty", async () => {
      const result = await skillCommand({ action: "activate", task: "test" }, ctx);
      expect(result.action).toBe("activate");
      if (result.action === "activate") {
        expect(result.result.error).toContain("not initialized");
      }
    });
  });
});
