// SPDX-License-Identifier: Apache-2.0

import { MAX_SKILL_FILE_BYTES, readBoundedSkillFile } from "../catalog.js";
import { parseSkillId, resolveSkillSource } from "../skill-source.js";
import { inspectSkillTrust } from "../skill-trust.js";
import { logDiagnostic } from "../safe-diagnostics.js";
import { taskHistoryLabel } from "./privacy.js";
import type { ResolvedSkillSource } from "../skill-source.js";
import type {
  Graph,
  SkillNode,
  SessionNode,
  SkillSkillEdge,
  IndexResult,
  NeighborhoodResult,
  ContentResult,
  ProjectPhase,
} from "./schema.js";
import { findNode, findNodes } from "./store.js";

export { parseSkillId } from "../skill-source.js";
export type { ParsedSkillId } from "../skill-source.js";

export function loadIndex(graph: Graph): IndexResult {
  const project = findNode<import("./schema.js").ProjectNode>(graph, "project", "project");
  const projectData = project
    ? { stack: project.stack, tools: project.tools, phase: project.phase }
    : { stack: [] as string[], tools: [] as string[], phase: "explore" as const };

  const skills = findNodes<SkillNode>(graph, "skill").map((s) => ({
    id: s.id,
    w: s.w,
    audits: s.audits,
  }));

  const skillSkillEdges = graph.edges.filter(
    (e): e is SkillSkillEdge => e.type === "skill_skill",
  );
  const topCoActivations = [...skillSkillEdges]
    .sort((a, b) => b.w - a.w)
    .slice(0, 10)
    .map((e) => ({ from: e.from, to: e.to, w: e.w }));

  return { project: projectData, skills, topCoActivations };
}

/**
 * Compact vertical (this project) + horizontal (sessions, co-activations) snapshot.
 * Review/security consume this instead of a generic checklist dump.
 */
export function formatSystemBrief(
  graph: Graph,
  neighborhood: NeighborhoodResult,
  phase: ProjectPhase,
  task: string,
): string {
  const index = loadIndex(graph);
  const sessions = findNodes<SessionNode>(graph, "session")
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 3);

  const lines: string[] = [
    `# System brief`,
    `Task: ${task ? taskHistoryLabel(task).slice(0, 160) : "(none)"}`,
    `Phase: ${phase}`,
    `Vertical (this repo): stack=[${index.project.stack.join(", ") || "unknown"}] tools=[${index.project.tools.join(", ") || "unknown"}]`,
    `Indexed skills: ${index.skills.length} (catalog/graph — not a remote dump)`,
  ];

  if (sessions.length > 0) {
    lines.push("Recent sessions (keep this model current):");
    for (const s of sessions) {
      const insight = s.insights[0] ? ` | ${s.insights[0]}` : "";
      lines.push(`- ${taskHistoryLabel(s.intent).slice(0, 120)} [${s.skills.slice(0, 4).join(", ")}] ${s.outcome ?? "open"}${insight}`.slice(0, 220));
    }
  } else {
    lines.push("Recent sessions: none. After work, session complete + learn so the next review is not blind.");
  }

  const co = neighborhood.coActivatedSkills.slice(0, 5);
  if (co.length > 0) {
    lines.push(`Horizontal co-activations: ${co.map((s) => s.id).join(", ")}`);
  } else if (index.topCoActivations.length > 0) {
    lines.push(`Horizontal co-activations: ${index.topCoActivations.slice(0, 5).map((e) => `${e.from}~${e.to}`).join(", ")}`);
  }

  lines.push(
    "Worktree caches: use MCP worktree_status / worktree_audit; worktree_activate installs the shared-cache policy (consent first).",
  );

  if (
    (phase === "review" || phase === "ship") &&
    (/\b(review|diff|audit|pr|defect|critique)\b/i.test(task) ||
      (/\b(security|cve|xss|authz)\b/i.test(task) && /\b(fix|bug|patch)\b/i.test(task)))
  ) {
    lines.push(
      "Review/security protocol: do not judge from the diff or a generic OWASP list. Call `project_context` (full), `resume`, `search` (this project only, ADRs + learnings), then walk every caller of a changed symbol. If the system model changed, `learn add` before you finish.",
    );
  }

  return lines.join("\n");
}

