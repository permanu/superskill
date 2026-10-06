// SPDX-License-Identifier: Apache-2.0

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { findNode, findNodes, loadGraph } from "./store.js";
import { alwaysOnSkillIds, matchTask, packsToLoad } from "./router.js";
import { inferPhase } from "../../rules/router.js";
import type { Graph, ProjectNode, SkillNode } from "./schema.js";
import { catalogRoot, loadCatalog } from "../catalog.js";
import { parseFrontmatter } from "../frontmatter.js";
import { rulesCatalogRoot } from "../../rules/loader.js";
import { keywordKeys, normalizeTerms, simpleStem } from "../../rules/index-builder.js";
import { scanImportGraph } from "../code-graph.js";
import { ensureProjectIndex, indexPathFor } from "../knowledge-index.js";
import { VaultError } from "../vault-fs.js";
import type { VaultFS } from "../vault-fs.js";

export const TRAVERSE_INDEX_VERSION = 1;
export const DEFAULT_OPEN_BYTES = 4096;
export const DEFAULT_CHILDREN_LIMIT = 100;
export const DEFAULT_RESOLVE_LIMIT = 30;

const MAX_SKILL_RULE_EDGES_PER_RULE = 8;
const NON_RULE_FILES = new Set(["INDEX.md", "sources.md", "categories.md"]);

export type TraverseKind = "vault" | "skill" | "rule" | "code" | "container";
export type TraverseContainerKind = "root" | "vault" | "rules" | "skills" | "code" | "dir";

export interface TraverseNode {
  id: string;
  kind: TraverseKind;
  label: string;
  parent?: string;
  path?: string;
  file?: string;
  bytes: number;
  tokens: number;
  childrenCount?: number;
  meta?: Record<string, unknown>;
}

export type TraverseEdgeType =
  | "vault_related"
  | "rule_related"
  | "skill_rule_lang"
  | "skill_rule_trigger"
  | "skill_coactivation"
  | "project_skill"
  | "code_import";

export interface TraverseEdge {
  from: string;
  to: string;
  type: TraverseEdgeType;
  w?: number;
  label?: string;
}

export interface TraverseIndexData {
  version: number;
  fingerprint: string;
  builtAt: number;
  root: string;
  vaultPath: string | null;
  projectSlug: string | null;
  catalogDir: string;
  rulesDir: string;
  nodes: TraverseNode[];
  edges: TraverseEdge[];
}

export interface TraverseOpenOptions {
  root?: string;
  vaultPath?: string;
  projectSlug?: string | null;
  vaultFs?: VaultFS;
  catalogDir?: string;
  rulesDir?: string;
  cacheFile?: string;
  refresh?: boolean;
}

export type TraverseNodeView = Omit<TraverseNode, "file">;

export interface TraverseNodeInfo extends TraverseNodeView {
  edge_counts: { out: number; in: number };
}

export interface TraverseChildrenResult {
  id: string;
  total: number;
  children: TraverseNodeView[];
}

export interface TraverseResolveItem {
  id: string;
  kind: "skill" | "rule" | "vault";
  path?: string;
  bytes: number;
  tokens: number;
  reason: string;
}

export interface TraverseResolveResult {
  task: string;
  phase: string;
  packs: string[];
  items: TraverseResolveItem[];
  totals: { items: number; bytes: number; tokens: number };
  available: number;
  truncated: boolean;
}

export interface TraverseContent {
  id: string;
  kind: "vault" | "skill" | "rule" | "code";
  path?: string;
  bytes: number;
  tokens: number;
  truncated: boolean;
  content: string;
}

interface SkillMeta {
  pack?: string;
  langs: string[];
  triggers: string[];
  always: boolean;
  w: number;
}

interface RuleMeta {
  lang: string;
  prefix: string;
  title: string;
  severity: string;
  enforce: string;
  status: string;
  triggers: { keywords: string[]; files: string[]; symbols: string[] };
  related: string[];
}

interface TraverseContext {
  root: string;
  vaultPath?: string;
  projectSlug?: string;
  vaultFs?: VaultFS;
  catalogDir: string;
  rulesDir: string;
}

const LANG_ALIAS: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  typescript: "typescript",
  js: "typescript",
  jsx: "typescript",
  javascript: "typescript",
  node: "typescript",
  nodejs: "typescript",
  rs: "rust",
  rust: "rust",
  py: "python",
  python: "python",
  python3: "python",
  go: "go",
  golang: "go",
  swift: "swift",
  java: "java",
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  cplusplus: "cpp",
};

const SEVERITY_RANK: Record<string, number> = { must: 0, should: 1, prefer: 2 };

