// SPDX-License-Identifier: AGPL-3.0-or-later

import type { CommandContext } from "../../core/types.js";
import { loadGraph, writeGraph } from "../../lib/graph/store.js";
import { matchTask } from "../../lib/graph/router.js";
import { loadNeighborhood, loadContent } from "../../lib/graph/loader.js";
import { findOrCreateSession, recordActivation } from "../../lib/graph/learner.js";
import { getPhaseBudget, fitSkillsToBudget } from "../../lib/context-budget.js";
import { getPhaseForTask } from "../../lib/graph/router.js";
import { findSkills } from "../../lib/skills-sh/cli.js";
import { getAudit, isStale, refreshAudit } from "../../lib/skills-sh/audit-cache.js";
import { scanForPromptInjection } from "../../lib/security-scanner.js";
import { auditIsBlocked, auditIsWarn } from "../../lib/security-gate.js";
import type { SkillNode, AuditResult } from "../../lib/graph/schema.js";

export interface ActivateResult {
  success: boolean;
  skills_loaded: Array<{ id: string; source: string }>;
  content: string;
  matched_skill_ids: string[];
  total_tokens: number;
  warnings: string[];
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

    let matchedIds: string[];

    if (args.skill_id) {
      matchedIds = [args.skill_id];
    } else {
      matchedIds = matchTask(task, graph);

      if (matchedIds.length === 0 && task) {
        const discovered = await findSkills(task);
        if (discovered.length > 0) {
          matchedIds = discovered.slice(0, 3).map((s) => s.id);
        }
      }
    }

    if (matchedIds.length === 0) {
      return {
        success: true,
        skills_loaded: [],
        content: "No skills matched for this task. Try describing your task differently.",
        matched_skill_ids: [],
        total_tokens: 0,
        warnings: [],
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

    const phase = getPhaseForTask(task);
    const budget = getPhaseBudget(phase);
    const contents: string[] = [];
    const contentSkillIds: string[] = [];

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

    const loadedSkills = included.map((i) => ({
      id: contentSkillIds[i],
      source: "graph",
    }));
    const finalContent = included.map((i) => contents[i]).join("\n\n---\n\n");

    let updatedGraph = graph;
    const { graph: sessionGraph, sessionId } = findOrCreateSession(graph, task);
    updatedGraph = sessionGraph;
    for (const skillId of safeIds) {
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
