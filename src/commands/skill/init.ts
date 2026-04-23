// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFile, appendFile, access, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import matter from "gray-matter";
import type { CommandContext } from "../../core/types.js";
import { detectStack } from "../../lib/stack-detector.js";
import { detectTool } from "../../lib/tool-detector.js";
import { findSkills, type CliSearchResult } from "../../lib/skills-sh/cli.js";
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

function auditIsBlocked(audits: AuditResult): boolean {
  const vals: AuditStatus[] = [audits.gen, audits.socket, audits.snyk];
  return vals.some((v) => v === "fail");
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

function getSkillDirectories(projectDir: string): string[] {
  const home = homedir();
  const dirs = [
    resolve(home, ".claude", "skills"),
    resolve(home, ".cursor", "skills"),
    resolve(home, ".codex", "skills"),
    resolve(home, ".gemini", "skills"),
    resolve(home, ".config", "opencode", "skills"),
    resolve(home, ".codeium", "windsurf", "skills"),
    resolve(home, ".aider", "skills"),
    resolve(home, ".continue", "skills"),
    resolve(home, ".config", "crush", "skills"),
    resolve(home, ".factory", "skills"),
    resolve(projectDir, ".claude", "skills"),
    resolve(projectDir, ".cursor", "skills"),
    resolve(projectDir, ".agents", "skills"),
  ];
  return dirs;
}

async function scanNativeSkillDirs(projectDir: string): Promise<string[]> {
  const dirs = getSkillDirectories(projectDir);
  const skillFiles: string[] = [];

  for (const dir of dirs) {
    try {
      await collectSkillFiles(dir, skillFiles);
    } catch {
    }
  }

  return skillFiles;
}

async function collectSkillFiles(
  dir: string,
  results: string[],
): Promise<void> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") && entry.name !== ".claude" && entry.name !== ".agents") continue;
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        await collectSkillFiles(fullPath, results);
      } else if (entry.name === "SKILL.md") {
        results.push(fullPath);
      }
    }
  } catch {
  }
}

async function parseNativeSkillFile(filePath: string): Promise<{ name: string } | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const { data } = matter(content);
    const name = typeof data.name === "string" ? data.name : "";
    if (!name) return null;
    return { name };
  } catch {
    return null;
  }
}

async function buildRoutedSkillNode(
  candidate: CliSearchResult,
): Promise<{ node: SkillNode | null; blocked: boolean }> {
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

  if (auditIsBlocked(audits)) {
    return { node: null, blocked: true };
  }

  return {
    node: {
      type: "skill",
      id: candidate.id,
      source: "routed",
      audits,
      installs: 0,
      stars: 0,
      w: normalizeInstalls(0),
      ts: Date.now(),
    },
    blocked: false,
  };
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

    const nativeFiles = await scanNativeSkillDirs(projectDir);
    const nativeSkills: Array<{ id: string; name: string }> = [];
    const seenNames = new Set<string>();

    for (const filePath of nativeFiles) {
      const parsed = await parseNativeSkillFile(filePath);
      if (!parsed || seenNames.has(parsed.name)) continue;
      seenNames.add(parsed.name);
      nativeSkills.push({ id: `native/${parsed.name}`, name: parsed.name });
    }

    const stackKeywords = projectStack.join(" ") || "typescript";
    const discovered = await findSkills(stackKeywords);

    let skillsBlocked = 0;
    const skillNodes: SkillNode[] = [];

    for (const native of nativeSkills) {
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
      const { node, blocked } = await buildRoutedSkillNode(candidate);
      if (blocked) {
        skillsBlocked++;
        continue;
      }
      if (node) {
        skillNodes.push(node);
      }
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
      native_skills_found: nativeSkills.length,
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