export function traverseTokensForBytes(bytes: number): number {
  return bytes > 0 ? Math.ceil(bytes / 4) : 0;
}

function normalizeLang(value: string): string | undefined {
  return LANG_ALIAS[value.trim().toLowerCase()];
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseTriggers(value: unknown): RuleMeta["triggers"] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { keywords: [], files: [], symbols: [] };
  }
  const raw = value as Record<string, unknown>;
  return {
    keywords: [...new Set(asStringArray(raw.keywords))],
    files: [...new Set(asStringArray(raw.files))],
    symbols: [...new Set(asStringArray(raw.symbols))],
  };
}

function deriveRulePrefix(id: string, lang: string): string {
  const stripped = id.startsWith(`${lang}-`) ? id.slice(lang.length + 1) : id;
  const dash = stripped.indexOf("-");
  return dash === -1 ? stripped : stripped.slice(0, dash);
}

function isTrackedCodeFile(name: string): boolean {
  return (
    name.endsWith(".ts") &&
    !name.endsWith(".d.ts") &&
    !name.endsWith(".test.ts") &&
    !name.endsWith(".spec.ts") &&
    !name.startsWith("test-helpers.")
  );
}

function listFiles(dir: string, accept: (name: string) => boolean, skipDirs: ReadonlySet<string> = new Set()): string[] {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist") continue;
      const abs = join(current, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) stack.push(abs);
      } else if (entry.isFile() && accept(entry.name)) {
        out.push(abs);
      }
    }
  }
  return out.sort();
}

interface FileStat {
  mtime: number;
  size: number;
}

function statFile(path: string): FileStat | null {
  try {
    const st = statSync(path);
    return { mtime: Math.round(st.mtimeMs), size: st.size };
  } catch {
    return null;
  }
}

function statSize(path: string): number {
  return statFile(path)?.size ?? 0;
}

function dirStats(dir: string, accept: (name: string) => boolean, skipDirs: ReadonlySet<string> = new Set()): FileStat & { count: number } {
  const files = listFiles(dir, accept, skipDirs);
  let mtime = 0;
  let size = 0;
  for (const file of files) {
    const st = statFile(file);
    if (st === null) continue;
    mtime = Math.max(mtime, st.mtime);
    size += st.size;
  }
  return { count: files.length, mtime, size };
}

function computeFingerprint(ctx: TraverseContext): string {
  const rules = dirStats(ctx.rulesDir, (name) => name.endsWith(".md"));
  const catalog = dirStats(ctx.catalogDir, (name) => name.endsWith(".md"), new Set(["rules"]));
  const src = dirStats(join(ctx.root, "src"), isTrackedCodeFile, new Set(["__fixtures__"]));
  const graph = statFile(join(ctx.root, ".superskill", "graph.json"));
  const vault =
    ctx.vaultPath && ctx.projectSlug
      ? {
          db: statFile(indexPathFor(ctx.vaultPath, ctx.projectSlug)),
          stamp: statFile(`${indexPathFor(ctx.vaultPath, ctx.projectSlug)}.stamp`),
        }
      : null;
  return JSON.stringify({
    v: TRAVERSE_INDEX_VERSION,
    root: ctx.root,
    vaultPath: ctx.vaultPath ?? null,
    projectSlug: ctx.projectSlug ?? null,
    catalogDir: ctx.catalogDir,
    rulesDir: ctx.rulesDir,
    rules,
    catalog,
    src,
    graph,
    vault,
  });
}

class Builder {
  readonly nodes = new Map<string, TraverseNode>();
  readonly edges: TraverseEdge[] = [];
  private readonly edgeKeys = new Set<string>();
  private readonly langMatchedPairs = new Set<string>();

  addContainer(id: string, label: string, parent: string | undefined, container: TraverseContainerKind): void {
    const existing = this.nodes.get(id);
    if (existing) {
      if (parent !== undefined && existing.parent === undefined) existing.parent = parent;
      return;
    }
    this.nodes.set(id, {
      id,
      kind: "container",
      label,
      parent,
      bytes: 0,
      tokens: 0,
      childrenCount: 0,
      meta: { container },
    });
  }

