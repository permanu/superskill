import { assessWorktreeLifecycle, type WorktreeLifecycleAssessment } from "../../lib/worktree/lifecycle.js";
// SPDX-License-Identifier: Apache-2.0

import { packagedCatalogVersion } from "../../lib/catalog.js";
import { initProject, type InitResult } from "./init.js";
import type { CommandContext } from "../../core/types.js";
import { loadGraph, mutateGraph } from "../../lib/graph/store.js";
import { matchTask, alwaysOnSkillIds, getPhaseForTask, routingStack } from "../../lib/graph/router.js";
import { loadNeighborhood, loadContent, formatSystemBrief } from "../../lib/graph/loader.js";
import { findNode } from "../../lib/graph/store.js";
import { planDelegation, type Orchestration } from "../../lib/orchestrate.js";
import type { ProjectNode, ProjectPhase } from "../../lib/graph/schema.js";
import { findOrCreateSession, recordActivation } from "../../lib/graph/learner.js";
import { estimateTokens } from "../../lib/token-estimator.js";
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
import { findUnauditedInstalledSkills, UNAUDITED_MARKER } from "./status.js";

const FALLBACK_CONTEXT_WINDOW = 128_000;
const CONTENT_SEPARATOR = "\n\n---\n\n";

export interface ActivateArgs {
  task?: string;
  skill_id?: string;
  files?: string[];
  max_tokens?: number;
  session_id?: string;
  phase?: ProjectPhase;
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
  initialization?: Pick<InitResult, "success" | "graph_path" | "skills_discovered" | "error">;
  worktree?: WorktreeLifecycleAssessment & { workspacePath: string };
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
  graph_session_id?: string;
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

export function installedSkillNameForId(skillId: string): string | null {
  if (skillId.startsWith("native/")) return skillId.slice("native/".length);
  const at = skillId.indexOf("@");
  return at === -1 ? null : skillId.slice(at + 1);
}

export async function activateSkills(args: ActivateArgs, ctx: CommandContext, options: ActivateOptions = {}): Promise<ActivateResult> {
  const result = await activateSkillsContent(args, ctx, options);
  const workspacePath = ctx.workspacePath ?? process.cwd();
  const assessment = await assessWorktreeLifecycle(workspacePath, { phase: "activation" });
  return { ...result, worktree: { ...assessment, workspacePath } };
}

async function activateSkillsContent(
  args: ActivateArgs,
  ctx: CommandContext,
  options: ActivateOptions = {},
): Promise<ActivateResult> {
  const projectDir = ctx.workspacePath ?? process.cwd();
  const task = args.task ?? "";
  let initialization: ActivateResult["initialization"];

  try {
    if (args.phase !== undefined && !["explore", "implement", "review", "ship"].includes(args.phase)) {
      throw new Error("phase must be explore, implement, review, or ship");
    }
    if (args.max_tokens !== undefined && (!Number.isInteger(args.max_tokens) || args.max_tokens < 256 || args.max_tokens > 50_000)) {
      throw new Error("max_tokens must be an integer between 256 and 50000 (content budget)");
    }
    if (args.session_id !== undefined) {
      const session = await ctx.sessionRegistry.get(args.session_id);
      if (!session || session.status !== "active" || session.project !== (ctx.projectSlug ?? null)) throw new Error("session_id must identify an active session for this project");
    }
    let graph = await loadGraph(projectDir);
    if (graph.nodes.length === 0 || graph.catalogVersion !== packagedCatalogVersion) {
      if (ctx.projectSlug === null) throw new Error("Cannot initialize without a resolved project scope");
      const initialized = await initProject({}, ctx, { startup: true });
      initialization = {
        success: initialized.success,
        graph_path: initialized.graph_path,
        skills_discovered: initialized.skills_discovered,
        ...(initialized.error ? { error: initialized.error } : {}),
      };
      if (!initialized.success) throw new Error(`Graph initialization failed: ${initialized.error ?? "unknown error"}`);
      graph = await loadGraph(projectDir);
      if (graph.nodes.length === 0) throw new Error("Graph initialization failed: graph remains empty");
    }

    const phase = args.phase ?? getPhaseForTask(task);
    const project = findNode<ProjectNode>(graph, "project", "project");
    const stack = routingStack(project?.stack ?? [], args.files);
    const routingContext = { files: args.files, phase };
    const orchestration = planDelegation(task, stack, routingContext);
    const contextWindow = detectTool().contextWindow ?? FALLBACK_CONTEXT_WINDOW;
    const budget = getPhaseBudget(phase, contextWindow);

    if (args.max_tokens !== undefined) budget.totalBudget = args.max_tokens;

    const rulesIndex = options.rulesIndex ?? (await rulesIndexForProcess());
    const principlesIndex = options.principlesIndex ?? (await principlesIndexForProcess());
    const plan = route({ prompt: task, stack, files: args.files, phase }, rulesIndex, {
      budgetTokens: budget.totalBudget,
      principlesIndex,
    });
    const warnings: string[] = [];
    const missing: DroppedItem[] = [];
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
        missing.push({ id: rule.id, reason: "content unavailable", tokens: 0 });
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
        missing.push({ id: principle.id, reason: "content unavailable", tokens: 0 });
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

    const finalizePlans = (items: ReadonlyArray<{ id: string; tokens: number }>, dropped: DroppedItem[], usedTokens: number): void => {
      const included = new Set(items.map((item) => item.id));
      rulesPlan.selected = plan.rules.filter((rule) => included.has(rule.id));
      rulesPlan.explain = plan.explain.filter((entry) => included.has(entry.id)).map((entry) => {
        const rule = rulesIndex.byId.get(entry.id);
        return rule ? formatRuleDerivation(entry, rule) : `rule ${entry.id} selected`;
      });
      rulesPlan.budget.used = layerTokens(items, ruleIds);
      rulesPlan.dropped = [...plan.budget.dropped, ...missing.filter((item) => ruleIds.has(item.id)), ...dropped.filter((item) => ruleIds.has(item.id))];
      principlesPlan.selected = plan.principles.filter((entry) => included.has(entry.id));
      principlesPlan.explain = principlesPlan.selected.map((entry) => formatPrincipleDerivation(entry, principlesIndex.byId.get(entry.id)));
      principlesPlan.budget.used = layerTokens(items, principleIds);
      void recordTelemetryEvent(buildActivationEvent({
        tool: detectTool().tool, project: ctx.projectSlug ?? null, prompt: task, phase, stack,
        langs: plan.langs, budget: { allocated: budget.totalBudget, used: usedTokens },
        selected: rulesPlan.selected.map((entry) => entry.id),
        principles: principlesPlan.selected.map((entry) => entry.id),
        dropped: [...new Set([...plan.budget.dropped, ...missing, ...dropped].map((entry) => entry.id))],
        rulesTotal: rulesIndex.rules.length,
      }));
    };

    const graphSkillIds = new Set(
      graph.nodes.filter((n) => n.type === "skill").map((n) => n.id),
    );

    let matchedIds: string[];

    if (args.skill_id) {
      if (!graphSkillIds.has(args.skill_id)) {
        return {
          ...(initialization ? { initialization } : {}),
          success: false,
          skills_loaded: [],
          content: "",
          matched_skill_ids: [],
          total_tokens: 0,
          usedTokens: 0,
          allocatedTokens: budget.totalBudget,
          dropped: [],
          warnings: [`WARN: skill not in graph: ${args.skill_id}`],
          rules_plan: emptyRulesPlan(budget.totalBudget),
          principles_plan: emptyPrinciplesPlan(budget.totalBudget),
          error: `Skill not in graph: ${args.skill_id}`,
        };
      }
      matchedIds = [args.skill_id];
    } else {
      const matched = matchTask(task, graph, routingContext);
      const always = alwaysOnSkillIds(graph, task, routingContext);
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
        CONTENT_SEPARATOR,
      );
      finalizePlans(items, dropped, usedTokens);
      return {
        ...(initialization ? { initialization } : {}),
        success: true,
        skills_loaded: [],
        content: items.map((item) => item.content).join(CONTENT_SEPARATOR),
        matched_skill_ids: [],
        total_tokens: usedTokens,
        usedTokens,
        allocatedTokens: budget.totalBudget,
        dropped: [...plan.budget.dropped, ...missing, ...dropped],
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
        ...(initialization ? { initialization } : {}),
        success: false,
        skills_loaded: [],
        content: "",
        matched_skill_ids: matchedIds,
        total_tokens: 0,
        usedTokens: 0,
        allocatedTokens: budget.totalBudget,
        dropped: [],
        warnings,
        rules_plan: emptyRulesPlan(budget.totalBudget),
        principles_plan: emptyPrinciplesPlan(budget.totalBudget),
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
      CONTENT_SEPARATOR,
    );
    const isSkillItem = (id: string): boolean =>
      !id.startsWith("system/") && !ruleIds.has(id) && !principleIds.has(id);
    const loadedSkills = items
      .filter((item) => isSkillItem(item.id))
      .map((item) => ({
        id: item.id,
        source: "graph",
        ...(staleIds.has(item.id) ? { stale: true } : {}),
      }));

    if (loadedSkills.length > 0) {
      const unauditedInstalled = new Set(await findUnauditedInstalledSkills());
      for (const skill of loadedSkills) {
        const installedName = installedSkillNameForId(skill.id);
        if (installedName !== null && unauditedInstalled.has(installedName)) {
          warnings.push(
            `WARN: ${skill.id} was installed without a skills.sh audit (${UNAUDITED_MARKER}); treat it as untrusted until audited`,
          );
        }
      }
    }

    const finalContent = items.map((item) => item.content).join(CONTENT_SEPARATOR);

    if (args.skill_id && !loadedSkills.some((skill) => skill.id === args.skill_id)) {
      const reason = dropped.find((item) => item.id === args.skill_id)?.reason
        ?? warnings.find((warning) => warning.includes(args.skill_id!))
        ?? "content unavailable";
      const error = `Requested skill ${args.skill_id} was not delivered: ${reason}`;
      warnings.push(error);
      finalizePlans(items, dropped, usedTokens);
      return {
        ...(initialization ? { initialization } : {}),
        success: false,
        skills_loaded: [],
        content: finalContent,
        matched_skill_ids: safeIds,
        total_tokens: usedTokens,
        usedTokens,
        allocatedTokens: budget.totalBudget,
        dropped: [...plan.budget.dropped, ...missing, ...dropped],
        warnings,
        rules_plan: rulesPlan,
        principles_plan: principlesPlan,
        orchestration,
        error,
      };
    }

    let sessionId: string | undefined;
    await mutateGraph(projectDir, (latest) => {
      const session = findOrCreateSession(latest, task, args.session_id);
      sessionId = session.sessionId;
      let updated = session.graph;
      for (const skill of loadedSkills) updated = recordActivation(updated, session.sessionId, skill.id, args.files ?? []);
      return updated;
    });
    finalizePlans(items, dropped, usedTokens);

    return {
      ...(initialization ? { initialization } : {}),
      success: true,
      skills_loaded: loadedSkills,
      graph_session_id: sessionId,
      content: finalContent,
      matched_skill_ids: safeIds,
      total_tokens: usedTokens,
      usedTokens,
      allocatedTokens: budget.totalBudget,
      dropped: [...plan.budget.dropped, ...missing, ...dropped],
      warnings,
      rules_plan: rulesPlan,
      principles_plan: principlesPlan,
      orchestration,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[skill-activate] activateSkills failed: ${msg}`);
    return {
      ...(initialization ? { initialization } : {}),
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

export function compactActivationResult(result: ActivateResult) {
  const droppedIds = [...new Set(result.dropped.map((item) => item.id))];
  const warningPriority = (warning: string): number => /^BLOCKED:/i.test(warning) ? 0
    : /security|audit|untrusted|prompt injection/i.test(warning) ? 1 : 2;
  const selectedWarnings = [...result.warnings].sort((a, b) => warningPriority(a) - warningPriority(b)).slice(0, 3);
  const shorten = (text: string, limit: number): string => text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
  const dropped = droppedIds.slice(0, 8).map((id) => shorten(id, 160));
  const warnings = selectedWarnings.map((warning) => shorten(warning, 240));
  const diagnosticsTruncated = droppedIds.length > dropped.length || result.warnings.length > warnings.length
    || droppedIds.slice(0, 8).some((id) => id.length > 160)
    || selectedWarnings.some((warning) => warning.length > 240);
  const response = {
    success: result.success,
    ...(result.initialization ? { initialization: result.initialization } : {}),
    ...(result.worktree ? { worktree: result.worktree } : {}),
    content: result.content,
    skills_loaded: result.skills_loaded.map((skill) => skill.id),
    rules_loaded: result.rules_plan.selected.map((rule) => rule.id),
    principles_loaded: result.principles_plan.selected.map((principle) => principle.id),
    budget: {
      scope: "content" as const,
      allocated_tokens: result.allocatedTokens,
      content_estimated_tokens: estimateTokens(result.content),
      response_estimated_tokens: 0,
    },
    dropped,
    dropped_count: droppedIds.length,
    warnings,
    warnings_count: result.warnings.length,
    diagnostics_truncated: diagnosticsTruncated,
    ...(result.error ? { error: result.error } : {}),
    ...(result.graph_session_id ? { graph_session_id: result.graph_session_id } : {}),
  };
  for (let pass = 0; pass < 5; pass++) {
    const estimate = estimateTokens(JSON.stringify(response));
    if (estimate === response.budget.response_estimated_tokens) break;
    response.budget.response_estimated_tokens = estimate;
  }
  return response;
}
