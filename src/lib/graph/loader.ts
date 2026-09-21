// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { catalogFile } from "../catalog.js";
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
    `Task: ${task.slice(0, 160) || "(none)"}`,
    `Phase: ${phase}`,
    `Vertical (this repo): stack=[${index.project.stack.join(", ") || "unknown"}] tools=[${index.project.tools.join(", ") || "unknown"}]`,
    `Indexed skills: ${index.skills.length} (catalog/graph — not a remote dump)`,
  ];

  if (sessions.length > 0) {
    lines.push("Recent sessions (keep this model current):");
    for (const s of sessions) {
      const insight = s.insights[0] ? ` | ${s.insights[0]}` : "";
      lines.push(`- ${s.intent.slice(0, 120)} [${s.skills.slice(0, 4).join(", ")}] ${s.outcome ?? "open"}${insight}`.slice(0, 220));
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

  if (
    (phase === "review" || phase === "ship") &&
    (/\b(review|diff|audit|pr)\b/i.test(task) ||
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
  const allSkills = findNodes<SkillNode>(graph, "skill");
  const matchedSkills = allSkills
    .filter((s) => skillSet.has(s.id))
    .map((s) => ({
      id: s.id,
      source: s.source,
      audits: s.audits,
      w: s.w,
      installs: s.installs,
      stars: s.stars,
    }));

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

export async function loadContent(
  projectDir: string,
  skillIds: string[],
): Promise<ContentResult> {
  const skills: ContentResult["skills"] = [];

  for (const skillId of skillIds) {
    let content: string | null = null;

    if (!skillId.includes("@") && skillId.includes("/")) {
      try {
        const raw = await readFile(catalogFile(skillId), "utf-8");
        content = compressContent(raw);
      } catch {
        console.error(`[graph-loader] catalog skill not found: ${skillId}`);
      }
    } else if (skillId.startsWith("native/")) {
      const skillName = skillId.slice("native/".length);
      const nativePaths = [
        join(projectDir, ".agents", "skills", skillName, "SKILL.md"),
        join(projectDir, ".superskill", "skills", skillName, "SKILL.md"),
        join(projectDir, ".claude", "skills", skillName, "SKILL.md"),
      ];
      for (const nativePath of nativePaths) {
        try {
          const raw = await readFile(nativePath, "utf-8");
          content = compressContent(raw);
          break;
        } catch {
          continue;
        }
      }
      if (content === null) {
        console.error(`[graph-loader] native skill content not found: ${skillId}`);
      }
    } else {
      const parts = skillId.split("@");
      if (parts.length < 2) continue;
      const ownerRepo = parts[0];
      const skillName = parts.slice(1).join("@");
      const ownerRepoParts = ownerRepo.split("/");
      if (ownerRepoParts.length < 2) continue;
      const owner = ownerRepoParts[0];
      const repo = ownerRepoParts.slice(1).join("/");

      const localPath = join(projectDir, ".superskill", "skill-cache", owner, repo, skillName, "SKILL.md");

      try {
        const fileStat = await stat(localPath);
        if (Date.now() - fileStat.mtimeMs > SKILL_CACHE_STALE_MS) {
          console.error(`[graph-loader] stale cache for skill: ${skillId} (${localPath})`);
        } else {
          const raw = await readFile(localPath, "utf-8");
          content = compressContent(raw);
        }
      } catch {
        console.error(`[graph-loader] content not found for skill: ${skillId}`);
      }
    }

    if (content !== null) {
      skills.push({ id: skillId, content });
    }
  }

  return { skills };
}

function compressContent(content: string): string {
  let result = content;
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    const lines = match.split("\n");
    if (lines.length <= 5) return match;
    const header = lines[0];
    const footer = lines[lines.length - 1];
    const kept = lines.slice(1, 4).join("\n");
    return `${header}\n${kept}\n// ... (${lines.length - 4} lines truncated)\n${footer}`;
  });
  result = result.replace(/\n{3,}/g, "\n\n");
  return result.trim();
}
