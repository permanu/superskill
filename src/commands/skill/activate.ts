// SPDX-License-Identifier: AGPL-3.0-or-later

import type { CommandContext } from "../../core/types.js";
import { loadGraph, writeGraph } from "../../lib/graph/store.js";
import { matchTask, alwaysOnSkillIds, getPhaseForTask } from "../../lib/graph/router.js";
import { loadNeighborhood, loadContent, formatSystemBrief } from "../../lib/graph/loader.js";
import { findNode } from "../../lib/graph/store.js";
import { planDelegation, type Orchestration } from "../../lib/orchestrate.js";
import type { ProjectNode } from "../../lib/graph/schema.js";
import { findOrCreateSession, recordActivation } from "../../lib/graph/learner.js";
import { getPhaseBudget, fitSkillsToBudget } from "../../lib/context-budget.js";
import { scanForPromptInjection } from "../../lib/security-scanner.js";
import { auditIsBlocked, auditIsWarn } from "../../lib/security-gate.js";


export interface ActivateResult {
  success: boolean;
  skills_loaded: Array<{ id: string; source: string }>;
  content: string;
  matched_skill_ids: string[];
  total_tokens: number;
  warnings: string[];
  orchestration?: Orchestration;
  error?: string;
}

export async function activateSkills(
  args: { task?: string; skill_id?: string },
  ctx: CommandContext,
): Promise<ActivateResult> {
  const projectDir = process.cwd();
  const task = args.task ?? "";

  try {
    const graph = await loadGraph(projectDir);

    if (graph.nodes.length === 0) {
      return {
        success: false,
        skills_loaded: [],
        content: "No knowledge graph found. Run `superskill init` first.",
        matched_skill_ids: [],
        total_tokens: 0,
        warnings: [],
        error: "Graph not initialized. Run `superskill init` first.",
      };
    }

    const phase = getPhaseForTask(task);
    const project = findNode<ProjectNode>(graph, "project", "project");
    const orchestration = planDelegation(task, project?.stack ?? []);

    let matchedIds: string[];

    if (args.skill_id) {
      matchedIds = [args.skill_id];
    } else {
      const matched = matchTask(task, graph);
      const always = alwaysOnSkillIds(graph, task);
      const known = new Set(
        graph.nodes.filter((n) => n.type === "skill").map((n) => n.id),
      );
      const delegated = orchestration.specialists
        .map((s) => s.pack)
        .filter((id) => known.has(id));
      matchedIds = [...new Set([...always, ...matched, ...delegated])];
    }
    const orchMd = `## Orchestration\n\n\`\`\`json\n${JSON.stringify(orchestration, null, 2)}\n\`\`\``;

    if (matchedIds.length === 0) {
      const brief = formatSystemBrief(graph, loadNeighborhood(graph, []), phase, task);
      return {
        success: true,
        skills_loaded: [],
        content: `${brief}\n\n${orchMd}`,
        matched_skill_ids: [],
        total_tokens: 0,
        warnings: [],
        orchestration,
      };
    }

    const neighborhood = loadNeighborhood(graph, matchedIds);
    const warnings: string[] = [];

    const safeIds: string[] = [];
    for (const skill of neighborhood.matchedSkills) {
      if (auditIsBlocked(skill.audits)) {
        warnings.push(`BLOCKED: ${skill.id} failed security audit`);
        continue;
      }
      if (auditIsWarn(skill.audits)) {
        warnings.push(`WARN: ${skill.id} has medium-risk audit findings`);
      }
      safeIds.push(skill.id);
    }

    if (safeIds.length === 0) {
      return {
        success: false,
        skills_loaded: [],
        content: "All matched skills were blocked by security audit.",
        matched_skill_ids: matchedIds,
        total_tokens: 0,
        warnings,
        error: "All skills blocked by security audit",
      };
    }

    const contentResult = await loadContent(projectDir, safeIds);

    const budget = getPhaseBudget(phase);
    const brief = formatSystemBrief(graph, neighborhood, phase, task);
    const contents: string[] = [brief, orchMd];
    const contentSkillIds: string[] = ["system/brief", "system/orchestration"];

    for (const skill of contentResult.skills) {
      const scanResult = scanForPromptInjection(skill.content);
      if (scanResult.blocked) {
        warnings.push(`BLOCKED: ${skill.id} — ${scanResult.reason}`);
        continue;
      }
      for (const w of scanResult.warnings) {
        warnings.push(`WARN: ${skill.id} — ${w}`);
      }
      contents.push(skill.content);
      contentSkillIds.push(skill.id);
    }

    const { included, usedTokens } = fitSkillsToBudget(contents, budget.totalBudget);

    const loadedSkills = included
      .filter((i) => !contentSkillIds[i].startsWith("system/"))
      .map((i) => ({
        id: contentSkillIds[i],
        source: "graph",
      }));
    const finalContent = included.map((i) => contents[i]).join("\n\n---\n\n");

    let updatedGraph = graph;
    const { graph: sessionGraph, sessionId } = findOrCreateSession(graph, task);
    updatedGraph = sessionGraph;
    for (const skillId of contentSkillIds) {
      if (skillId.startsWith("system/")) continue;
      updatedGraph = recordActivation(updatedGraph, sessionId, skillId, []);
    }
    await writeGraph(projectDir, updatedGraph);

    return {
      success: true,
      skills_loaded: loadedSkills,
      content: finalContent,
      matched_skill_ids: safeIds,
      total_tokens: usedTokens,
      warnings,
      orchestration,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[skill-activate] activateSkills failed: ${msg}`);
    return {
      success: false,
      skills_loaded: [],
      content: "",
      matched_skill_ids: [],
      total_tokens: 0,
      warnings: [],
      error: msg,
    };
  }
}
