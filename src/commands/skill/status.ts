// SPDX-License-Identifier: AGPL-3.0-or-later

import { join } from "node:path";
import type { CommandContext } from "../../core/types.js";
import { loadGraph } from "../../lib/graph/store.js";
import { findNodes, findNode } from "../../lib/graph/store.js";
import type { SkillNode, ProjectNode, SessionNode } from "../../lib/graph/schema.js";

export interface StatusResult {
  initialized: boolean;
  message?: string;
  project: { stack: string[]; tools: string[]; phase: string } | null;
  skills: Array<{
    id: string;
    source: string;
    w: number;
    audit_summary: string;
  }>;
  sessions: Array<{
    id: string;
    intent: string;
    skills: string[];
    outcome: string | null;
    ts: number;
  }>;
  total_activations: number;
  graph_path: string;
}

function auditSummary(audits: { gen: string; socket: string; snyk: string }): string {
  const vals = [audits.gen, audits.socket, audits.snyk];
  if (vals.some((v) => v === "fail")) return "blocked";
  if (vals.some((v) => v === "warn")) return "warn";
  if (vals.every((v) => v === "pass")) return "pass";
  return "unknown";
}

export async function statusCommand(
  _args: Record<string, unknown>,
  ctx: CommandContext,
): Promise<StatusResult> {
  const projectDir = process.cwd();
  const graph = await loadGraph(projectDir);

  if (graph.nodes.length === 0) {
    return {
      initialized: false,
      message: "No knowledge graph found. Run `superskill init` first to initialize this project.",
      project: null,
      skills: [],
      sessions: [],
      total_activations: 0,
      graph_path: join(projectDir, ".superskill", "graph.json"),
    };
  }

  const project = findNode<ProjectNode>(graph, "project", "project");
  const skills = findNodes<SkillNode>(graph, "skill")
    .sort((a, b) => b.w - a.w)
    .map((s) => ({
      id: s.id,
      source: s.source,
      w: Math.round(s.w * 1000) / 1000,
      audit_summary: auditSummary(s.audits),
    }));

  const sessions = findNodes<SessionNode>(graph, "session")
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 10)
    .map((s) => ({
      id: s.id,
      intent: s.intent,
      skills: s.skills,
      outcome: s.outcome,
      ts: s.ts,
    }));

  const totalActivations = graph.edges
    .filter((e) => e.type === "project_skill")
    .reduce((sum, e) => sum + (e as { activations: number }).activations, 0);

  return {
    initialized: true,
    project: project
      ? { stack: project.stack, tools: project.tools, phase: project.phase }
      : null,
    skills,
    sessions,
    total_activations: totalActivations,
    graph_path: join(projectDir, ".superskill", "graph.json"),
  };
}
