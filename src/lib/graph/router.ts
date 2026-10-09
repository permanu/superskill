// SPDX-License-Identifier: Apache-2.0

import type { Graph, SkillNode, ProjectSkillEdge, ProjectPhase, SkillPack, ProjectNode } from "./schema.js";
import { findNodes, findNode } from "./store.js";
import { inferPhase } from "../../rules/router.js";

const LANG_ALIAS: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  py: "python",
  golang: "go",
  rs: "rust",
};

export interface RoutingContext {
  files?: readonly string[];
  phase?: ProjectPhase;
}

const FILE_LANGUAGES: Record<string, string> = {
  ts: "typescript", tsx: "typescript", mts: "typescript", cts: "typescript",
  js: "typescript", jsx: "typescript", mjs: "typescript", cjs: "typescript",
  py: "python", go: "go", rs: "rust", swift: "swift", java: "java",
  c: "c", h: "c", cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp",
};

export function routingStack(stack: readonly string[], files: readonly string[] = []): string[] {
  const languages = [...new Set(files.flatMap(file => {
    const name = file.replace(/\\/g, "/").split("/").pop() ?? "";
    const dot = name.lastIndexOf(".");
    const language = dot > 0 ? FILE_LANGUAGES[name.slice(dot + 1).toLowerCase()] : undefined;
    return language ? [language] : [];
  }))];
  return languages.length > 0 ? languages : [...stack];
}

const UI_TASK_RE =
  /\b(?:ui|ux|(?:re)?design(?:s|ed|er|ers)?|css|tailwind|styl(?:e[sd]?|ing)|layouts?|spacing|typography|fonts?|colou?rs?|palettes?|themes?|dark|components?|buttons?|forms?|inputs?|modals?|nav|navbar|navigation|sidebars?|headers?|footers?|hero|landing|pages?|dashboards?|responsive|mobile|viewport|animat\w*|motion|hover(?:ing|ed)?|gradients?|shadows?|icons?|accessib\w*|contrast|figma|screenshots?|polish(?:ed|ing)?|beautiful|prett(?:y|ier)|ugly|empty\s+states?|frontend|front-end|make\s+it\s+(?:look|feel)|look(?:s|ing)?\s+(?:better|nicer|prettier|beautiful|cleaner|modern|professional|bad|off|weird))\b/;

function normLang(s: string): string {
  const k = s.toLowerCase();
  return LANG_ALIAS[k] ?? k;
}

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

function skillTerms(skill: SkillNode): string[] {
  if (skill.triggers && skill.triggers.length > 0) {
    return skill.triggers.map((t) => t.toLowerCase());
  }
  return extractSkillKeywords(skill.id);
}

