// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { skillCommand } from "./index.js";
import { activateSkills, type ActivateResult } from "./activate.js";

vi.mock("./activate.js", () => ({ activateSkills: vi.fn() }));
import type { CommandContext } from "../../core/types.js";

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
      workspacePath: projectDir,
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
    it("forwards activation and its startup readiness result", async () => {
      const activated: ActivateResult = {
        success: true,
        initialization: { success: true, graph_path: join(projectDir, ".superskill", "graph.json"), skills_discovered: 1 },
        skills_loaded: [{ id: "code/typescript", source: "catalog" }],
        content: "Selected methodology",
        matched_skill_ids: ["code/typescript"],
        total_tokens: 6,
        usedTokens: 6,
        allocatedTokens: 256,
        dropped: [],
        warnings: [],
        rules_plan: { selected: [], explain: [], dropped: [], budget: { allocated: 256, used: 0 } },
        principles_plan: { selected: [], explain: [], budget: { allocated: 256, used: 0 } },
      };
      vi.mocked(activateSkills).mockResolvedValueOnce(activated);
      const result = await skillCommand({ action: "activate", task: "test", skill_id: "code/typescript" }, ctx);
      expect(activateSkills).toHaveBeenCalledWith({ task: "test", skill_id: "code/typescript" }, ctx);
      expect(result).toEqual({ action: "activate", result: activated });
    });
  });
});
