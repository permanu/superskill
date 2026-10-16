// SPDX-License-Identifier: Apache-2.0

import type { Graph, SkillNode, ProjectSkillEdge, ProjectPhase, SkillPack, ProjectNode } from "./schema.js";
import { findNodes, findNode } from "./store.js";
import { inferPhase } from "../../rules/router.js";
import { bankingApplies } from "../project-routing.js";

const LANG_ALIAS: Record<string, string> = {
  ts: "typescript",
  js: "typescript",
  javascript: "typescript",
  nodejs: "typescript",
  py: "python",
  golang: "go",
  rs: "rust",
};

export interface RoutingContext {
  files?: readonly string[];
  phase?: ProjectPhase;
  domains?: readonly string[];
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
  return languages.length > 0 ? languages : [...new Set(stack.map(normLang))];
}

const UI_TASK_RE =
  /\b(?:ui|ux|e2e|browser|click(?:through|ing|ed)?|playwright|cypress|webdriver|visual|css|tailwind|styl(?:e[sd]?|ing)|layouts?|spacing|typography|fonts?|colou?rs?|palettes?|themes?|dark|components?|buttons?|forms?|inputs?|modals?|nav|navbar|navigation|sidebars?|headers?|footers?|hero|landing|pages?|screens?|dashboards?|responsive|mobile|viewport|animat\w*|motion|hover(?:ing|ed)?|gradients?|shadows?|icons?|accessib\w*|contrast|figma|screenshots?|polish(?:ed|ing)?|beautiful|prett(?:y|ier)|ugly|empty\s+states?|frontend|front-end|make\s+it\s+(?:look|feel)|look(?:s|ing)?\s+(?:better|nicer|prettier|beautiful|cleaner|modern|professional|bad|off|weird))\b/;
const UI_FOUNDATION_TASK_RE =
  /\b(?:css|tailwind|style\w*|layout\w*|spacing|typography|fonts?|colou?rs?|palettes?|themes?|dark|components?|buttons?|forms?|inputs?|modals?|nav(?:bar|igation)?|sidebars?|headers?|footers?|hero|landing|pages?|screens?|dashboards?|responsive|mobile|viewport|animat\w*|motion|hover\w*|gradients?|shadows?|icons?|accessib\w*|contrast|figma|screenshots?|polish\w*|beautiful|pretty|ugly|empty\s+states?|frontend|front-end)\b/i;
const UI_DESIGN_RE = /\b(?:re)?design(?:s|ed|er|ers|ing)?\b/i;
const UI_DESIGN_CONTEXT_RE = /\b(?:ui|ux|screen|page|dashboard|app|website|landing|component|button|form|modal|navigation|sidebar|header|footer|theme|css|layout|typography|palette|screenshot|figma|responsive)\b/i;

const ALGORITHM_TASK_RE =
  /\b(?:algorithm\w*|complexity|big[- ]?o|concurren\w*|parallel\w*|race condition|deadlock|performance|optimi[sz]\w*|throughput|hot path|scal(?:e|ing)|hld|lld)\b/i;
const OPTIMIZER_TASK_RE =
  /\b(?:token\w*|bloat|lazy|yagni|simplif\w*|adhd|terse|concise|brief|short answer|verbosity|no preamble|output style|caveman)\b/i;
const SYSTEMS_TASK_RE =
  /\b(?:system(?:s)?|architecture|architectural|distributed|tenant boundary|data flow|feedback loop|new service|new store|new database|persistent state|workflow|queue)\b/i;
const SYSTEMS_FILE_RE = /(?:^|\/)(?:systems?|architecture|services?|database|db|storage|queues?|workers?|cache|migrations?|tenants?|workflow)(?:\/|\.|$)/i;
const DELIVERY_TASK_RE =
  /\b(?:orchestrat\w*|delegat\w*|integrat\w*|delivery|worktree|release|merge|publish|commit|branch|pipeline)\b/i;
const ALGORITHM_FILE_RE = /(?:^|\/)(?:algorithms?|concurrency|parallel|queues?|workers?|schedulers?|indexes?|indexing|caches?|benchmarks?)(?:\/|\.|$)/i;
const UI_FILE_RE = /\.(?:css|scss|sass|less|html?|jsx|tsx|vue|svelte|astro)$/i;

function isUiFile(file: string): boolean {
  return UI_FILE_RE.test(file) || /(?:^|\/)(?:components?|screens?|pages?|layouts?|views?|ui)(?:\/|$)/i.test(file);
}

function isUiFoundationFile(file: string): boolean {
  return /\.(?:css|scss|sass|less|html?)$/i.test(file) ||
    /(?:^|\/)(?:components?|screens?|pages?|layouts?|views?|ui)(?:\/|$)/i.test(file);
}

function isUiTask(task: string, files: readonly string[]): boolean {
  return files.some(isUiFile) || UI_TASK_RE.test(task.toLowerCase()) ||
    (UI_DESIGN_RE.test(task) && UI_DESIGN_CONTEXT_RE.test(task));
}

