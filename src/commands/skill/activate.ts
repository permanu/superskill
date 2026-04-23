// SPDX-License-Identifier: AGPL-3.0-or-later

import type { CommandContext } from "../../core/types.js";
import { loadGraph, writeGraph, findNode, findNodes } from "../../lib/graph/store.js";
import { matchTask } from "../../lib/graph/router.js";
import { loadNeighborhood, loadContent } from "../../lib/graph/loader.js";
import { startSession, recordActivation } from "../../lib/graph/learner.js";
import { getSkillBudget, fitSkillsToBudget } from "../../lib/context-budget.js";
import { findSkills } from "../../lib/skills-sh/cli.js";
import { getAudit, isStale, refreshAudit } from "../../lib/skills-sh/audit-cache.js";
import type { SkillNode, AuditResult, AuditStatus } from "../../lib/graph/schema.js";

export interface ActivateResult {
  success: boolean;
  skills_loaded: Array<{ id: string; source: string }>;
  content: string;
  matched_skill_ids: string[];
  total_tokens: number;
  warnings: string[];
  error?: string;
}

function auditIsBlocked(audits: AuditResult): boolean {
  const vals: AuditStatus[] = [audits.gen, audits.socket, audits.snyk];
  return vals.some((v) => v === "fail");
}

function auditIsWarn(audits: AuditResult): boolean {
  const vals: AuditStatus[] = [audits.gen, audits.socket, audits.snyk];
  return vals.some((v) => v === "warn");
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

    const budget = getSkillBudget();
    const contents = contentResult.skills.map((s) => s.content);
    const { included, usedTokens } = fitSkillsToBudget(contents, budget.totalBudget);

    const loadedSkills = included.map((i) => ({
      id: contentResult.skills[i].id,
      source: "graph",
    }));
    const finalContent = included.map((i) => contentResult.skills[i].content).join("\n\n---\n\n");

    let updatedGraph = graph;
    const { graph: sessionGraph, sessionId } = startSession(graph, task);
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