export function loadNeighborhood(
  graph: Graph,
  skillIds: string[],
): NeighborhoodResult {
  const skillSet = new Set(skillIds);
  const skillById = new Map(
    findNodes<SkillNode>(graph, "skill").map((s) => [s.id, s]),
  );
  const matchedSkills: NeighborhoodResult["matchedSkills"] = [];
  const matchedIds = new Set<string>();
  for (const id of skillIds) {
    if (matchedIds.has(id)) continue;
    matchedIds.add(id);
    const skill = skillById.get(id);
    if (!skill) continue;
    matchedSkills.push({
      id: skill.id,
      source: skill.source,
      audits: skill.audits,
      w: skill.w,
      installs: skill.installs,
      stars: skill.stars,
    });
  }

  const coActivatedSkills: Array<{ id: string; w: number }> = [];
  const seen = new Set<string>();
  const skillSkillEdges = graph.edges.filter(
    (e): e is SkillSkillEdge => e.type === "skill_skill",
  );
  for (const edge of skillSkillEdges) {
    if (skillSet.has(edge.from) && !seen.has(edge.to) && !skillSet.has(edge.to)) {
      coActivatedSkills.push({ id: edge.to, w: edge.w });
      seen.add(edge.to);
    }
    if (skillSet.has(edge.to) && !seen.has(edge.from) && !skillSet.has(edge.from)) {
      coActivatedSkills.push({ id: edge.from, w: edge.w });
      seen.add(edge.from);
    }
  }
  coActivatedSkills.sort((a, b) => b.w - a.w);

  const allSessions = findNodes<SessionNode>(graph, "session");
  const recentSessions = allSessions
    .filter((s) => s.skills.some((sk) => skillSet.has(sk)))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 3)
    .map((s) => ({
      id: s.id,
      intent: s.intent,
      skills: s.skills,
      outcome: s.outcome,
      insights: s.insights,
      ts: s.ts,
    }));

  return { matchedSkills, coActivatedSkills, recentSessions };
}

const SKILL_CACHE_STALE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CONTENT_SKILLS = 128;
const MAX_CONTENT_BYTES = 8 * MAX_SKILL_FILE_BYTES;

function logReadError(error: unknown): void {
  const code = (error as NodeJS.ErrnoException).code;
  if (code !== "ENOENT" && code !== "ENOTDIR") logDiagnostic("skill.source-read-failed", error);
}

export async function loadContent(
  projectDir: string,
  skillIds: string[],
): Promise<ContentResult> {
  const skills: ContentResult["skills"] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  let remainingBytes = MAX_CONTENT_BYTES;
  if (skillIds.length > MAX_CONTENT_SKILLS) warnings.push(`WARN: skill content request limit exceeded (${MAX_CONTENT_SKILLS} ids)`);

  for (const skillId of skillIds.slice(0, MAX_CONTENT_SKILLS)) {
    if (remainingBytes <= 0) {
      warnings.push(`WARN: skill content total size limit reached (${MAX_CONTENT_BYTES} bytes)`);
      break;
    }
    if (seen.has(skillId)) continue;
    seen.add(skillId);
    const parsed = parseSkillId(skillId);
    if (!parsed) {
      warnings.push(`WARN: invalid skill id rejected: ${String(skillId).slice(0, 160)}`);
      continue;
    }
    let content: string | null = null;
    let stale = false;

    let resolved: ResolvedSkillSource | null;
    try {
      resolved = await resolveSkillSource(projectDir, skillId);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (parsed.source !== "catalog" && code !== "ENOENT" && code !== "ENOTDIR") {
        warnings.push(`WARN: ${skillId} — source inspection failed`);
      }
      logReadError(error);
      warnings.push(`MISSING: ${skillId} — content unavailable`);
      continue;
    }

    if (!resolved) {
      warnings.push(`MISSING: ${skillId} — content unavailable`);
      continue;
    }

    try {
      const { bytes, mtimeMs } = await readBoundedSkillFile(resolved.file, resolved.allowedRoots, Math.min(remainingBytes, MAX_SKILL_FILE_BYTES));
      remainingBytes -= bytes.length;
      stale = resolved.source === "cache" && Date.now() - mtimeMs > SKILL_CACHE_STALE_MS;
      content = bytes.toString("utf-8");
      if (stale) {
        warnings.push(`WARN: ${skillId} — stale skill-cache (>7 days); served cached content`);
      }
    } catch (error) {
      logReadError(error);
      const code = (error as NodeJS.ErrnoException).code;
      if (parsed.source !== "catalog" && code !== "ENOENT" && code !== "ENOTDIR") {
        warnings.push(`WARN: ${skillId} — source size, stability or access checks failed`);
      }
      warnings.push(`MISSING: ${skillId} — content unavailable`);
    }

    if (content !== null) {
      const trust = await inspectSkillTrust(resolved, resolved.file, content);
      if (!trust.allowed) {
        warnings.push(`BLOCKED: ${skillId} — ${trust.reason}`);
        continue;
      }
      skills.push({ id: skillId, content, trust, ...(stale ? { stale: true } : {}) });
    }
  }

  return { skills, warnings };
}
