// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFile, readdir, stat, appendFile, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { homedir } from "node:os";
import matter from "gray-matter";
import type { CommandContext } from "../../core/types.js";
import { detectStack } from "../../lib/stack-detector.js";
import { detectTool } from "../../lib/tool-detector.js";
import { findSkills } from "../../lib/skills-sh/cli.js";
import { getAudit, isStale, refreshAudit } from "../../lib/skills-sh/audit-cache.js";
import {
  createEmptyGraph,
  ensureSuperskillDir,
  writeGraph,
  addNode,
  addEdge,
} from "../../lib/graph/store.js";
import { normalizeInstalls } from "../../lib/graph/learner.js";
import type {
  Graph,
  ProjectNode,
  SkillNode,
  AuditResult,
  AuditStatus,
} from "../../lib/graph/schema.js";

export interface InitResult {
  success: boolean;
  project_stack: string[];
  project_tools: string[];
  native_skills_found: number;
  skills_discovered: number;
  skills_blocked: number;
  graph_path: string;
  error?: string;
}

interface NativeSkillCandidate {
  id: string;
  name: string;
  dir: string;
}

function getToolSkillDirs(tool: string): Array<{ path: string; scope: "global" | "project" }> {
  const home = homedir();
  const cwd = process.cwd();
  const dirs: Array<{ path: string; scope: "global" | "project" }> = [];

  const toolDirMap: Record<string, string[]> = {
    "claude-code": [resolve(home, ".claude", "skills")],
    opencode: [resolve(home, ".config", "opencode", "skills")],
    cursor: [resolve(home, ".cursor", "skills")],
    codex: [resolve(home, ".codex", "skills")],
    "gemini-cli": [resolve(home, ".gemini", "skills")],
    windsurf: [resolve(home, ".codeium", "windsurf", "skills")],
    aider: [resolve(home, ".aider", "skills")],
    continue: [resolve(home, ".continue", "skills")],
  };

  const globalDirs = toolDirMap[tool] ?? [
    resolve(home, ".claude", "skills"),
    resolve(home, ".cursor", "skills"),
  ];

  for (const d of globalDirs) {
    dirs.push({ path: d, scope: "global" });
  }

  dirs.push({ path: resolve(cwd, ".claude", "skills"), scope: "project" });
  dirs.push({ path: resolve(cwd, ".cursor", "skills"), scope: "project" });
  dirs.push({ path: resolve(cwd, ".agents", "skills"), scope: "project" });

  return dirs;
}

async function findSkillFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") && entry.name !== ".claude" && entry.name !== ".agents") continue;
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        const nested = await findSkillFiles(fullPath);
        results.push(...nested);
      } else if (entry.name === "SKILL.md") {
        results.push(fullPath);
      }
    }
  } catch {
  }
  return results;
}

async function scanNativeSkills(tool: string): Promise<NativeSkillCandidate[]> {
  const dirs = getToolSkillDirs(tool);
  const candidates: NativeSkillCandidate[] = [];
  const seenNames = new Set<string>();

  for (const dir of dirs) {
    const skillFiles = await findSkillFiles(dir.path);
    for (const filePath of skillFiles) {
      try {
        const content = await readFile(filePath, "utf-8");
        const { data } = matter(content);
        const name = typeof data.name === "string" ? data.name : "";
        if (!name || seenNames.has(name)) continue;
        seenNames.add(name);
        candidates.push({
          id: `native/${name}`,
          name,
          dir: dirname(filePath),
        });
      } catch {
      }
    }
  }

  return candidates;
}

function auditStatusIsBlocked(audits: AuditResult): boolean {
  const vals: AuditStatus[] = [audits.gen, audits.socket, audits.snyk];
  return vals.some((v) => v === "fail");
}

function auditStatusIsWarn(audits: AuditResult): boolean {
  const vals: AuditStatus[] = [audits.gen, audits.socket, audits.snyk];
  return vals.some((v) => v === "warn");
}

const SUPER_SKILL_APPEND = `

## SuperSkill
This project uses superskill for skill routing. Before creative work,
new features, debugging, or code review — call the \`superskill\` tool
with your task description.
`;

async function appendToInstructionFile(projectDir: string): Promise<void> {
  for (const filename of ["AGENTS.md", "CLAUDE.md"]) {
    const filePath = join(projectDir, filename);
    try {
      await access(filePath);
      const content = await readFile(filePath, "utf-8");
      if (content.includes("## SuperSkill")) continue;
      await appendFile(filePath, SUPER_SKILL_APPEND, "utf-8");
    } catch {
    }
  }
}

export async function initProject(
  _args: Record<string, unknown>,
  ctx: CommandContext,
): Promise<InitResult> {
  const projectDir = process.cwd();

  try {
    const [stack, tool] = await Promise.all([
      detectStack(projectDir),
      Promise.resolve(detectTool()),
    ]);

    const projectStack = [...stack.languages, ...stack.frameworks, ...stack.buildTools];
    const projectTools = tool.tool !== "unknown" ? [tool.tool] : [];

    const nativeCandidates = await scanNativeSkills(tool.tool);

    const stackKeywords = projectStack.join(" ") || "typescript";
    const discovered = await findSkills(stackKeywords);

    let skillsBlocked = 0;
    const skillNodes: SkillNode[] = [];

    for (const native of nativeCandidates) {
      skillNodes.push({
        type: "skill",
        id: native.id,
        source: "native",
        audits: { gen: "unknown", socket: "unknown", snyk: "unknown" },
        installs: 0,
        stars: 0,
        w: 0.8,
        ts: Date.now(),
      });
    }

    for (const candidate of discovered) {
      const cached = await getAudit(candidate.id);
      let audits: AuditResult = { gen: "unknown", socket: "unknown", snyk: "unknown" };

      if (cached && !isStale(cached)) {
        audits = { gen: cached.gen, socket: cached.socket, snyk: cached.snyk };
      } else {
        const refreshed = await refreshAudit(candidate.id);
        if (refreshed) {
          audits = { gen: refreshed.gen, socket: refreshed.socket, snyk: refreshed.snyk };
        }
      }

      if (auditStatusIsBlocked(audits)) {
        skillsBlocked++;
        continue;
      }

      const w = normalizeInstalls(0);
      skillNodes.push({
        type: "skill",
        id: candidate.id,
        source: "routed",
        audits,
        installs: 0,
        stars: 0,
        w,
        ts: Date.now(),
      });
    }

    const projectNode: ProjectNode = {
      type: "project",
      id: "project",
      stack: projectStack,
      tools: projectTools,
      phase: "explore",
      ts: Date.now(),
    };

    let graph: Graph = createEmptyGraph();
    graph = addNode(graph, projectNode);

    for (const skill of skillNodes) {
      graph = addNode(graph, skill);
      graph = addEdge(graph, {
        type: "project_skill",
        from: "project",
        to: skill.id,
        w: skill.w,
        activations: 0,
      });
    }

    const superskillDir = await ensureSuperskillDir(projectDir);
    await writeGraph(projectDir, graph);

    await appendToInstructionFile(projectDir);

    return {
      success: true,
      project_stack: projectStack,
      project_tools: projectTools,
      native_skills_found: nativeCandidates.length,
      skills_discovered: discovered.length,
      skills_blocked: skillsBlocked,
      graph_path: join(superskillDir, "graph.json"),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[skill-init] initProject failed: ${msg}`);
    return {
      success: false,
      project_stack: [],
      project_tools: [],
      native_skills_found: 0,
      skills_discovered: 0,
      skills_blocked: 0,
      graph_path: join(projectDir, ".superskill", "graph.json"),
      error: msg,
    };
  }
}
