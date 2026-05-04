// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Graph, SkillNode, ProjectSkillEdge, ProjectPhase } from "./schema.js";
import { findNodes, findNode } from "./store.js";

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
  "as", "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "all", "both",
  "each", "few", "more", "most", "other", "some", "such", "no", "not",
  "only", "own", "same", "so", "than", "too", "very", "just", "because",
  "but", "and", "or", "if", "while", "about", "up", "that", "this",
  "it", "its", "my", "me", "i", "we", "our", "you", "your", "help",
  "get", "give", "make", "use", "want", "let", "try", "find", "show",
]);

function extractKeywords(task: string): string[] {
  return task
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function simpleStem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

function wordMatches(a: string, b: string): boolean {
  if (a === b) return true;
  return simpleStem(a) === simpleStem(b);
}

function extractSkillKeywords(skillId: string): string[] {
  const parts = skillId.toLowerCase().split(/[@\/\-_.]/);
  return parts.filter((p) => p.length > 2 && !STOPWORDS.has(p));
}

interface ScoredSkill {
  id: string;
  score: number;
}

export function matchTask(task: string, graph: Graph): string[] {
  const keywords = extractKeywords(task);
  if (keywords.length === 0) return [];

  const skills = findNodes<SkillNode>(graph, "skill");
  const projectEdges = graph.edges.filter(
    (e): e is ProjectSkillEdge => e.type === "project_skill",
  );
  const edgeMap = new Map(projectEdges.map((e) => [e.to, e]));

  const scored: ScoredSkill[] = [];

  for (const skill of skills) {
    const skillKws = extractSkillKeywords(skill.id);
    let matchScore = 0;

    for (const kw of keywords) {
      for (const sk of skillKws) {
        if (wordMatches(kw, sk)) {
          matchScore += 1.0;
        }
      }
    }

    if (matchScore === 0) continue;

    const edge = edgeMap.get(skill.id);
    const weight = edge ? edge.w : 0.1;
    const combinedScore = matchScore * 0.5 + weight * 0.3 + skill.w * 0.2;

    scored.push({ id: skill.id, score: combinedScore });
  }

  scored.sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored.slice(0, 3).map((s) => s.id);
  }

  const project = findNode<import("./schema.js").ProjectNode>(graph, "project", "project");
  if (project && project.stack.length > 0) {
    const stackDefaults = skills
      .filter((s) => {
        const skillKws = extractSkillKeywords(s.id);
        return project.stack.some((stackItem) =>
          skillKws.some((sk) => wordMatches(stackItem.toLowerCase(), sk)),
        );
      })
      .sort((a, b) => b.w - a.w);
    return stackDefaults.slice(0, 3).map((s) => s.id);
  }

  return [];
}

export function getPhaseForTask(task: string): ProjectPhase {
  const lower = task.toLowerCase();
  const reviewKeywords = ["review", "refactor", "clean", "fix", "bug", "test", "audit", "lint", "check"];
  const shipKeywords = ["deploy", "release", "ship", "publish", "bump", "tag", "version"];
  const implementKeywords = ["add", "build", "create", "implement", "write", "develop", "feature", "integrate"];
  const exploreKeywords = ["brainstorm", "explore", "research", "investigate", "discover", "plan", "design", "prototype", "spike"];

  if (shipKeywords.some((k) => lower.includes(k))) return "ship";
  if (reviewKeywords.some((k) => lower.includes(k))) return "review";
  if (implementKeywords.some((k) => lower.includes(k))) return "implement";
  if (exploreKeywords.some((k) => lower.includes(k))) return "explore";
  return "explore";
}

export function rankSkills(skillIds: string[], graph: Graph): string[] {
  const projectEdges = graph.edges.filter(
    (e): e is ProjectSkillEdge => e.type === "project_skill",
  );
  const edgeMap = new Map(projectEdges.map((e) => [e.to, e.w]));

  return [...skillIds].sort((a, b) => {
    const wA = edgeMap.get(a) ?? 0.1;
    const wB = edgeMap.get(b) ?? 0.1;
    return wB - wA;
  });
}