  addNode(node: TraverseNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: TraverseEdge): void {
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) return;
    const key = `${edge.type}|${edge.from}|${edge.to}`;
    if (this.edgeKeys.has(key)) return;
    this.edgeKeys.add(key);
    this.edges.push(edge);
  }

  markLangMatch(ruleId: string, skillId: string): void {
    this.langMatchedPairs.add(`${ruleId}|${skillId}`);
  }

  isLangMatch(ruleId: string, skillId: string): boolean {
    return this.langMatchedPairs.has(`${ruleId}|${skillId}`);
  }

  finalize(): void {
    const childCounts = new Map<string, number>();
    for (const node of this.nodes.values()) {
      if (node.parent) childCounts.set(node.parent, (childCounts.get(node.parent) ?? 0) + 1);
    }
    for (const node of this.nodes.values()) {
      if (node.kind !== "container") {
        let parentId = node.parent;
        while (parentId) {
          const parent = this.nodes.get(parentId);
          if (!parent) break;
          parent.bytes += node.bytes;
          parent.tokens += node.tokens;
          parentId = parent.parent;
        }
      }
    }
    for (const node of this.nodes.values()) {
      if (node.kind === "container") node.childrenCount = childCounts.get(node.id) ?? 0;
    }
  }
}

function vaultAbsPath(ctx: TraverseContext, relPath: string): string | null {
  if (ctx.vaultFs) {
    try {
      return join(ctx.vaultFs.root, ctx.vaultFs.jailPath(relPath));
    } catch {
      return null;
    }
  }
  if (!ctx.vaultPath) return null;
  return join(ctx.vaultPath, relPath);
}

function ensureVaultDirs(builder: Builder, relPath: string, projectSlug: string, projectContainer: string): string {
  const dir = relPath.split("/").slice(0, -1).join("/");
  const projectDir = `projects/${projectSlug}`;
  if (!dir || dir === projectDir) return projectContainer;
  const rel = dir.startsWith(`${projectDir}/`) ? dir.slice(projectDir.length + 1) : dir;
  let current = projectContainer;
  for (const part of rel.split("/").filter(Boolean)) {
    const id = `${current}${part}/`;
    builder.addContainer(id, `${part}/`, current, "dir");
    current = id;
  }
  return current;
}

function addVaultSection(builder: Builder, ctx: TraverseContext): void {
  if (!ctx.vaultPath || !ctx.projectSlug) return;
  const index = ensureProjectIndex(ctx.vaultPath, ctx.projectSlug);
  const dump = index.graphDump();
  const projectContainer = `vault:projects/${ctx.projectSlug}/`;
  builder.addContainer(projectContainer, `vault:${ctx.projectSlug}`, "graph", "vault");

  for (const note of dump.nodes) {
    const id = `vault:${note.id}`;
    const abs = vaultAbsPath(ctx, note.id);
    const bytes = abs === null ? 0 : statSize(abs);
    builder.addNode({
      id,
      kind: "vault",
      label: note.title || note.id.split("/").pop() || note.id,
      parent: ensureVaultDirs(builder, note.id, ctx.projectSlug, projectContainer),
      path: note.id,
      file: abs ?? undefined,
      bytes,
      tokens: traverseTokensForBytes(bytes),
      meta: { type: note.type },
    });
  }

  for (const edge of dump.edges) {
    builder.addEdge({
      from: `vault:${edge.from}`,
      to: `vault:${edge.to}`,
      type: "vault_related",
    });
  }
}

