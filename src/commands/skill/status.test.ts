// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { statusCommand, UNAUDITED_MARKER } from "./status.js";
import { _resetInstallDir, _setInstallDir } from "../../lib/skill-installer.js";
import type { CommandContext } from "../../core/types.js";

function createMockCtx(projectDir: string): CommandContext {
  return {
    vaultFs: {} as any,
    vaultPath: projectDir,
    sessionRegistry: {} as any,
    config: {} as any,
    log: { debug() {}, info() {}, warn() {}, error() {} },
  };
}

async function writeGraph(projectDir: string, skillIds: string[] = []): Promise<void> {
  await mkdir(join(projectDir, ".superskill"), { recursive: true });
  const graph = {
    nodes: [
      {
        type: "project",
        id: "project",
        stack: ["typescript"],
        tools: ["claude-code"],
        phase: "explore",
        ts: Date.now(),
      },
      ...skillIds.map((id) => ({
        type: "skill",
        id,
        source: "native",
        audits: { gen: "unknown", socket: "unknown", snyk: "unknown" },
        installs: 0,
        stars: 0,
        w: 0.8,
        ts: Date.now(),
      })),
    ],
    edges: [],
  };
  await writeFile(join(projectDir, ".superskill", "graph.json"), JSON.stringify(graph), "utf-8");
}

async function installSkill(installDir: string, name: string, unaudited = false): Promise<void> {
  const dir = join(installDir, name);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${name} skill\n---\n# ${name}`,
    "utf-8",
  );
  if (unaudited) {
    await writeFile(join(dir, UNAUDITED_MARKER), JSON.stringify({ unaudited: true }), "utf-8");
  }
}

describe("statusCommand", () => {
  let projectDir: string;
  let installDir: string;

  beforeEach(async () => {
    projectDir = join(tmpdir(), `superskill-status-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    installDir = join(projectDir, "installed-skills");
    await mkdir(projectDir, { recursive: true });
    await mkdir(installDir, { recursive: true });
    _setInstallDir(installDir);
    vi.spyOn(process, "cwd").mockReturnValue(projectDir);
  });

  afterEach(async () => {
    _resetInstallDir();
    vi.restoreAllMocks();
    await rm(projectDir, { recursive: true, force: true }).catch(() => {});
  });

  it("flags installed skills that carry the unaudited marker", async () => {
    await writeGraph(projectDir, ["native/clean-skill"]);
    await installSkill(installDir, "clean-skill");
    await installSkill(installDir, "sketchy-skill", true);

    const result = await statusCommand({}, createMockCtx(projectDir));

    expect(result.initialized).toBe(true);
    expect(result.unaudited_count).toBe(1);
    expect(result.unaudited_skills).toEqual(["sketchy-skill"]);
    expect(result.warnings.join(" ")).toContain("without a skills.sh audit");
    expect(result.warnings.join(" ")).toContain("sketchy-skill");
    expect(result.warnings.join(" ")).not.toContain("clean-skill");
  });

  it("stays clean when installed skills have no marker", async () => {
    await writeGraph(projectDir, ["native/clean-skill"]);
    await installSkill(installDir, "clean-skill");

    const result = await statusCommand({}, createMockCtx(projectDir));

    expect(result.unaudited_count).toBe(0);
    expect(result.unaudited_skills).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("keeps the existing graph fields unchanged", async () => {
    await writeGraph(projectDir, ["native/clean-skill"]);
    await installSkill(installDir, "clean-skill");

    const result = await statusCommand({}, createMockCtx(projectDir));

    expect(result.project).toEqual({ stack: ["typescript"], tools: ["claude-code"], phase: "explore" });
    expect(result.skills).toEqual([
      { id: "native/clean-skill", source: "native", w: 0.8, audit_summary: "unknown" },
    ]);
    expect(result.sessions).toEqual([]);
    expect(result.total_activations).toBe(0);
    expect(result.graph_path).toBe(join(projectDir, ".superskill", "graph.json"));
  });

  it("reports unaudited installs even before graph init", async () => {
    await installSkill(installDir, "sketchy-skill", true);

    const result = await statusCommand({}, createMockCtx(projectDir));

    expect(result.initialized).toBe(false);
    expect(result.unaudited_count).toBe(1);
    expect(result.unaudited_skills).toEqual(["sketchy-skill"]);
    expect(result.warnings.join(" ")).toContain("without a skills.sh audit");
  });
});