function isUiFoundationTask(task: string, files: readonly string[]): boolean {
  return UI_FOUNDATION_TASK_RE.test(task) || files.some(isUiFoundationFile) ||
    (UI_DESIGN_RE.test(task) && UI_DESIGN_CONTEXT_RE.test(task));
}

function isGraphNoteFile(file: string): boolean {
  return /(?:^|\/)(?:architecture|code)-notes(?:\.test)?\.[cm]?[jt]sx?$/i.test(file) ||
    /(?:^|\/)projects\/[^/]+\/(?:architecture|code)\/[^/]+\.md$/i.test(file);
}

function isApplicationBrowserQaTask(task: string, files: readonly string[] = []): boolean {
  return /\b(?:e2e|browser|click(?:through|ing|ed)?|playwright|cypress|webdriver)\b/i.test(task) &&
    !isGraphNoteQaTask(task, files);
}

export function isGraphNoteQaTask(task: string, files: readonly string[] = []): boolean {
  return /\bpipeline\/qa\b/i.test(task) ||
    /\b(?:run|rerun|regenerate|generate|verify|check|render|inspect|confirm|qa|test)\b[\s\S]{0,40}\bgraph[- ](?:viz|visuali[sz]ation)\b|\bgraph[- ](?:viz|visuali[sz]ation)\b[\s\S]{0,40}\b(?:run|rerun|regenerate|generate|verify|check|render|inspect|confirm|qa|test)\b/i.test(task) ||
    /\b(?:generate|regenerate|update|review|check|verify|render|inspect|confirm|qa|test)\b[\s\S]{0,48}\b(?:graph|generated|code|architecture)\s+notes?\b/i.test(task) ||
    files.some(isGraphNoteFile);
}

function alwaysSkillApplies(skill: SkillNode, task: string, files: readonly string[]): boolean {
  if (task.toLowerCase().includes(skill.id.toLowerCase())) return true;
  if (skill.id === "optimizer/algorithm") return ALGORITHM_TASK_RE.test(task) || files.some(file => ALGORITHM_FILE_RE.test(file));
  if (skill.id === "pipeline/systems") return SYSTEMS_TASK_RE.test(task) || files.some(file => SYSTEMS_FILE_RE.test(file));
  if (skill.id === "pipeline/delivery") return DELIVERY_TASK_RE.test(task) || files.some(file => DELIVERY_TASK_RE.test(file));
  if (skill.id === "optimizer/adhd") return OPTIMIZER_TASK_RE.test(task);
  if (skill.id === "optimizer/token") return /\b(?:token\w*|bloat|context|lazy|yagni|simplif\w*)\b/i.test(task);
  if (skill.id === "ui/foundations") return isUiFoundationTask(task, files);
  return true;
}

