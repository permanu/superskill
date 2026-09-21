// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFile, appendFile, access, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import type { CommandContext } from "../../core/types.js";
import { detectStack } from "../../lib/stack-detector.js";
import { detectTool } from "../../lib/tool-detector.js";
import {
  createEmptyGraph,
  ensureSuperskillDir,
  writeGraph,
  addNode,
  addEdge,
} from "../../lib/graph/store.js";
import { normalizeInstalls, normalizeStars } from "../../lib/graph/learner.js";
import { auditIsBlocked } from "../../lib/security-gate.js";
import { loadCatalog } from "../../lib/catalog.js";
import type {
  Graph,
  ProjectNode,
  SkillNode,
  AuditResult,
  AuditStatus,
  SkillPack,
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
  return [
    resolve(projectDir, ".agents", "skills"),
    resolve(projectDir, ".superskill", "skills"),
    resolve(projectDir, ".claude", "skills"),
  ];
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
  depth = 0,
): Promise<void> {
  if (depth > 5) return;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") && entry.name !== ".claude" && entry.name !== ".agents") continue;
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        await collectSkillFiles(fullPath, results, depth + 1);
      } else if (entry.name === "SKILL.md") {
        results.push(fullPath);
      }
    }
  } catch {
  }
}

async function parseNativeSkillFile(filePath: string): Promise<{
  name: string;
  audits?: AuditResult;
  installs?: number;
  stars?: number;
  source?: string;
  pack?: SkillPack;
  langs?: string[];
  triggers?: string[];
  always?: boolean;
} | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const { data } = matter(content);
    const name = typeof data.name === "string" ? data.name : "";
    if (!name) return null;

    const result: {
      name: string;
      audits?: AuditResult;
      installs?: number;
      stars?: number;
      source?: string;
      pack?: SkillPack;
      langs?: string[];
      triggers?: string[];
      always?: boolean;
    } = { name };

    if (data.audits && typeof data.audits === "object") {
      const a = data.audits as Record<string, unknown>;
      result.audits = {
        gen: (typeof a.gen === "string" ? a.gen : "unknown") as AuditStatus,
        socket: (typeof a.socket === "string" ? a.socket : "unknown") as AuditStatus,
        snyk: (typeof a.snyk === "string" ? a.snyk : "unknown") as AuditStatus,
      };
    }

    if (typeof data.installs === "number") result.installs = data.installs;
    if (typeof data.stars === "number") result.stars = data.stars;
    if (typeof data.source === "string") result.source = data.source;
    if (typeof data.pack === "string") result.pack = data.pack as SkillPack;
    if (Array.isArray(data.langs)) result.langs = data.langs.filter((v): v is string => typeof v === "string");
    if (Array.isArray(data.triggers)) result.triggers = data.triggers.filter((v): v is string => typeof v === "string");
    if (data.always === true) result.always = true;

    return result;
  } catch {
    return null;
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

    const nativeFiles = await scanNativeSkillDirs(projectDir);
    const nativeSkills: Array<{
      id: string;
      name: string;
      audits?: AuditResult;
      installs?: number;
      stars?: number;
      source?: string;
      pack?: SkillPack;
      langs?: string[];
      triggers?: string[];
      always?: boolean;
    }> = [];
    const seenNames = new Set<string>();

    for (const filePath of nativeFiles) {
      const parsed = await parseNativeSkillFile(filePath);
      if (!parsed || seenNames.has(parsed.name)) continue;
      seenNames.add(parsed.name);
      nativeSkills.push({
        id: `native/${parsed.name}`,
        name: parsed.name,
        audits: parsed.audits,
        installs: parsed.installs,
        stars: parsed.stars,
        source: parsed.source,
        pack: parsed.pack,
        langs: parsed.langs,
        triggers: parsed.triggers,
        always: parsed.always,
      });
    }

    const catalog = await loadCatalog();
    const catalogIds = new Set(catalog.map((s) => s.id));

    let skillsBlocked = 0;
    const skillNodes: SkillNode[] = [];

    for (const item of catalog) {
      skillNodes.push({
        type: "skill",
        id: item.id,
        source: "catalog",
        audits: { gen: "pass", socket: "pass", snyk: "pass" },
        installs: 0,
        stars: 0,
        w: 0.8,
        ts: Date.now(),
        pack: item.pack,
        langs: item.langs,
        triggers: item.triggers,
        always: item.always,
        path: item.path,
      });
    }

    for (const native of nativeSkills) {
      if (catalogIds.has(native.id) || catalogIds.has(native.name)) continue;
      const audits = native.audits ?? { gen: "unknown", socket: "unknown", snyk: "unknown" };

      if (auditIsBlocked(audits)) {
        skillsBlocked++;
        continue;
      }

      const installs = native.installs ?? 0;
      const stars = native.stars ?? 0;

      skillNodes.push({
        type: "skill",
        id: native.id,
        source: native.source === "skills.sh" ? "routed" as const : "native" as const,
        audits,
        installs,
        stars,
        w: installs > 0 || stars > 0
          ? Math.max(normalizeInstalls(installs), normalizeStars(stars))
          : 0.8,
        ts: Date.now(),
        pack: native.pack,
        langs: native.langs,
        triggers: native.triggers,
        always: native.always,
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
      native_skills_found: nativeSkills.length,
      skills_discovered: catalog.length,
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
