// SPDX-License-Identifier: Apache-2.0

import type { CommandContext } from "../../core/types.js";
import { loadGraph, writeGraph } from "../../lib/graph/store.js";
import { matchTask, alwaysOnSkillIds, getPhaseForTask } from "../../lib/graph/router.js";
import { loadNeighborhood, loadContent, formatSystemBrief } from "../../lib/graph/loader.js";
import { findNode } from "../../lib/graph/store.js";
import { planDelegation, type Orchestration } from "../../lib/orchestrate.js";
import type { ProjectNode } from "../../lib/graph/schema.js";
import { findOrCreateSession, recordActivation } from "../../lib/graph/learner.js";
import { getPhaseBudget, fitSkillsToBudget } from "../../lib/context-budget.js";
import type { BudgetItem, DroppedItem } from "../../lib/context-budget.js";
import { scanForPromptInjection } from "../../lib/security-scanner.js";
import { auditIsBlocked, auditIsWarn } from "../../lib/security-gate.js";
import { detectTool } from "../../lib/tool-detector.js";
import { loadRuleContent, loadPrincipleContent, type PrincipleContent, type RuleContent } from "../../rules/content.js";
import { formatRuleDerivation } from "../../rules/explain.js";
import { buildIndex } from "../../rules/index-builder.js";
import type { RulesIndex } from "../../rules/index-builder.js";
import { loadRules, rulesCatalogRoot } from "../../rules/loader.js";
import type { PlanDrop, PlannedPrinciple, PlannedRule } from "../../rules/plan.js";
import {
  buildPrincipleIndex,
  formatPrincipleDerivation,
  loadPrinciples,
  principlesCatalogRoot,
} from "../../rules/principles.js";
import type { ParsedPrinciple, PrinciplesIndex } from "../../rules/principles.js";
import { route } from "../../rules/router.js";
import { buildActivationEvent, recordTelemetryEvent } from "../../telemetry/recorder.js";

const FALLBACK_CONTEXT_WINDOW = 128_000;

export interface ActivateArgs {
  task?: string;
  skill_id?: string;
  files?: string[];
}

export interface ActivateOptions {
  rulesIndex?: RulesIndex;
  rulesRoot?: string;
  principlesIndex?: PrinciplesIndex;
  principlesRoot?: string;
}

export interface RulesPlan {
  selected: PlannedRule[];
  explain: string[];
  dropped: PlanDrop[];
  budget: { allocated: number; used: number };
}

export interface PrinciplesPlan {
  selected: PlannedPrinciple[];
  explain: string[];
  budget: { allocated: number; used: number };
}

export interface ActivateResult {
  success: boolean;
  skills_loaded: Array<{ id: string; source: string; stale?: boolean }>;
  content: string;
  matched_skill_ids: string[];
  total_tokens: number;
  usedTokens: number;
  allocatedTokens: number;
  dropped: DroppedItem[];
  warnings: string[];
  rules_plan: RulesPlan;
  principles_plan: PrinciplesPlan;
  orchestration?: Orchestration;
  error?: string;
}

let cachedRulesIndex: Promise<RulesIndex> | undefined;
let cachedPrinciplesIndex: Promise<PrinciplesIndex> | undefined;

async function rulesIndexForProcess(): Promise<RulesIndex> {
  if (cachedRulesIndex === undefined) {
    cachedRulesIndex = loadRules()
      .then(({ rules, warnings }) => {
        for (const warning of warnings) {
          console.error(`[skill-activate] rule load warning: ${warning.path}: ${warning.message}`);
        }
        return buildIndex(rules);
      })
      .catch((error: unknown) => {
        cachedRulesIndex = undefined;
        throw error;
      });
  }
  return cachedRulesIndex;
}

async function principlesIndexForProcess(): Promise<PrinciplesIndex> {
  if (cachedPrinciplesIndex === undefined) {
    cachedPrinciplesIndex = loadPrinciples()
      .then(({ principles, warnings }) => {
        for (const warning of warnings) {
          console.error(`[skill-activate] principle load warning: ${warning.path}: ${warning.message}`);
        }
        return buildPrincipleIndex(principles);
      })
      .catch((error: unknown) => {
        cachedPrinciplesIndex = undefined;
        throw error;
      });
  }
  return cachedPrinciplesIndex;
}

export function resetRulesIndexCache(): void {
  cachedRulesIndex = undefined;
}

export function resetPrinciplesIndexCache(): void {
  cachedPrinciplesIndex = undefined;
}

function emptyRulesPlan(allocated = 0): RulesPlan {
  return { selected: [], explain: [], dropped: [], budget: { allocated, used: 0 } };
}

function emptyPrinciplesPlan(allocated = 0): PrinciplesPlan {
  return { selected: [], explain: [], budget: { allocated, used: 0 } };
}

function formatRuleBlock(id: string, rule: RuleContent): string {
  return `## Rule ${id}: ${rule.title}\n\n${rule.body.trim()}`;
}