function normLang(s: string): string {
  const k = s.normalize("NFKC").toLowerCase().trim();
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

const SHORT_KEYWORDS = new Set(["ui", "ux", "ai", "qa", "db", "ci", "ml", "go", "c"]);

function extractKeywords(task: string): string[] {
  return task
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .map(normLang)
    .filter(w => w.length > 0 && !STOPWORDS.has(w) && (w.length > 2 || SHORT_KEYWORDS.has(w) || /[^\x00-\x7f]/u.test(w)));
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
  return extractKeywords(skillId);
}

interface ScoredSkill {
  id: string;
  score: number;
}

function skillTerms(skill: SkillNode): string[] {
  if (skill.triggers && skill.triggers.length > 0) {
    return skill.triggers.flatMap(extractKeywords);
  }
  return extractSkillKeywords(skill.id);
}

/** Inverted index: stemmed term → skill ids. Lookup is O(query tokens), not O(skills). */
export function buildTriggerIndex(skills: SkillNode[]): Map<string, string[]> {
  const index = new Map<string, Set<string>>();
  const add = (term: string, id: string) => {
    const key = simpleStem(normLang(term));
    const list = index.get(key);
    if (list) {
      list.add(id);
    } else {
      index.set(key, new Set([id]));
    }
  };
  for (const skill of skills) {
    for (const term of skillTerms(skill)) add(term, skill.id);
    if (skill.pack) add(skill.pack, skill.id);
    for (const lang of skill.langs ?? []) add(lang, skill.id);
  }
  return new Map([...index].map(([term, ids]) => [term, [...ids]]));
}

const triggerIndices = new WeakMap<Graph["nodes"], { signature: string; index: Map<string, string[]> }>();

function triggerIndex(graph: Graph, skills: SkillNode[]): Map<string, string[]> {
  const signature = JSON.stringify(skills.map(skill => [skill.id, skill.triggers, skill.pack, skill.langs]));
  const cached = triggerIndices.get(graph.nodes);
  if (cached?.signature === signature) return cached.index;
  const index = buildTriggerIndex(skills);
  triggerIndices.set(graph.nodes, { signature, index });
  return index;
}

function finiteWeight(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.1;
}

export function packsToLoad(task: string, phase: ProjectPhase, files: readonly string[] = []): Set<SkillPack> {
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
  if (/(pentest|owasp|soc2|iso\b|compliance|audit|cve|xss|csrf|idor|\bbanks?\b|banking|fintech|financial|payments|ledger|logging|leakage|redaction|secrets|diagnostics|snapshots|artifacts|telemetry)/.test(lower)) packs.add("security");
  if (isSecurityIncident(task)) {
    packs.add("security");
    packs.add("review");
  }
  if (/(deploy|aws|gcp|azure|vps|terraform|kubernetes)/.test(lower)) packs.add("devops");
  if (/(?:\bprune\b|\bonboard\b|\binit\b)/.test(lower)) packs.add("ops");
  if (/(?:\breview\b|\bpr\b|\bdiff\b)/.test(lower)) packs.add("review");
  if (!isGraphNoteQaTask(task, files) && isUiTask(lower, files)) packs.add("ui");
  if (ALGORITHM_TASK_RE.test(lower) || OPTIMIZER_TASK_RE.test(lower) || files.some(file => ALGORITHM_FILE_RE.test(file))) packs.add("optimizer");
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

function packAllowed(skill: SkillNode, load: Set<SkillPack>, taskKeywords: string[], task: string): boolean {
  if (task.toLowerCase().includes(skill.id.toLowerCase())) return true;
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
  const load = packsToLoad(task, phase, context.files);
  const alwaysPacks = new Set<SkillPack>(load);
  if (phase === "implement" || phase === "explore") alwaysPacks.add("security");
  alwaysPacks.add("memory");
  alwaysPacks.add("pipeline");
  alwaysPacks.add("optimizer");
  const keywords = extractKeywords(task);
  return findNodes<SkillNode>(graph, "skill")
    .filter((s) => s.always === true)
    .filter((s) => s.id !== "security/banking" || bankingApplies(task, context))
    .filter((s) => !s.pack || alwaysPacks.has(s.pack))
    .filter((s) => alwaysSkillApplies(s, task, context.files ?? []))
    .filter((s) => langOk(s, stack, keywords))
    .map((s) => s.id);
}

export function matchTask(task: string, graph: Graph, context: RoutingContext = {}): string[] {
  const keywords = extractKeywords(task);

  const skills = findNodes<SkillNode>(graph, "skill");
  const project = findNode<ProjectNode>(graph, "project", "project");
  const stack = routingStack(project?.stack ?? [], context.files);
  const load = packsToLoad(task, context.phase ?? getPhaseForTask(task), context.files);
  const index = triggerIndex(graph, skills);
  const skillById = new Map(skills.map((s) => [s.id, s]));

  const matchCount = new Map<string, number>();
  for (const kw of new Set([...keywords, ...(context.files?.length ? routingStack([], context.files) : [])])) {
    const posting = index.get(simpleStem(kw));
    if (!posting) continue;
    for (const id of posting) {
      matchCount.set(id, (matchCount.get(id) ?? 0) + 1);
    }
  }
  if (isGraphNoteQaTask(task, context.files) && skillById.has("pipeline/qa") && !matchCount.has("pipeline/qa")) {
    matchCount.set("pipeline/qa", 1);
  }
  if (isApplicationBrowserQaTask(task, context.files) && skillById.has("ui/review") && !matchCount.has("ui/review")) {
    matchCount.set("ui/review", 1);
  }

  const projectEdges = graph.edges.filter(
    (e): e is ProjectSkillEdge => e.type === "project_skill",
  );
  const edgeMap = new Map(projectEdges.map((e) => [e.to, e]));

  const scored: ScoredSkill[] = [];
  for (const [id, hits] of matchCount) {
    const skill = skillById.get(id);
    if (!skill) continue;
    if (skill.id === "security/banking" && !bankingApplies(task, context)) continue;
    if (!langOk(skill, stack, keywords)) continue;
    if (skill.id === "pipeline/qa" && !isGraphNoteQaTask(task, context.files)) continue;
    if (skill.id === "ui/foundations" && !task.toLowerCase().includes(skill.id) && !isUiFoundationTask(task, context.files ?? [])) continue;
    if (!packAllowed(skill, load, keywords, task)) continue;
    const edge = edgeMap.get(id);
    const weight = edge ? finiteWeight(edge.w) : 0.1;
    scored.push({ id, score: hits * 0.5 + weight * 0.3 + finiteWeight(skill.w) * 0.2 });
  }

  scored.sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored.slice(0, 3).map((s) => s.id);
  }

  if (stack.length > 0) {
    const stackDefaults = skills
      .filter((s) => langOk(s, stack, []))
      .filter((s) => packAllowed(s, load, keywords, task))
      .filter((s) => {
        if (s.pack === "code") return true;
        if (s.pack) return false;
        const skillKws = extractSkillKeywords(s.id);
        return stack.some((stackItem) =>
          skillKws.some((sk) => wordMatches(normLang(stackItem), sk)),
        );
      })
      .sort((a, b) => finiteWeight(b.w) - finiteWeight(a.w));
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
    const wA = finiteWeight(edgeMap.get(a) ?? 0.1);
    const wB = finiteWeight(edgeMap.get(b) ?? 0.1);
    return wB - wA;
  });
}