function addRulesSection(builder: Builder, ctx: TraverseContext): void {
  builder.addContainer("rules", "rules", "graph", "rules");
  const files = listFiles(ctx.rulesDir, (name) => name.endsWith(".md") && !NON_RULE_FILES.has(name));
  for (const abs of files) {
    let raw: string;
    try {
      raw = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const data = parseFrontmatter(raw).data as Record<string, unknown>;
    const id = asString(data.id);
    const lang = asString(data.lang);
    const title = asString(data.title);
    if (!id || !lang || !title) continue;

    const prefix = asString(data.prefix) ?? deriveRulePrefix(id, lang);
    const relPath = relative(ctx.rulesDir, abs).split(sep).join("/");
    const bytes = statSize(abs);
    const langContainer = `rules:${lang}`;
    const prefixContainer = `${langContainer}/${prefix}`;
    builder.addContainer(langContainer, lang, "rules", "rules");
    builder.addContainer(prefixContainer, prefix, langContainer, "rules");
    builder.addNode({
      id: `rule:${id}`,
      kind: "rule",
      label: title,
      parent: prefixContainer,
      path: relPath,
      file: abs,
      bytes,
      tokens: traverseTokensForBytes(bytes),
      meta: {
        lang,
        prefix,
        title,
        severity: asString(data.severity) ?? "should",
        enforce: asString(data.enforce) ?? "review",
        status: asString(data.status) ?? "draft",
        triggers: parseTriggers(data.triggers),
        related: asStringArray(data.related),
      } satisfies RuleMeta,
    });
  }
}

interface SkillEntry {
  id: string;
  pack?: string;
  langs: string[];
  triggers: string[];
  always: boolean;
  w: number;
  path?: string;
}

function resolveSkillFile(ctx: TraverseContext, entry: SkillEntry): { file?: string; path?: string } {
  if (entry.path) {
    const abs = join(ctx.catalogDir, entry.path);
    if (existsSync(abs)) return { file: abs, path: entry.path };
  }
  if (/^[a-z]+\/[^/@]+$/.test(entry.id)) {
    const abs = join(ctx.catalogDir, `${entry.id}.md`);
    if (existsSync(abs)) return { file: abs, path: `${entry.id}.md` };
  }
  if (entry.id.startsWith("native/")) {
    const name = entry.id.slice("native/".length);
    for (const root of [".agents/skills", ".superskill/skills", ".claude/skills"]) {
      const rel = `${root}/${name}/SKILL.md`;
      const abs = join(ctx.root, rel);
      if (existsSync(abs)) return { file: abs, path: rel };
    }
  }
  const at = entry.id.lastIndexOf("@");
  if (at > 0) {
    const ownerRepo = entry.id.slice(0, at);
    const skill = entry.id.slice(at + 1);
    const slash = ownerRepo.indexOf("/");
    if (slash > 0) {
      const owner = ownerRepo.slice(0, slash);
      const repo = ownerRepo.slice(slash + 1);
      const rel = `.superskill/skill-cache/${owner}/${repo}/${skill}/SKILL.md`;
      const abs = join(ctx.root, rel);
      if (existsSync(abs)) return { file: abs, path: rel };
    }
  }
  return {};
}

async function addSkillsSection(builder: Builder, ctx: TraverseContext, graph: Graph): Promise<void> {
  builder.addContainer("skills", "skills", "graph", "skills");
  const graphSkills = findNodes<SkillNode>(graph, "skill");
  let entries: SkillEntry[];
  if (graphSkills.length > 0) {
    entries = graphSkills.map((skill) => ({
      id: skill.id,
      pack: skill.pack,
      langs: skill.langs ?? [],
      triggers: skill.triggers ?? [],
      always: skill.always === true,
      w: skill.w,
      path: skill.path,
    }));
  } else {
    entries = (await loadCatalog()).map((skill) => ({
      id: skill.id,
      pack: skill.pack,
      langs: skill.langs,
      triggers: skill.triggers,
      always: skill.always,
      w: 0.8,
      path: skill.path,
    }));
  }

  for (const entry of entries) {
    const parent = entry.pack ? `skills:${entry.pack}` : "skills";
    if (entry.pack) builder.addContainer(parent, entry.pack, "skills", "skills");
    const { file, path } = resolveSkillFile(ctx, entry);
    const bytes = file ? statSize(file) : 0;
    builder.addNode({
      id: `skill:${entry.id}`,
      kind: "skill",
      label: entry.id,
      parent,
      path,
      file,
      bytes,
      tokens: traverseTokensForBytes(bytes),
      meta: {
        pack: entry.pack,
        langs: entry.langs,
        triggers: entry.triggers,
        always: entry.always,
        w: entry.w,
      } satisfies SkillMeta,
    });
  }
}

function ensureCodeDirs(builder: Builder, relPath: string): string {
  const dir = relPath.split("/").slice(0, -1).join("/");
  if (!dir) return "code";
  let current = "code";
  let acc = "";
  for (const part of dir.split("/")) {
    acc = acc ? `${acc}/${part}` : part;
    const id = `code:${acc}/`;
    builder.addContainer(id, `${part}/`, current, "dir");
    current = id;
  }
  return current;
}

function addCodeSection(builder: Builder, ctx: TraverseContext): void {
  builder.addContainer("code", "code", "graph", "code");
  const dump = scanImportGraph(ctx.root, "src");
  for (const file of dump.nodes) {
    const abs = join(ctx.root, file.id);
    const bytes = statSize(abs);
    builder.addNode({
      id: `code:${file.id}`,
      kind: "code",
      label: file.title,
      parent: ensureCodeDirs(builder, file.id),
      path: file.id,
      file: abs,
      bytes,
      tokens: traverseTokensForBytes(bytes),
      meta: {},
    });
  }
  for (const edge of dump.edges) {
    builder.addEdge({
      from: `code:${edge.from}`,
      to: `code:${edge.to}`,
      type: "code_import",
    });
  }
}

function addSkillRuleEdges(builder: Builder): void {
  const rules = [...builder.nodes.values()].filter((node) => node.kind === "rule");
  const skills = [...builder.nodes.values()].filter((node) => node.kind === "skill");

  const rulesByLang = new Map<string, TraverseNode[]>();
  for (const rule of rules) {
    const lang = normalizeLang((rule.meta as unknown as RuleMeta).lang);
    if (!lang) continue;
    const list = rulesByLang.get(lang);
    if (list) list.push(rule);
    else rulesByLang.set(lang, [rule]);
  }

  const ruleTriggerIndex = new Map<string, Set<string>>();
  for (const rule of rules) {
    for (const trigger of (rule.meta as unknown as RuleMeta).triggers.keywords) {
      for (const key of keywordKeys(trigger)) {
        const ids = ruleTriggerIndex.get(key);
        if (ids) ids.add(rule.id);
        else ruleTriggerIndex.set(key, new Set([rule.id]));
      }
    }
  }

  const candidates = new Map<string, Set<string>>();
  const addCandidate = (ruleId: string, skillId: string): void => {
    const set = candidates.get(ruleId);
    if (set) set.add(skillId);
    else candidates.set(ruleId, new Set([skillId]));
  };

  for (const skill of skills) {
    const meta = skill.meta as unknown as SkillMeta;
    for (const lang of meta.langs) {
      const normalized = normalizeLang(lang);
      if (!normalized) continue;
      for (const rule of rulesByLang.get(normalized) ?? []) {
        builder.markLangMatch(rule.id, skill.id);
        addCandidate(rule.id, skill.id);
      }
    }
    for (const trigger of meta.triggers) {
      for (const key of keywordKeys(trigger)) {
        for (const ruleId of ruleTriggerIndex.get(key) ?? []) {
          addCandidate(ruleId, skill.id);
        }
      }
    }
  }

  const weightOf = new Map(skills.map((skill) => [skill.id, (skill.meta as unknown as SkillMeta).w ?? 0]));
  for (const [ruleId, skillIds] of candidates) {
    const ranked = [...skillIds].sort((a, b) => {
      const w = (weightOf.get(b) ?? 0) - (weightOf.get(a) ?? 0);
      if (w !== 0) return w;
      return a < b ? -1 : a > b ? 1 : 0;
    });
    const rule = builder.nodes.get(ruleId);
    if (rule?.meta) {
      rule.meta.linked_skills = ranked.length;
      rule.meta.linked_skills_edges = Math.min(ranked.length, MAX_SKILL_RULE_EDGES_PER_RULE);
    }
    for (const skillId of ranked.slice(0, MAX_SKILL_RULE_EDGES_PER_RULE)) {
      builder.addEdge({
        from: skillId,
        to: ruleId,
        type: builder.isLangMatch(ruleId, skillId) ? "skill_rule_lang" : "skill_rule_trigger",
      });
    }
  }
}

function addRuleRelatedEdges(builder: Builder): void {
  for (const node of builder.nodes.values()) {
    if (node.kind !== "rule") continue;
    for (const related of (node.meta as unknown as RuleMeta).related) {
      const target = `rule:${related}`;
      if (target === node.id) continue;
      builder.addEdge({ from: node.id, to: target, type: "rule_related" });
    }
  }
}

function addGraphEdges(builder: Builder, graph: Graph): void {
  for (const edge of graph.edges) {
    if (edge.type === "skill_skill") {
      builder.addEdge({
        from: `skill:${edge.from}`,
        to: `skill:${edge.to}`,
        type: "skill_coactivation",
        w: edge.w,
      });
    } else if (edge.type === "project_skill") {
      builder.addEdge({
        from: "graph",
        to: `skill:${edge.to}`,
        type: "project_skill",
        w: edge.w,
        label: `${edge.activations} activation(s)`,
      });
    }
  }
}

async function buildIndexData(ctx: TraverseContext, graph: Graph, fingerprint: string): Promise<TraverseIndexData> {
  const builder = new Builder();
  builder.addContainer("graph", "graph", undefined, "root");
  addVaultSection(builder, ctx);
  addRulesSection(builder, ctx);
  addCodeSection(builder, ctx);
  await addSkillsSection(builder, ctx, graph);
  addSkillRuleEdges(builder);
  addRuleRelatedEdges(builder);
  addGraphEdges(builder, graph);
  builder.finalize();
  return {
    version: TRAVERSE_INDEX_VERSION,
    fingerprint,
    builtAt: Date.now(),
    root: ctx.root,
    vaultPath: ctx.vaultPath ?? null,
    projectSlug: ctx.projectSlug ?? null,
    catalogDir: ctx.catalogDir,
    rulesDir: ctx.rulesDir,
    nodes: [...builder.nodes.values()],
    edges: builder.edges,
  };
}

function writeCache(cacheFile: string, data: TraverseIndexData): void {
  try {
    mkdirSync(dirname(cacheFile), { recursive: true });
    const tmp = `${cacheFile}.tmp-${process.pid}`;
    writeFileSync(tmp, JSON.stringify(data), "utf8");
    renameSync(tmp, cacheFile);
  } catch (error: unknown) {
    console.error(`[traverse] failed to write cache ${cacheFile}: ${messageOf(error)}`);
  }
}

function readCache(cacheFile: string, fingerprint: string): TraverseIndexData | null {
  try {
    const parsed = JSON.parse(readFileSync(cacheFile, "utf8")) as TraverseIndexData;
    if (parsed.version !== TRAVERSE_INDEX_VERSION || parsed.fingerprint !== fingerprint) return null;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function resolveContext(options: TraverseOpenOptions): TraverseContext {
  return {
    root: resolve(options.root ?? process.cwd()),
    vaultPath: options.vaultPath ? resolve(options.vaultPath) : undefined,
    projectSlug: options.projectSlug ?? undefined,
    vaultFs: options.vaultFs,
    catalogDir: resolve(options.catalogDir ?? catalogRoot()),
    rulesDir: resolve(options.rulesDir ?? rulesCatalogRoot()),
  };
}

export async function buildTraverseIndex(options: TraverseOpenOptions = {}): Promise<TraverseIndexData> {
  const ctx = resolveContext(options);
  if (ctx.vaultPath && ctx.projectSlug) ensureProjectIndex(ctx.vaultPath, ctx.projectSlug);
  const graph = await loadGraph(ctx.root);
  const fingerprint = computeFingerprint(ctx);
  return buildIndexData(ctx, graph, fingerprint);
}

function toView(node: TraverseNode): TraverseNodeView {
  const { file: _file, ...view } = node;
  return view;
}

function tokenizeTask(task: string): string[] {
  return task.toLowerCase().match(/[a-z0-9][a-z0-9._#+-]*/g) ?? [];
}

function taskTokenKeys(task: string): Set<string> {
  const keys = new Set<string>();
  for (const token of tokenizeTask(task)) {
    for (const term of normalizeTerms(token)) keys.add(simpleStem(term));
  }
  return keys;
}

function taskLanguageScope(task: string, graph: Graph): Set<string> {
  const scope = new Set<string>();
  for (const token of tokenizeTask(task)) {
    const lang = normalizeLang(token);
    if (lang) scope.add(lang);
  }
  const project = findNode<ProjectNode>(graph, "project", "project");
  for (const stackItem of project?.stack ?? []) {
    const lang = normalizeLang(stackItem);
    if (lang) scope.add(lang);
  }
  return scope;
}

function localSkillMatches(
  skillNodes: TraverseNode[],
  keys: Set<string>,
  scope: Set<string>,
  packs: Set<string>,
): string[] {
  const scored: Array<{ id: string; score: number }> = [];
  for (const node of skillNodes) {
    const meta = node.meta as unknown as SkillMeta;
    if (meta.langs.length > 0 && !meta.langs.some((lang) => scope.has(normalizeLang(lang) ?? lang.toLowerCase()))) continue;
    if (meta.pack && !packs.has(meta.pack) && meta.pack !== "code") continue;
    let hits = 0;
    for (const trigger of meta.triggers) {
      if (keywordKeys(trigger).some((key) => keys.has(key))) hits += 1;
    }
    if (hits === 0) continue;
    scored.push({ id: node.id.slice("skill:".length), score: hits * 0.5 + (meta.w ?? 0.1) * 0.2 });
  }
  scored.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return scored.slice(0, 3).map((entry) => entry.id);
}

export class Traverser {
  private readonly byId: Map<string, TraverseNode>;
  private readonly childIndex: Map<string, TraverseNode[]>;
  private readonly outIndex: Map<string, TraverseEdge[]>;
  private readonly inIndex: Map<string, TraverseEdge[]>;
  private readonly ruleKeywordIndex: Map<string, Set<string>>;
  private readonly skillNodes: TraverseNode[];
  private readonly ruleNodes: TraverseNode[];

  constructor(
    readonly data: TraverseIndexData,
    private readonly graph: Graph,
    private readonly ctx: TraverseContext,
  ) {
    this.byId = new Map(data.nodes.map((node) => [node.id, node]));
    this.childIndex = new Map();
    this.outIndex = new Map();
    this.inIndex = new Map();
    this.ruleKeywordIndex = new Map();
    this.skillNodes = [];
    this.ruleNodes = [];

    for (const node of data.nodes) {
      if (node.parent) {
        const children = this.childIndex.get(node.parent);
        if (children) children.push(node);
        else this.childIndex.set(node.parent, [node]);
      }
      if (node.kind === "skill") this.skillNodes.push(node);
      if (node.kind === "rule") this.ruleNodes.push(node);
    }
    const kindRank = (node: TraverseNode): number => (node.kind === "container" ? 0 : 1);
    for (const children of this.childIndex.values()) {
      children.sort((a, b) => {
        const rank = kindRank(a) - kindRank(b);
        if (rank !== 0) return rank;
        if (a.bytes !== b.bytes) return b.bytes - a.bytes;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    }
    for (const edge of data.edges) {
      const out = this.outIndex.get(edge.from);
      if (out) out.push(edge);
      else this.outIndex.set(edge.from, [edge]);
      const incoming = this.inIndex.get(edge.to);
      if (incoming) incoming.push(edge);
      else this.inIndex.set(edge.to, [edge]);
    }
    for (const rule of this.ruleNodes) {
      for (const trigger of (rule.meta as unknown as RuleMeta).triggers.keywords) {
        for (const key of keywordKeys(trigger)) {
          const ids = this.ruleKeywordIndex.get(key);
          if (ids) ids.add(rule.id);
          else this.ruleKeywordIndex.set(key, new Set([rule.id]));
        }
      }
    }
  }

  private lookup(id: string): TraverseNode | undefined {
    const exact = this.byId.get(id);
    if (exact) return exact;
    if (id.endsWith("/")) return this.byId.get(id.slice(0, -1));
    return this.byId.get(`${id}/`);
  }

  node(id: string): TraverseNodeInfo | null {
    const found = this.lookup(id);
    if (!found) return null;
    return {
      ...toView(found),
      edge_counts: {
        out: this.outIndex.get(found.id)?.length ?? 0,
        in: this.inIndex.get(found.id)?.length ?? 0,
      },
    };
  }

  children(id: string, options: { limit?: number } = {}): TraverseChildrenResult {
    const parent = this.lookup(id);
    if (!parent || parent.kind !== "container") return { id, total: 0, children: [] };
    const all = this.childIndex.get(parent.id) ?? [];
    const limit = options.limit === undefined ? DEFAULT_CHILDREN_LIMIT : Math.max(0, Math.floor(options.limit));
    return {
      id: parent.id,
      total: all.length,
      children: all.slice(0, limit).map(toView),
    };
  }

  private skillReason(node: TraverseNode, keys: Set<string>, fallback: string): string {
    const meta = node.meta as unknown as SkillMeta;
    const hits: string[] = [];
    for (const trigger of meta.triggers) {
      if (keywordKeys(trigger).some((key) => keys.has(key))) hits.push(trigger);
      if (hits.length >= 3) break;
    }
    if (hits.length > 0) return `trigger ${hits.join(", ")}`;
    if (meta.always) return "always-on skill";
    if (meta.pack) return `${fallback} (pack=${meta.pack})`;
    return fallback;
  }

  private vaultMatches(task: string, limit: number): Array<{ node: TraverseNode; reason: string }> {
    if (!this.ctx.vaultPath || !this.ctx.projectSlug) return [];
    try {
      const index = ensureProjectIndex(this.ctx.vaultPath, this.ctx.projectSlug);
      return index
        .search(task, limit)
        .map((hit) => ({ node: this.byId.get(`vault:${hit.path}`), reason: hit.title ? `vault match: ${hit.title}` : "vault match" }))
        .filter((entry): entry is { node: TraverseNode; reason: string } => entry.node !== undefined);
    } catch (error: unknown) {
      console.error(`[traverse] vault search failed: ${messageOf(error)}`);
      return [];
    }
  }

  resolve(task: string, options: { limit?: number } = {}): TraverseResolveResult {
    const text = String(task ?? "");
    const limit = Math.max(1, Math.floor(options.limit ?? DEFAULT_RESOLVE_LIMIT));
    const phase = inferPhase(text);
    const packs = [...packsToLoad(text, phase)].sort();
    const keys = taskTokenKeys(text);
    const scope = taskLanguageScope(text, this.graph);
    const items: TraverseResolveItem[] = [];
    const seen = new Set<string>();

    const push = (node: TraverseNode, reason: string): void => {
      if (seen.has(node.id)) return;
      seen.add(node.id);
      items.push({
        id: node.id,
        kind: node.kind as TraverseResolveItem["kind"],
        path: node.path,
        bytes: node.bytes,
        tokens: node.tokens,
        reason,
      });
    };

    const graphSkills = findNodes<SkillNode>(this.graph, "skill");
    let matchedSkillIds: string[];
    let alwaysSkillIds: string[];
    if (graphSkills.length > 0) {
      matchedSkillIds = matchTask(text, this.graph);
      alwaysSkillIds = alwaysOnSkillIds(this.graph, text);
    } else {
      matchedSkillIds = localSkillMatches(this.skillNodes, keys, scope, new Set(packs));
      alwaysSkillIds = this.skillNodes
        .filter((node) => (node.meta as unknown as SkillMeta).always)
        .map((node) => node.id.slice("skill:".length));
    }
    for (const id of matchedSkillIds) {
      const node = this.byId.get(`skill:${id}`);
      if (node) push(node, this.skillReason(node, keys, "task match"));
    }
    for (const id of alwaysSkillIds) {
      const node = this.byId.get(`skill:${id}`);
      if (node) push(node, "always-on skill");
    }

    const ruleScores = new Map<string, { rule: TraverseNode; hits: string[] }>();
    for (const key of keys) {
      for (const ruleId of this.ruleKeywordIndex.get(key) ?? []) {
        const rule = this.byId.get(ruleId);
        if (!rule) continue;
        const meta = rule.meta as unknown as RuleMeta;
        if (scope.size > 0 && !scope.has(normalizeLang(meta.lang) ?? meta.lang.toLowerCase())) continue;
        const entry = ruleScores.get(ruleId);
        if (entry) entry.hits.push(key);
        else ruleScores.set(ruleId, { rule, hits: [key] });
      }
    }
    const rankedRules = [...ruleScores.values()].sort((a, b) => {
      const severity =
        (SEVERITY_RANK[(a.rule.meta as unknown as RuleMeta).severity] ?? 9) -
        (SEVERITY_RANK[(b.rule.meta as unknown as RuleMeta).severity] ?? 9);
      if (severity !== 0) return severity;
      if (b.hits.length !== a.hits.length) return b.hits.length - a.hits.length;
      return a.rule.id < b.rule.id ? -1 : a.rule.id > b.rule.id ? 1 : 0;
    });
    for (const entry of rankedRules) {
      push(entry.rule, `keyword ${[...new Set(entry.hits)].join(", ")}`);
    }

    for (const match of this.vaultMatches(text, 5)) {
      push(match.node, match.reason);
    }

    const available = items.length;
    const capped = items.slice(0, limit);
    const totals = capped.reduce(
      (acc, item) => ({ items: acc.items + 1, bytes: acc.bytes + item.bytes, tokens: acc.tokens + item.tokens }),
      { items: 0, bytes: 0, tokens: 0 },
    );
    return {
      task: text,
      phase,
      packs,
      items: capped,
      totals,
      available,
      truncated: available > capped.length,
    };
  }

  async open(id: string, options: { full?: boolean; maxBytes?: number } = {}): Promise<TraverseContent> {
    const node = this.lookup(id);
    if (!node) throw new VaultError("FILE_NOT_FOUND", `Unknown traverse node: ${id}`);
    if (node.kind === "container") {
      throw new VaultError("INVALID_ARGUMENT", `Container ${node.id} has no content; use children("${node.id}")`);
    }

    let content: string;
    if (node.kind === "vault") {
      if (this.ctx.vaultFs && node.path) {
        content = await this.ctx.vaultFs.read(node.path);
      } else if (this.ctx.vaultPath && node.path) {
        content = readFileSync(join(this.ctx.vaultPath, node.path), "utf8");
      } else {
        throw new VaultError("FILE_NOT_FOUND", `No vault access for ${node.id}`);
      }
    } else {
      if (!node.file) throw new VaultError("FILE_NOT_FOUND", `No source file for ${node.id}`);
      content = readFileSync(node.file, "utf8");
    }

    const bytes = Buffer.byteLength(content, "utf8");
    const maxBytes = options.full === true ? Infinity : Math.max(1, Math.floor(options.maxBytes ?? DEFAULT_OPEN_BYTES));
    const truncated = bytes > maxBytes;
    return {
      id: node.id,
      kind: node.kind,
      path: node.path,
      bytes,
      tokens: traverseTokensForBytes(bytes),
      truncated,
      content: truncated ? content.slice(0, maxBytes) : content,
    };
  }
}

export async function openTraverser(options: TraverseOpenOptions = {}): Promise<Traverser> {
  const ctx = resolveContext(options);
  if (ctx.vaultPath && ctx.projectSlug) ensureProjectIndex(ctx.vaultPath, ctx.projectSlug);
  const graph = await loadGraph(ctx.root);
  const fingerprint = computeFingerprint(ctx);
  const cacheFile = options.cacheFile ? resolve(options.cacheFile) : join(ctx.root, ".superskill", "traverse.json");
  let data = options.refresh === true ? null : readCache(cacheFile, fingerprint);
  if (data === null) {
    data = await buildIndexData(ctx, graph, fingerprint);
    writeCache(cacheFile, data);
  }
  return new Traverser(data, graph, ctx);
}