function formatPrincipleBlock(
  id: string,
  principle: ParsedPrinciple | undefined,
  content: PrincipleContent,
): string {
  const head = `## Principle ${id}: ${content.title}`;
  const gate = principle?.applyWhen;
  return gate === undefined || gate.length === 0
    ? `${head}\n\n${content.body.trim()}`
    : `${head}\n\n${gate}\n\n${content.body.trim()}`;
}

function layerTokens(items: ReadonlyArray<{ id: string; tokens: number }>, ids: ReadonlySet<string>): number {
  let used = 0;
  for (const item of items) {
    if (ids.has(item.id)) used += item.tokens;
  }
  return used;
}

export async function activateSkills(
  args: ActivateArgs,
  ctx: CommandContext,
  options: ActivateOptions = {},
): Promise<ActivateResult> {
  const projectDir = process.cwd();
  const task = args.task ?? "";

  try {
    const graph = await loadGraph(projectDir);

    if (graph.nodes.length === 0) {
      return {
        success: false,
        skills_loaded: [],
        content: "No knowledge graph found. Run `superskill skill init` first.",
        matched_skill_ids: [],
        total_tokens: 0,
        usedTokens: 0,
        allocatedTokens: 0,
        dropped: [],
        warnings: [],
        rules_plan: emptyRulesPlan(),
        principles_plan: emptyPrinciplesPlan(),
        error: "Graph not initialized. Run `superskill skill init` first.",
      };
    }

    const phase = getPhaseForTask(task);
    const project = findNode<ProjectNode>(graph, "project", "project");
    const stack = project?.stack ?? [];
    const orchestration = planDelegation(task, stack);
    const contextWindow = detectTool().contextWindow ?? FALLBACK_CONTEXT_WINDOW;
    const budget = getPhaseBudget(phase, contextWindow);

    const rulesIndex = options.rulesIndex ?? (await rulesIndexForProcess());
    const principlesIndex = options.principlesIndex ?? (await principlesIndexForProcess());
    const plan = route({ prompt: task, stack, files: args.files }, rulesIndex, {
      budgetTokens: budget.totalBudget,
      principlesIndex,
    });
    const warnings: string[] = [];
    const ruleContents = await loadRuleContent(
      plan.rules.map((rule) => rule.id),
      options.rulesRoot ?? rulesCatalogRoot(),
    );
    const ruleItems: BudgetItem[] = [];
    const ruleIds = new Set<string>();
    for (const rule of plan.rules) {
      ruleIds.add(rule.id);
      const content = ruleContents.get(rule.id);
      if (content === undefined) {
        warnings.push(`WARN: rule content not found: ${rule.id}`);
        continue;
      }
      ruleItems.push({ id: rule.id, content: formatRuleBlock(rule.id, content) });
    }
    const rulesPlan: RulesPlan = {
      selected: plan.rules,
      explain: plan.explain.map((entry) => {
        const rule = rulesIndex.byId.get(entry.id);
        return rule === undefined
          ? `rule ${entry.id} selected: ${entry.matched.join(", ")}`
          : formatRuleDerivation(entry, rule);
      }),
      dropped: plan.budget.dropped,
      budget: { allocated: plan.budget.allocated, used: plan.budget.used },
    };

    const principleContents = await loadPrincipleContent(
      plan.principles.map((principle) => principle.id),
      options.principlesRoot ?? principlesCatalogRoot(),
    );
    const principleItems: BudgetItem[] = [];
    const principleIds = new Set<string>();
    for (const principle of plan.principles) {
      principleIds.add(principle.id);
      const content = principleContents.get(principle.id);
      if (content === undefined) {
        warnings.push(`WARN: principle content not found: ${principle.id}`);
        continue;
      }
      principleItems.push({
        id: principle.id,
        content: formatPrincipleBlock(principle.id, principlesIndex.byId.get(principle.id), content),
      });
    }
    const principlesPlan: PrinciplesPlan = {
      selected: plan.principles,
      explain: plan.principles.map((entry) =>
        formatPrincipleDerivation(entry, principlesIndex.byId.get(entry.id)),
      ),
      budget: { allocated: budget.totalBudget, used: 0 },
    };

    // Local, opt-in telemetry: no-op unless `superskill telemetry enable`
    // (or SUPERSKILL_TELEMETRY=1) was set. Designed never to fail the caller.
    void recordTelemetryEvent(
      buildActivationEvent({
        tool: detectTool().tool,
        project: ctx.projectSlug ?? null,
        prompt: task,
        phase,
        stack,
        langs: plan.langs,
        budget: { allocated: plan.budget.allocated, used: plan.budget.used },
        selected: plan.rules.map((rule) => rule.id),
        principles: plan.principles.map((principle) => principle.id),
        dropped: plan.budget.dropped.map((drop) => drop.id),
        rulesTotal: rulesIndex.rules.length,
      }),
    );

    const graphSkillIds = new Set(
      graph.nodes.filter((n) => n.type === "skill").map((n) => n.id),
    );

    let matchedIds: string[];

    if (args.skill_id) {
      if (!graphSkillIds.has(args.skill_id)) {
        return {
          success: false,
          skills_loaded: [],
          content: `Skill not found in this project's graph: ${args.skill_id}`,
          matched_skill_ids: [],
          total_tokens: 0,
          usedTokens: 0,
          allocatedTokens: budget.totalBudget,
          dropped: [],
          warnings: [`WARN: skill not in graph: ${args.skill_id}`],
          rules_plan: rulesPlan,
          principles_plan: principlesPlan,
          error: `Skill not in graph: ${args.skill_id}`,
        };
      }
      matchedIds = [args.skill_id];
    } else {
      const matched = matchTask(task, graph);
      const always = alwaysOnSkillIds(graph, task);
      const delegated = orchestration.specialists
        .map((s) => s.pack)
        .filter((id) => graphSkillIds.has(id));
      matchedIds = [...new Set([...always, ...matched, ...delegated])];
    }
    const orchMd = `## Orchestration\n\n\`\`\`json\n${JSON.stringify(orchestration, null, 2)}\n\`\`\``;

    if (matchedIds.length === 0) {
      const brief = formatSystemBrief(graph, loadNeighborhood(graph, []), phase, task);
      const { items, dropped, usedTokens } = fitSkillsToBudget(
        [
          { id: "system/brief", content: brief },
          { id: "system/orchestration", content: orchMd },
          ...principleItems,
          ...ruleItems,
        ],
        budget.totalBudget,
      );
      principlesPlan.budget.used = layerTokens(items, principleIds);
      return {
        success: true,
        skills_loaded: [],
        content: items.map((item) => item.content).join("\n\n---\n\n"),
        matched_skill_ids: [],
        total_tokens: usedTokens,
        usedTokens,
        allocatedTokens: budget.totalBudget,
        dropped,
        warnings,
        rules_plan: rulesPlan,
        principles_plan: principlesPlan,
        orchestration,
      };
    }

    const neighborhood = loadNeighborhood(graph, matchedIds);

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
        usedTokens: 0,
        allocatedTokens: budget.totalBudget,
        dropped: [],
        warnings,
        rules_plan: rulesPlan,
        principles_plan: principlesPlan,
        error: "All skills blocked by security audit",
      };
    }

    const contentResult = await loadContent(projectDir, safeIds);
    warnings.push(...contentResult.warnings);

    const staleIds = new Set(
      contentResult.skills.filter((s) => s.stale).map((s) => s.id),
    );

    const brief = formatSystemBrief(graph, neighborhood, phase, task);
    const budgetItems: BudgetItem[] = [
      { id: "system/brief", content: brief },
      { id: "system/orchestration", content: orchMd },
      ...principleItems,
      ...ruleItems,
    ];

    for (const skill of contentResult.skills) {
      const scanResult = scanForPromptInjection(skill.content);
      if (scanResult.blocked) {
        warnings.push(`BLOCKED: ${skill.id} — ${scanResult.reason}`);
        continue;
      }
      for (const w of scanResult.warnings) {
        warnings.push(`WARN: ${skill.id} — ${w}`);
      }
      budgetItems.push({ id: skill.id, content: skill.content });
    }

    const { items, dropped, usedTokens } = fitSkillsToBudget(
      budgetItems,
      budget.totalBudget,
    );
    principlesPlan.budget.used = layerTokens(items, principleIds);

    const isSkillItem = (id: string): boolean =>
      !id.startsWith("system/") && !ruleIds.has(id) && !principleIds.has(id);
    const loadedSkills = items
      .filter((item) => isSkillItem(item.id))
      .map((item) => ({
        id: item.id,
        source: "graph",
        ...(staleIds.has(item.id) ? { stale: true } : {}),
      }));
    const finalContent = items.map((item) => item.content).join("\n\n---\n\n");

    let updatedGraph = graph;
    const { graph: sessionGraph, sessionId } = findOrCreateSession(graph, task);
    updatedGraph = sessionGraph;
    for (const item of items) {
      if (!isSkillItem(item.id)) continue;
      updatedGraph = recordActivation(updatedGraph, sessionId, item.id, []);
    }
    await writeGraph(projectDir, updatedGraph);

    return {
      success: true,
      skills_loaded: loadedSkills,
      content: finalContent,
      matched_skill_ids: safeIds,
      total_tokens: usedTokens,
      usedTokens,
      allocatedTokens: budget.totalBudget,
      dropped,
      warnings,
      rules_plan: rulesPlan,
      principles_plan: principlesPlan,
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
      usedTokens: 0,
      allocatedTokens: 0,
      dropped: [],
      warnings: [],
      rules_plan: emptyRulesPlan(),
      principles_plan: emptyPrinciplesPlan(),
      error: msg,
    };
  }
}