/** Inverted index: stemmed term → skill ids. Lookup is O(query tokens), not O(skills). */
export function buildTriggerIndex(skills: SkillNode[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  const add = (term: string, id: string) => {
    const key = simpleStem(term.toLowerCase());
    const list = index.get(key);
    if (list) {
      if (!list.includes(id)) list.push(id);
    } else {
      index.set(key, [id]);
    }
  };
  for (const skill of skills) {
    for (const term of skillTerms(skill)) add(term, skill.id);
    if (skill.pack) add(skill.pack, skill.id);
    for (const lang of skill.langs ?? []) add(lang, skill.id);
  }
  return index;
}

export function packsToLoad(task: string, phase: ProjectPhase): Set<SkillPack> {
  const packs = new Set<SkillPack>();
  packs.add("pipeline");
  if (phase === "explore") {
    packs.add("memory");
    packs.add("optimizer");
  } else if (phase === "implement") {
    packs.add("memory");
    packs.add("code");
    packs.add("optimizer");
  } else if (phase === "review") {
    packs.add("review");
    packs.add("security");
    packs.add("code");
    packs.add("memory");
  } else {
    packs.add("security");
    packs.add("devops");
    packs.add("ops");
    packs.add("review");
  }
  const lower = task.toLowerCase();
  if (/(pentest|owasp|soc2|iso\b|compliance|audit|cve|xss|csrf|idor)/.test(lower)) packs.add("security");
  if (isSecurityIncident(task)) {
    packs.add("security");
    packs.add("review");
  }
  if (/(deploy|aws|gcp|azure|vps|terraform|kubernetes)/.test(lower)) packs.add("devops");
  if (/(?:\bprune\b|\bonboard\b|\binit\b)/.test(lower)) packs.add("ops");
  if (/(?:\breview\b|\bpr\b|\bdiff\b)/.test(lower)) packs.add("review");
  if (UI_TASK_RE.test(lower)) packs.add("ui");
  if (/(watchdog|\bdig\b|session review|\bretro\b|bloat|stale (skill|rule|plugin)|unused (skill|plugin|mcp)|agent environment|clean ?up)/.test(lower)) {
    packs.add("watchdog");
  }
  return packs;
}

function langOk(skill: SkillNode, stack: string[], taskKeywords: string[]): boolean {
  if (!skill.langs || skill.langs.length === 0) return true;
  const stackSet = new Set(stack.map(normLang));
  const taskSet = new Set(taskKeywords.map(normLang));
  return skill.langs.some((l) => {
    const n = normLang(l);
    return stackSet.has(n) || taskSet.has(n);
  });
}

function packAllowed(skill: SkillNode, load: Set<SkillPack>, taskKeywords: string[]): boolean {
  if (!skill.pack) return true;
  if (load.has(skill.pack)) return true;
  if (skill.pack === "code") {
    const mentioned = new Set(taskKeywords.map(normLang));
    if (skill.langs?.some((l) => mentioned.has(normLang(l)))) return true;
  }
  return false;
}

export function alwaysOnSkillIds(graph: Graph, task: string, context: RoutingContext = {}): string[] {
  const project = findNode<ProjectNode>(graph, "project", "project");
  const stack = routingStack(project?.stack ?? [], context.files);
  const phase = context.phase ?? getPhaseForTask(task);
  const load = packsToLoad(task, phase);
  const alwaysPacks = new Set<SkillPack>(load);
  if (phase === "implement" || phase === "explore") alwaysPacks.add("security");
  alwaysPacks.add("memory");
  alwaysPacks.add("pipeline");
  alwaysPacks.add("optimizer");
  const keywords = extractKeywords(task);
  return findNodes<SkillNode>(graph, "skill")
    .filter((s) => s.always === true)
    .filter((s) => !s.pack || alwaysPacks.has(s.pack))
    .filter((s) => langOk(s, stack, keywords))
    .map((s) => s.id);
}

export function matchTask(task: string, graph: Graph, context: RoutingContext = {}): string[] {
  const keywords = extractKeywords(task);
  if (keywords.length === 0 && !context.files?.length && !context.phase) return [];

  const skills = findNodes<SkillNode>(graph, "skill");
  const project = findNode<ProjectNode>(graph, "project", "project");
  const stack = routingStack(project?.stack ?? [], context.files);
  const load = packsToLoad(task, context.phase ?? getPhaseForTask(task));
  const index = buildTriggerIndex(skills);
  const skillById = new Map(skills.map((s) => [s.id, s]));

  const matchCount = new Map<string, number>();
  for (const kw of new Set([...keywords, ...(context.files?.length ? routingStack([], context.files) : [])])) {
    const posting = index.get(simpleStem(kw));
    if (!posting) continue;
    for (const id of posting) {
      matchCount.set(id, (matchCount.get(id) ?? 0) + 1);
    }
  }

  const projectEdges = graph.edges.filter(
    (e): e is ProjectSkillEdge => e.type === "project_skill",
  );
  const edgeMap = new Map(projectEdges.map((e) => [e.to, e]));

  const scored: ScoredSkill[] = [];
  for (const [id, hits] of matchCount) {
    const skill = skillById.get(id);
    if (!skill) continue;
    if (!langOk(skill, stack, keywords)) continue;
    if (!packAllowed(skill, load, keywords)) continue;
    const edge = edgeMap.get(id);
    const weight = edge ? edge.w : 0.1;
    scored.push({ id, score: hits * 0.5 + weight * 0.3 + skill.w * 0.2 });
  }

  scored.sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored.slice(0, 3).map((s) => s.id);
  }

  if (stack.length > 0) {
    const stackDefaults = skills
      .filter((s) => langOk(s, stack, []))
      .filter((s) => packAllowed(s, load, keywords))
      .filter((s) => {
        if (s.pack === "code") return true;
        if (s.pack) return false;
        const skillKws = extractSkillKeywords(s.id);
        return stack.some((stackItem) =>
          skillKws.some((sk) => wordMatches(normLang(stackItem), sk)),
        );
      })
      .sort((a, b) => b.w - a.w);
    return stackDefaults.slice(0, 3).map((s) => s.id);
  }

  return [];
}

export function isSecurityIncident(task: string): boolean {
  return (
    /\b(security|authz|authn|owasp|pentest|cve|xss|csrf|idor|rce|injection|vulnerabilit|secret.?leak)\b/i.test(task) &&
    /\b(fix|bug|patch|hotfix|incident|exploit)\b/i.test(task)
  );
}

export function getPhaseForTask(task: string): ProjectPhase {
  const phase = inferPhase(task);
  return phase !== "ship" && isSecurityIncident(task) ? "review" : phase;
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
