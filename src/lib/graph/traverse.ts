// SPDX-License-Identifier: Apache-2.0

import { createHash, randomUUID } from "node:crypto";
import { closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync, opendirSync, readSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { findNode, findNodes, loadGraph } from "./store.js";
import { alwaysOnSkillIds, matchTask, packsToLoad } from "./router.js";
import { inferPhase } from "../../rules/router.js";
import type { Graph, ProjectNode, SkillNode } from "./schema.js";
import { catalogRoot, loadCatalog } from "../catalog.js";
import { parseFrontmatter } from "../frontmatter.js";
import { rulesCatalogRoot } from "../../rules/loader.js";
import { buildPrincipleIndex, selectPrinciples } from "../../rules/principles.js";
import type { ParsedPrinciple } from "../../rules/principles.js";
import { isProseWord, keywordKeys, normalizeTerms, simpleStem, termsMatch } from "../../rules/index-builder.js";
import { scanRepo, DEFAULT_SKIP_DIRS } from "../codegraph/scan.js";
import { getParser, languageForFile, loadLanguage, resolveGrammarWasm, supportedLanguages } from "../codegraph/grammars.js";
import type { LanguageId } from "../codegraph/types.js";
import { extractorFor } from "../codegraph/extractors/index.js";
import { ensureProjectIndex, indexPathFor, KnowledgeIndex } from "../knowledge-index.js";
import { validateProjectSlug } from "../../config.js";
import { parseSkillId, resolveSkillSource } from "../skill-source.js";
import type { ResolvedSkillSource } from "../skill-source.js";
import { VaultError, VaultFS } from "../vault-fs.js";

export const TRAVERSE_INDEX_VERSION = 3;
export const DEFAULT_OPEN_BYTES = 4096;
export const MAX_OPEN_BYTES = 8 * 1024 * 1024;
export const DEFAULT_CHILDREN_LIMIT = 100;
export const DEFAULT_RESOLVE_LIMIT = 30;

const MAX_SKILL_RULE_EDGES_PER_RULE = 8;
const MAX_SOURCE_BYTES = MAX_OPEN_BYTES;
const MAX_CACHE_BYTES = 32 * 1024 * 1024;
const MAX_NODES = 100_000;
const MAX_EDGES = 400_000;
const MAX_PARENT_DEPTH = 128;
const TREE_CACHE_LIMIT = 12;
const TREE_FRESH_MS = 500;
const MAX_SKILL_RESOURCE_NODES = 128;
const MAX_SKILL_RESOURCE_DEPTH = 8;
const MAX_SKILL_RESOURCE_DIRECTORIES = 256;
const MAX_SKILL_RESOURCE_ENTRIES = 4096;
const MAX_SKILL_RESOURCE_TOTAL_BYTES = 16 * 1024 * 1024;
const MAX_TRAVERSE_SKILL_RESOURCE_NODES = 2048;
const MAX_TRAVERSE_SKILL_RESOURCE_BYTES = 64 * 1024 * 1024;
const NON_RULE_FILES = new Set(["INDEX.md", "sources.md", "categories.md"]);

export type TraverseKind = "vault" | "skill" | "rule" | "code" | "principle" | "constitution" | "skill_resource" | "container";
export type TraverseContainerKind = "root" | "vault" | "rules" | "skills" | "principles" | "code" | "dir";

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
  | "principle_related"
  | "skill_resource"
  | "code_import"
  | "code_call"
  | "code_reference";

export interface TraverseEdge {
  from: string;
  to: string;
  type: TraverseEdgeType;
  w?: number;
  label?: string;
  confidence?: "EXTRACTED" | "INFERRED";
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

interface TraverseCacheSection {
  fingerprint: string;
  nodes: TraverseNode[];
  edges: TraverseEdge[];
}

interface TraverseCacheFile {
  version: number;
  fingerprint: string;
  builtAt: number;
  sections: {
    code: TraverseCacheSection;
    rules: TraverseCacheSection;
    vault: TraverseCacheSection;
  };
}

interface TraverseCacheRead {
  builtAt: number;
  code: TraverseCacheSection | null;
  rules: TraverseCacheSection | null;
  vault: TraverseCacheSection | null;
}

interface TraverseSectionFingerprints {
  code: string;
  rules: string;
  vault: string;
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
  kind: "skill" | "rule" | "vault" | "code" | "principle";
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
  kind: "vault" | "skill" | "rule" | "code" | "principle" | "constitution" | "skill_resource";
  path?: string;
  bytes: number;
  tokens: number;
  offset_bytes: number;
  next_offset_bytes: number | null;
  read_complete: boolean;
  content_bytes: number;
  truncated: boolean;
  stale?: boolean;
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

interface PrincipleMeta {
  title: string;
  applyWhen: string;
  enforce: string;
  status: string;
  triggers: { keywords: string[]; files: string[]; symbols: string[] };
  related: string[];
  sourcesCount: number;
}

interface PrincipleSource {
  id: string;
  path: string;
  file: string;
  label: string;
  bytes: number;
  meta: PrincipleMeta;
  related: string[];
}

interface SkillResourceSource {
  id: string;
  path: string;
  file: string;
  bytes: number;
  text: boolean;
  label: string;
}

interface IndexedSkillSource {
  resolved: ResolvedSkillSource;
  path: string;
  resources: SkillResourceSource[];
  meta: SkillMeta;
}

interface TraverseContext {
  root: string;
  vaultPath?: string;
  projectSlug?: string;
  vaultFs?: VaultFS;
  catalogDir: string;
  rulesDir: string;
  codeSources?: Set<string>;
  catalogSources?: Set<string>;
  ruleSources?: Map<string, RuleSource>;
  vaultSources?: Set<string>;
  principleSources?: Map<string, PrincipleSource>;
  principles?: ParsedPrinciple[];
  constitutionSource?: { file: string; path: string; bytes: number };
  skillSources?: Map<string, IndexedSkillSource>;
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

function logIo(path: string, error: unknown): void {
  const code = (error as NodeJS.ErrnoException).code;
  if (code !== "ENOENT" && code !== "ENOTDIR") console.error(`[traverse] cannot access ${path}: ${messageOf(error)}`);
}

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number, name: string): number {
  const result = value === undefined ? fallback : value;
  if (!Number.isInteger(result) || result < min || result > max) throw new VaultError("INVALID_ARGUMENT", `${name} must be an integer between ${min} and ${max}`);
  return result;
}

function within(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function canonicalPath(path: string, depth = 0): string {
  if (depth > MAX_PARENT_DEPTH) throw new VaultError("INVALID_ARGUMENT", "Traverse path depth limit exceeded");
  const absolute = resolve(path);
  try { return realpathSync(absolute); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    try {
      if (lstatSync(absolute).isSymbolicLink()) throw new VaultError("PERMISSION_DENIED", `Dangling traverse symlink: ${absolute}`);
    } catch (statError) {
      if ((statError as NodeJS.ErrnoException).code !== "ENOENT") throw statError;
    }
    const parent = dirname(absolute);
    if (parent === absolute) throw error;
    return join(canonicalPath(parent, depth + 1), basename(absolute));
  }
}

function relativeFile(path: unknown): path is string {
  return typeof path === "string" && path.length > 0 && path.length <= 4096 && !isAbsolute(path) && !path.includes("\\") && !path.includes("\0") && path.split("/").every(part => part !== "" && part !== "." && part !== "..");
}

function containedFile(path: string, roots: readonly string[]): string {
  const canonical = realpathSync(path);
  if (!roots.some(root => within(root, canonical))) throw new VaultError("PERMISSION_DENIED", `Traverse source path escapes its root: ${path}`);
  return canonical;
}

function readBoundedFile(path: string, roots: readonly string[], maxBytes = MAX_SOURCE_BYTES, expectedCanonical?: string): string {
  const canonical = containedFile(path, roots);
  if (expectedCanonical !== undefined && canonical !== expectedCanonical) throw new VaultError("PERMISSION_DENIED", `Traverse source identity changed: ${path}`);
  const fd = openSync(canonical, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    const current = lstatSync(canonical);
    if (!stat.isFile() || stat.ino !== current.ino || stat.dev !== current.dev || realpathSync(path) !== canonical) throw new VaultError("PERMISSION_DENIED", `Traverse source is not a stable regular file: ${path}`);
    if (stat.size > maxBytes) throw new VaultError("INVALID_ARGUMENT", `Traverse file exceeds ${maxBytes} bytes: ${path}`);
    const buffer = Buffer.alloc(stat.size + 1);
    let used = 0;
    while (used < buffer.length) {
      const count = readSync(fd, buffer, used, buffer.length - used, used);
      if (count === 0) break;
      used += count;
    }
    if (used > stat.size) throw new VaultError("INVALID_ARGUMENT", `Traverse file grew during read: ${path}`);
    const after = fstatSync(fd);
    const currentAfter = lstatSync(canonical);
    if (after.size !== stat.size || after.mtimeMs !== stat.mtimeMs || after.ctimeMs !== stat.ctimeMs || currentAfter.ino !== stat.ino || currentAfter.dev !== stat.dev || realpathSync(path) !== canonical) throw new VaultError("PERMISSION_DENIED", `Traverse source changed during read: ${path}`);
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, used));
    } catch {
      throw new VaultError("INVALID_ARGUMENT", `Traverse source is not valid UTF-8: ${path}`);
    }
  } finally { closeSync(fd); }
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


function listFiles(dir: string, accept: (name: string) => boolean, skipDirs: ReadonlySet<string> = new Set(), includeHidden = false, stamps?: Map<string, string>): string[] {
  const out: string[] = [];
  const stack = [{ path: dir, depth: 0 }];
  let visited = 0;
  while (stack.length > 0) {
    const { path: current, depth } = stack.pop()!;
    if (++visited > MAX_NODES || depth > MAX_PARENT_DEPTH) throw new VaultError("INVALID_ARGUMENT", "Traverse directory limit exceeded");
    let entries;
    try {
      if (realpathSync(current) !== current) throw new VaultError("PERMISSION_DENIED", `Traverse directory changed to a symlink: ${current}`);
      stamps?.set(current, fileIdentity(current));
      entries = readdirSync(current, { withFileTypes: true });
    } catch (error) {
      logIo(current, error);
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" && (error as NodeJS.ErrnoException).code !== "ENOTDIR") throw error;
      continue;
    }
    for (const entry of entries) {
      if ((!includeHidden && entry.name.startsWith(".")) || entry.name === "node_modules" || entry.name === "dist") continue;
      const abs = join(current, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) stack.push({ path: abs, depth: depth + 1 });
      } else if (entry.isFile() && accept(entry.name)) {
        if (out.length >= MAX_NODES) throw new VaultError("INVALID_ARGUMENT", "Traverse file limit exceeded");
        out.push(abs);
        if (stamps) {
          try { stamps.set(abs, fileIdentity(abs)); }
          catch (error) { logIo(abs, error); }
        }
      }
    }
  }
  return out.sort();
}

interface FileStat {
  mtime: number;
  size: number;
  ctime: number;
}

function statFile(path: string): FileStat | null {
  try {
    const st = statSync(path);
    return { mtime: st.mtimeMs, size: st.size, ctime: st.ctimeMs };
  } catch (error) {
    logIo(path, error);
    return null;
  }
}

function statSize(path: string): number {
  return statFile(path)?.size ?? 0;
}

function fileIdentity(path: string): string {
  const stat = lstatSync(path);
  return JSON.stringify([stat.mode, stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs]);
}

const treeCache = new Map<string, { builtAt: number; files: string[]; fileSet: Set<string>; stamps: Map<string, string>; fingerprint: string }>();

function gitEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, LC_ALL: "C", GIT_OPTIONAL_LOCKS: "0" };
  for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR"]) delete env[key];
  return env;
}

function gitSources(root: string): Set<string> | null {
  try {
    const stdout = execFileSync("git", ["-c", "core.fsmonitor=false", "ls-files", "-co", "--exclude-standard", "-z", "--", "."], { cwd: root, env: gitEnvironment(), timeout: 5000, maxBuffer: 8_000_000, stdio: ["ignore", "pipe", "pipe"] });
    const paths = new TextDecoder("utf-8", { fatal: true }).decode(stdout).split("\0").filter(Boolean);
    if (paths.length > MAX_NODES) throw new VaultError("INVALID_ARGUMENT", "Traverse source enumeration limit exceeded");
    return new Set(paths.filter(relativeFile).map(path => join(root, path)));
  } catch (error) {
    if (/^fatal: not a git repository\b/.test(String((error as { stderr?: unknown }).stderr ?? ""))) return null;
    logIo(root, error);
    throw new VaultError("PERMISSION_DENIED", "Cannot verify non-ignored traverse sources");
  }
}

function assertNotIgnored(root: string, path: string): void {
  try {
    execFileSync("git", ["-c", "core.fsmonitor=false", "check-ignore", "-q", "--", path], { cwd: root, env: gitEnvironment(), timeout: 5000, maxBuffer: 1024, stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    if ((error as { status?: number }).status === 1 || /^fatal: not a git repository\b/.test(String((error as { stderr?: unknown }).stderr ?? ""))) return;
    logIo(path, error);
    throw new VaultError("PERMISSION_DENIED", `Cannot verify ignored source: ${path}`);
  }
  throw new VaultError("PERMISSION_DENIED", `Ignored traverse source: ${path}`);
}

function fileTree(dir: string, kind: "rules" | "catalog" | "code"): { files: string[]; fileSet: Set<string>; fingerprint: string } {
  const key = JSON.stringify([dir, kind]);
  const cached = treeCache.get(key);
  if (cached && Date.now() - cached.builtAt <= TREE_FRESH_MS) {
    let fresh = true;
    for (const [path, stamp] of cached.stamps) {
      try { if (fileIdentity(path) !== stamp) { fresh = false; break; } }
      catch (error) { logIo(path, error); fresh = false; break; }
    }
    if (fresh && cached.stamps.size > 0) {
      treeCache.delete(key);
      treeCache.set(key, cached);
      return cached;
    }
  }
  const stamps = new Map<string, string>();
  const listed = listFiles(dir, kind === "code" ? name => languageForFile(name) !== null || name === ".gitignore" : name => name.endsWith(".md"), kind === "code" ? new Set(DEFAULT_SKIP_DIRS) : kind === "catalog" ? new Set(["rules"]) : new Set(), kind === "code", stamps);
  let files = listed;
  if (kind === "code") {
    const allowed = gitSources(dir);
    const ignoredRoots = allowed === null ? listed.filter(path => basename(path) === ".gitignore").map(dirname) : [];
    files = listed.filter(path => languageForFile(path) !== null && (allowed ? allowed.has(path) : !ignoredRoots.some(root => within(root, path))));
  }
  const hash = createHash("sha256");
  for (const path of listed) hash.update(JSON.stringify([relative(dir, path), stamps.get(path)]));
  if (kind === "code") hash.update(JSON.stringify(files));
  const snapshot = { builtAt: Date.now(), files, fileSet: new Set(files), stamps, fingerprint: hash.digest("hex") };
  treeCache.delete(key);
  treeCache.set(key, snapshot);
  while (treeCache.size > TREE_CACHE_LIMIT) treeCache.delete(treeCache.keys().next().value!);
  return snapshot;
}

function grammarStats(): Array<{ language: string; path: string; mtime: number; size: number }> {
  const stats: Array<{ language: string; path: string; mtime: number; size: number }> = [];
  for (const language of supportedLanguages()) {
    const resolved = resolveGrammarWasm(language);
    if (!resolved) continue;
    const stat = statFile(resolved.path);
    stats.push({ language, path: resolved.path, mtime: stat?.mtime ?? 0, size: stat?.size ?? 0 });
  }
  return stats;
}

function vaultFingerprintData(ctx: TraverseContext): unknown {
  if (!ctx.vaultPath || !ctx.projectSlug) return null;
  const index = indexPathFor(ctx.vaultPath, ctx.projectSlug);
  return {
    index: statFile(index),
    wal: statFile(`${index}-wal`),
  };
}

function computeSectionFingerprints(ctx: TraverseContext): TraverseSectionFingerprints {
  const base = { v: TRAVERSE_INDEX_VERSION, root: ctx.root };
  const rulesTree = fileTree(ctx.rulesDir, "rules");
  const rules = rulesTree.fingerprint;
  const catalogTree = fileTree(ctx.catalogDir, "catalog");
  ctx.catalogSources = catalogTree.fileSet;
  const catalog = catalogTree.fingerprint;
  const graph = statFile(join(ctx.root, ".superskill", "graph.json"));
  const sourceTree = fileTree(ctx.root, "code");
  ctx.codeSources = sourceTree.fileSet;
  const src = sourceTree.fingerprint;
  ctx.ruleSources = ruleCatalog(ctx, rulesTree);
  return {
    code: JSON.stringify({ ...base, kind: "code", src, grammars: grammarStats() }),
    rules: JSON.stringify({ ...base, kind: "rules", rulesDir: ctx.rulesDir, catalogDir: ctx.catalogDir, rules, catalog, graph, skills: skillSourcesFingerprint(ctx) }),
    vault: JSON.stringify({
      ...base,
      kind: "vault",
      vaultPath: ctx.vaultPath ?? null,
      projectSlug: ctx.projectSlug ?? null,
      vault: vaultFingerprintData(ctx),
    }),
  };
}

function combinedFingerprint(fingerprints: TraverseSectionFingerprints): string {
  return createHash("sha256")
    .update(JSON.stringify([fingerprints.code, fingerprints.rules, fingerprints.vault]))
    .digest("hex");
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
    if (this.nodes.size >= MAX_NODES) throw new VaultError("INVALID_ARGUMENT", "Traverse node limit exceeded");
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
    if (this.nodes.size >= MAX_NODES && !this.nodes.has(node.id)) throw new VaultError("INVALID_ARGUMENT", "Traverse node limit exceeded");
    this.nodes.set(node.id, node);
  }

  addEdge(edge: TraverseEdge): void {
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) return;
    const key = `${edge.type}|${edge.from}|${edge.to}`;
    if (this.edgeKeys.has(key)) return;
    if (this.edges.length >= MAX_EDGES) throw new VaultError("INVALID_ARGUMENT", "Traverse edge limit exceeded");
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
      if (node.kind !== "container" && !node.meta?.symbol) {
        let parentId = node.parent;
        const visited = new Set([node.id]);
        while (parentId) {
          if (visited.has(parentId) || visited.size > MAX_PARENT_DEPTH) throw new VaultError("INVALID_ARGUMENT", `Invalid traverse parent chain: ${node.id}`);
          visited.add(parentId);
          const parent = this.nodes.get(parentId);
          if (!parent) break;
          parent.bytes += node.bytes;
          parent.tokens += node.tokens;
          parentId = parent.parent;
        }
      }
    }
    for (const node of this.nodes.values()) {
      if (node.kind === "container" || childCounts.has(node.id)) node.childrenCount = childCounts.get(node.id) ?? 0;
    }
  }
}

function vaultAbsPath(ctx: TraverseContext, relPath: string): string | null {
  if (!ctx.vaultPath || !ctx.projectSlug || !relativeFile(relPath) || !relPath.startsWith(`projects/${ctx.projectSlug}/`)) return null;
  const path = join(ctx.vaultPath, relPath);
  try {
    containedFile(path, [join(ctx.vaultPath, "projects", ctx.projectSlug)]);
    return path;
  } catch (error) {
    logIo(path, error);
    return null;
  }
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
  const index = KnowledgeIndex.openForProject(ctx.vaultPath, ctx.projectSlug);
  const dump = index.graphDump();
  const projectContainer = `vault:projects/${ctx.projectSlug}/`;
  builder.addContainer(projectContainer, `vault:${ctx.projectSlug}`, "graph", "vault");

  for (const note of dump.nodes) {
    const id = `vault:${note.id}`;
    const abs = vaultAbsPath(ctx, note.id);
    if (!abs) continue;
    const bytes = statSize(abs);
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

interface RuleSource {
  id: string;
  path: string;
  file: string;
  label: string;
  bytes: number;
  meta: RuleMeta;
}

const ruleCatalogCache = new Map<string, { fingerprint: string; rules: Map<string, RuleSource> }>();

function ruleCatalog(ctx: TraverseContext, tree = fileTree(ctx.rulesDir, "rules")): Map<string, RuleSource> {
  const cached = ruleCatalogCache.get(ctx.rulesDir);
  if (cached?.fingerprint === tree.fingerprint) return cached.rules;
  const rules = new Map<string, RuleSource>();
  for (const abs of tree.files) {
    if (NON_RULE_FILES.has(basename(abs))) continue;
    let raw: string;
    try {
      raw = readBoundedFile(abs, [ctx.rulesDir], MAX_SOURCE_BYTES, abs);
    } catch (error) {
      logIo(abs, error);
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
    if (rules.has(`rule:${id}`)) throw new VaultError("INVALID_ARGUMENT", `Duplicate traverse rule identity: ${id}`);
    rules.set(`rule:${id}`, {
      id: `rule:${id}`, path: relPath, file: abs, label: title, bytes,
      meta: {
        lang, prefix, title,
        severity: asString(data.severity) ?? "should",
        enforce: asString(data.enforce) ?? "review",
        status: asString(data.status) ?? "draft",
        triggers: parseTriggers(data.triggers),
        related: asStringArray(data.related),
      },
    });
  }
  ruleCatalogCache.delete(ctx.rulesDir);
  ruleCatalogCache.set(ctx.rulesDir, { fingerprint: tree.fingerprint, rules });
  while (ruleCatalogCache.size > TREE_CACHE_LIMIT) ruleCatalogCache.delete(ruleCatalogCache.keys().next().value!);
  return rules;
}

function addRulesSection(builder: Builder, ctx: TraverseContext): void {
  builder.addContainer("rules", "rules", "graph", "rules");
  for (const rule of (ctx.ruleSources ??= ruleCatalog(ctx)).values()) {
    const { lang, prefix } = rule.meta;
    const langContainer = `rules:${lang}`;
    const prefixContainer = `${langContainer}/${prefix}`;
    builder.addContainer(langContainer, lang, "rules", "rules");
    builder.addContainer(prefixContainer, prefix, langContainer, "rules");
    builder.addNode({
      id: rule.id,
      kind: "rule",
      label: rule.label,
      parent: prefixContainer,
      path: rule.path,
      file: rule.file,
      bytes: rule.bytes,
      tokens: traverseTokensForBytes(rule.bytes),
      meta: { ...rule.meta },
    });
  }
}

function countSources(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.filter(item => record(item) && (asString(item.title) !== undefined || asString(item.url) !== undefined)).length;
}

function seeAlsoIds(body: string): string[] {
  const section = body.match(/(?:^|\n)##\s+See Also\s*\n([\s\S]*?)(?=\n##\s+|$)/i)?.[1] ?? "";
  const ids = new Set<string>();
  for (const match of section.matchAll(/\[([^\]]+)\]\(([^)#]+)(?:#[^)]+)?\)/g)) {
    const label = match[1].trim();
    const target = match[2].trim();
    if (label.startsWith("principle-") && /^[a-z0-9][a-z0-9-]*$/.test(label.slice("principle-".length))) ids.add(label);
    const file = target.endsWith(".md") ? target.slice(0, -3) : "";
    if (/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(file)) ids.add(`principle-${file}`);
  }
  return [...ids].sort();
}

function principleCatalog(ctx: TraverseContext): Map<string, PrincipleSource> {
  if (ctx.principleSources) return ctx.principleSources;
  const files = ctx.catalogSources ??= fileTree(ctx.catalogDir, "catalog").fileSet;
  const sources = new Map<string, PrincipleSource>();
  const parsed: ParsedPrinciple[] = [];
  for (const abs of [...files].sort()) {
    const relPath = relative(ctx.catalogDir, abs).split(sep).join("/");
    if (!/^principles\/[A-Za-z0-9][A-Za-z0-9-]*\.md$/.test(relPath)) continue;
    let raw: string;
    try {
      raw = readBoundedFile(abs, [ctx.catalogDir], MAX_SOURCE_BYTES, abs);
    } catch (error) {
      logIo(abs, error);
      continue;
    }
    const { data, content: body } = parseFrontmatter(raw);
    const id = asString(data.id);
    const title = asString(data.title);
    const applyWhen = asString(data.apply_when);
    const stem = relPath.slice("principles/".length, -3);
    if (id !== `principle-${stem}` || !title || !applyWhen || !["draft", "verified"].includes(String(data.status))) continue;
    const enforce = asString(data.enforce) ?? "review";
    const safeEnforce = ["tool", "review", "both"].includes(enforce) ? enforce : "review";
    const triggers = parseTriggers(data.triggers);
    const related = [...new Set([...asStringArray(data.related), ...seeAlsoIds(body)])].sort();
    const parsedPrinciple: ParsedPrinciple = {
      id,
      title,
      applyWhen,
      enforce: safeEnforce as ParsedPrinciple["enforce"],
      status: data.status as ParsedPrinciple["status"],
      triggers,
      related,
      sourcesCount: countSources(data.sources),
      body,
      path: relPath.slice("principles/".length),
    };
    const nodeId = `principle:${id}`;
    const bytes = statSize(abs);
    sources.set(nodeId, {
      id,
      path: relPath,
      file: abs,
      label: title,
      bytes,
      related,
      meta: {
        title,
        applyWhen,
        enforce: safeEnforce,
        status: parsedPrinciple.status,
        triggers,
        related,
        sourcesCount: parsedPrinciple.sourcesCount,
      },
    });
    parsed.push(parsedPrinciple);
  }
  ctx.principleSources = sources;
  ctx.principles = parsed;
  return sources;
}

function constitutionSource(ctx: TraverseContext): { file: string; path: string; bytes: number } | undefined {
  if (ctx.constitutionSource) return ctx.constitutionSource;
  const path = "constitution.md";
  const file = join(ctx.catalogDir, path);
  const files = ctx.catalogSources ??= fileTree(ctx.catalogDir, "catalog").fileSet;
  if (!files.has(file)) return undefined;
  try {
    const canonical = containedFile(file, [ctx.catalogDir]);
    if (canonical !== file || !lstatSync(canonical).isFile()) return undefined;
    const bytes = statSize(canonical);
    if (bytes > MAX_SOURCE_BYTES) return undefined;
    ctx.constitutionSource = { file: canonical, path, bytes };
    return ctx.constitutionSource;
  } catch (error) {
    logIo(file, error);
    return undefined;
  }
}

function addPrinciplesSection(builder: Builder, ctx: TraverseContext): void {
  builder.addContainer("principles", "principles", "graph", "principles");
  const principles = principleCatalog(ctx);
  for (const source of principles.values()) {
    builder.addNode({
      id: `principle:${source.id}`,
      kind: "principle",
      label: source.label,
      parent: "principles",
      path: source.path,
      file: source.file,
      bytes: source.bytes,
      tokens: traverseTokensForBytes(source.bytes),
      meta: { ...source.meta },
    });
  }
  for (const source of principles.values()) {
    for (const related of source.related) {
      const target = `principle:${related}`;
      if (target !== `principle:${source.id}`) builder.addEdge({ from: `principle:${source.id}`, to: target, type: "principle_related" });
    }
  }
  const constitution = constitutionSource(ctx);
  if (constitution) {
    builder.addNode({
      id: "constitution",
      kind: "constitution",
      label: "SuperSkill Constitution (T0)",
      parent: "graph",
      path: constitution.path,
      file: constitution.file,
      bytes: constitution.bytes,
      tokens: traverseTokensForBytes(constitution.bytes),
      meta: { title: "SuperSkill Constitution (T0)" },
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

function skillResourceId(owner: string, path: string): string {
  return `skill-resource:${owner}:${path}`;
}

function isUtf8TextFile(path: string, roots: readonly string[]): boolean {
  const canonical = containedFile(path, roots);
  const fd = openSync(canonical, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = fstatSync(fd);
    const current = lstatSync(canonical);
    if (!before.isFile() || before.ino !== current.ino || before.dev !== current.dev || realpathSync(path) !== canonical) throw new VaultError("PERMISSION_DENIED", `Traverse resource is not a stable regular file: ${path}`);
    if (before.size > MAX_SOURCE_BYTES) return false;
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const chunk = Buffer.alloc(64 * 1024);
    let offset = 0;
    let text = true;
    while (offset < before.size) {
      const count = readSync(fd, chunk, 0, Math.min(chunk.length, before.size - offset), offset);
      if (count === 0) throw new VaultError("PERMISSION_DENIED", `Traverse resource changed during read: ${path}`);
      const bytes = chunk.subarray(0, count);
      if (bytes.includes(0)) text = false;
      if (text) {
        try { decoder.decode(bytes, { stream: true }); }
        catch { text = false; }
      }
      offset += count;
    }
    if (text) {
      try { decoder.decode(); }
      catch { text = false; }
    }
    const after = fstatSync(fd);
    const currentAfter = lstatSync(canonical);
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs || currentAfter.ino !== before.ino || currentAfter.dev !== before.dev || realpathSync(path) !== canonical) throw new VaultError("PERMISSION_DENIED", `Traverse resource changed during read: ${path}`);
    return text;
  } finally { closeSync(fd); }
}

function enumerateSkillResources(owner: string, resolved: ResolvedSkillSource, budget: { nodes: number; bytes: number }): SkillResourceSource[] {
  const nodeLimit = Math.min(MAX_SKILL_RESOURCE_NODES, budget.nodes);
  const byteLimit = Math.min(MAX_SKILL_RESOURCE_TOTAL_BYTES, budget.bytes);
  if (nodeLimit <= 0 || byteLimit <= 0) return [];
  const bundleDir = resolved.baseDir;
  if (bundleDir !== dirname(resolved.file)) throw new VaultError("PERMISSION_DENIED", `Traverse skill bundle does not match its source file: ${resolved.file}`);
  if (!resolved.allowedRoots.some(root => within(root, bundleDir))) return [];
  if (realpathSync(bundleDir) !== bundleDir) throw new VaultError("PERMISSION_DENIED", `Traverse skill bundle changed to a symlink: ${bundleDir}`);
  const resources: SkillResourceSource[] = [];
  const stack = [{ path: bundleDir, depth: 0 }];
  let totalBytes = 0;
  let visitedDirectories = 0;
  let visitedEntries = 0;
  while (stack.length > 0 && resources.length < nodeLimit) {
    const current = stack.pop()!;
    if (++visitedDirectories > MAX_SKILL_RESOURCE_DIRECTORIES) return [];
    if (current.depth > MAX_SKILL_RESOURCE_DEPTH) continue;
    let entries: import("node:fs").Dirent[] = [];
    let overflow = false;
    let directory: ReturnType<typeof opendirSync> | undefined;
    try {
      if (realpathSync(current.path) !== current.path) throw new VaultError("PERMISSION_DENIED", `Traverse skill directory changed to a symlink: ${current.path}`);
      directory = opendirSync(current.path);
      while (visitedEntries < MAX_SKILL_RESOURCE_ENTRIES) {
        const entry = directory.readSync();
        if (entry === null) break;
        entries.push(entry);
        visitedEntries += 1;
      }
      if (visitedEntries === MAX_SKILL_RESOURCE_ENTRIES && directory.readSync() !== null) overflow = true;
    } catch (error) {
      logIo(current.path, error);
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" && (error as NodeJS.ErrnoException).code !== "ENOTDIR") throw error;
      continue;
    } finally {
      try { directory?.closeSync(); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ERR_DIR_CLOSED") throw error;
      }
    }
    if (overflow) return [];
    entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    const directories: string[] = [];
    for (const entry of entries) {
      if (entry.name === "SKILL.md" || entry.name.startsWith(".") || ["node_modules", "dist"].includes(entry.name)) continue;
      const abs = join(current.path, entry.name);
      if (entry.isDirectory()) {
        directories.push(abs);
        continue;
      }
      if (!entry.isFile()) continue;
      const path = relative(bundleDir, abs).split(sep).join("/");
      if (!relativeFile(path) || path.length + owner.length + 16 > 4096) continue;
      let stat;
      try {
        if (realpathSync(abs) !== abs) continue;
        stat = lstatSync(abs);
      } catch (error) { logIo(abs, error); continue; }
      if (!stat.isFile() || stat.size > MAX_SOURCE_BYTES || totalBytes + stat.size > byteLimit) continue;
      totalBytes += stat.size;
      const text = isUtf8TextFile(abs, [bundleDir]);
      resources.push({ id: skillResourceId(owner, path), path, file: abs, bytes: stat.size, text, label: entry.name });
      if (resources.length >= nodeLimit) break;
    }
    for (let index = directories.length - 1; index >= 0; index -= 1) {
      if (current.depth < MAX_SKILL_RESOURCE_DEPTH) stack.push({ path: directories[index], depth: current.depth + 1 });
    }
  }
  return resources.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

function skillDisplayPath(ctx: TraverseContext, source: ResolvedSkillSource): string | null {
  if (source.source === "catalog") {
    if (!within(ctx.catalogDir, source.file)) return null;
    return relative(ctx.catalogDir, source.file).split(sep).join("/");
  }
  if (within(ctx.root, source.file)) return relative(ctx.root, source.file).split(sep).join("/");
  if (source.source === "cache") {
    const root = source.allowedRoots.find(candidate => within(candidate, source.file));
    return root ? `~/.superskill/skills/${relative(root, source.file).split(sep).join("/")}` : null;
  }
  return null;
}

async function resolveSkillEntry(ctx: TraverseContext, entry: SkillEntry, budget: { nodes: number; bytes: number }): Promise<IndexedSkillSource | null> {
  let resolved = await resolveSkillSource(ctx.root, entry.id);
  const packagedCatalog = canonicalPath(catalogRoot());
  if (ctx.catalogDir !== packagedCatalog && parseSkillId(entry.id)?.source === "catalog") {
    const file = entry.path && relativeFile(entry.path) && entry.path === `${entry.id}.md` ? join(ctx.catalogDir, entry.path) : "";
    const sources = ctx.catalogSources ??= fileTree(ctx.catalogDir, "catalog").fileSet;
    if (file && sources.has(file)) {
      try {
        const canonical = containedFile(file, [ctx.catalogDir]);
        if (canonical === file && lstatSync(canonical).isFile()) resolved = { id: entry.id, source: "catalog", file: canonical, baseDir: ctx.catalogDir, allowedRoots: [ctx.catalogDir] };
      } catch (error) { logIo(file, error); }
    } else if (resolved?.source === "catalog") {
      resolved = null;
    }
  }
  if (!resolved || resolved.id !== entry.id) return null;
  const roots = resolved.allowedRoots.map(root => {
    const canonical = realpathSync(root);
    if (canonical !== root) throw new VaultError("PERMISSION_DENIED", `Traverse skill root is a symlink: ${root}`);
    return canonical;
  });
  const file = containedFile(resolved.file, roots);
  if (file !== resolved.file || !lstatSync(file).isFile()) throw new VaultError("PERMISSION_DENIED", `Traverse skill source is not canonical: ${resolved.file}`);
  if (resolved.source !== "catalog" && resolved.baseDir !== dirname(file)) throw new VaultError("PERMISSION_DENIED", `Traverse skill bundle is not canonical: ${resolved.baseDir}`);
  if (statSize(file) > MAX_SOURCE_BYTES) return null;
  const displayPath = skillDisplayPath(ctx, resolved);
  if (!displayPath || !relativeFile(displayPath)) return null;
  const trusted = { ...resolved, allowedRoots: roots };
  return {
    resolved: trusted,
    path: displayPath,
    resources: trusted.source === "catalog" ? [] : enumerateSkillResources(entry.id, trusted, budget),
    meta: { pack: entry.pack, langs: entry.langs, triggers: entry.triggers, always: entry.always, w: entry.w },
  };
}

async function prepareSkillSources(ctx: TraverseContext, graph: Graph): Promise<void> {
  const graphSkills = findNodes<SkillNode>(graph, "skill");
  const entries: SkillEntry[] = graphSkills.length > 0
    ? graphSkills.map(skill => ({ id: skill.id, pack: skill.pack, langs: skill.langs ?? [], triggers: skill.triggers ?? [], always: skill.always === true, w: skill.w, path: skill.path }))
    : (await loadCatalog()).map(skill => ({ id: skill.id, pack: skill.pack, langs: skill.langs, triggers: skill.triggers, always: skill.always, w: 0.8, path: skill.path }));
  if (entries.length > MAX_NODES) throw new VaultError("INVALID_ARGUMENT", "Traverse skill source limit exceeded");
  ctx.skillSources = new Map();
  const budget = { nodes: MAX_TRAVERSE_SKILL_RESOURCE_NODES, bytes: MAX_TRAVERSE_SKILL_RESOURCE_BYTES };
  for (const entry of entries) {
    const source = await resolveSkillEntry(ctx, entry, budget);
    if (source) {
      ctx.skillSources.set(entry.id, source);
      budget.nodes -= source.resources.length;
      budget.bytes -= source.resources.reduce((total, resource) => total + resource.bytes, 0);
    }
  }
}

function skillSourcesFingerprint(ctx: TraverseContext): unknown {
  const sources: Map<string, IndexedSkillSource> = ctx.skillSources ?? new Map<string, IndexedSkillSource>();
  return [...sources.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([id, source]) => [
    id,
    source.resolved.source,
    fileIdentity(source.resolved.file),
    source.resources.map((resource: SkillResourceSource) => [resource.path, fileIdentity(resource.file), resource.text]),
  ]);
}

function sourceFile(node: TraverseNode, ctx: TraverseContext): { file: string; roots: string[] } {
  if (!relativeFile(node.path)) throw new VaultError("PERMISSION_DENIED", `Invalid traverse source path: ${node.id}`);
  let expected: string;
  let roots: string[];
  if (node.kind === "vault") {
    if (!ctx.vaultPath || !ctx.projectSlug || !node.path.startsWith(`projects/${ctx.projectSlug}/`) || !node.path.endsWith(".md") || node.id !== `vault:${node.path}` || !ctx.vaultSources?.has(node.path)) throw new VaultError("PERMISSION_DENIED", `Vault node escapes indexed project notes: ${node.id}`);
    expected = join(ctx.vaultPath, node.path);
    if (realpathSync(expected) !== expected || !lstatSync(expected).isFile()) throw new VaultError("PERMISSION_DENIED", `Vault source is no longer an indexed regular file: ${node.path}`);
    roots = [join(ctx.vaultPath, "projects", ctx.projectSlug)];
  } else if (node.kind === "code") {
    expected = join(ctx.root, node.path);
    const language = languageForFile(node.path);
    const expectedId = node.meta?.symbol ? `symbol:sym:${node.path}#${node.label}@${node.meta.startLine}` : `code:${node.path}`;
    if (!language || node.meta?.language !== language || node.id !== expectedId || !ctx.codeSources?.has(expected) || node.path.split("/").some(part => DEFAULT_SKIP_DIRS.includes(part)) || realpathSync(expected) !== expected || !lstatSync(expected).isFile()) throw new VaultError("PERMISSION_DENIED", `Invalid enumerated code source: ${node.path}`);
    roots = [ctx.root];
  } else if (node.kind === "rule") {
    const source = (ctx.ruleSources ??= ruleCatalog(ctx)).get(node.id);
    if (!source || node.path !== source.path || node.meta?.lang !== source.meta.lang || node.label !== source.label) throw new VaultError("PERMISSION_DENIED", `Invalid rule source identity: ${node.id}`);
    expected = source.file;
    roots = [ctx.rulesDir];
  } else if (node.kind === "skill") {
    const source = ctx.skillSources?.get(node.id.slice("skill:".length));
    if (!source || source.path !== node.path || node.label !== node.id.slice("skill:".length) || JSON.stringify(node.meta) !== JSON.stringify(source.meta)) throw new VaultError("PERMISSION_DENIED", `Invalid skill path: ${node.path}`);
    expected = source.resolved.file;
    roots = source.resolved.allowedRoots;
  } else if (node.kind === "skill_resource") {
    const owner = node.meta?.owner;
    const source = typeof owner === "string" ? ctx.skillSources?.get(owner) : undefined;
    const resource = source?.resources.find(item => item.id === node.id);
    if (!source || !resource || node.id !== skillResourceId(owner as string, node.path) || node.parent !== `skill:${owner}` || node.label !== resource.label || node.bytes !== resource.bytes || node.meta?.text !== resource.text) throw new VaultError("PERMISSION_DENIED", `Invalid skill resource identity: ${node.id}`);
    expected = resource.file;
    roots = [source.resolved.baseDir];
    if (realpathSync(roots[0]) !== roots[0]) throw new VaultError("PERMISSION_DENIED", `Traverse skill bundle changed to a symlink: ${roots[0]}`);
  } else if (node.kind === "principle") {
    const source = (ctx.principleSources ??= principleCatalog(ctx)).get(node.id);
    if (!source || node.path !== source.path || node.label !== source.label || node.bytes !== source.bytes || JSON.stringify(node.meta) !== JSON.stringify(source.meta)) throw new VaultError("PERMISSION_DENIED", `Invalid principle source identity: ${node.id}`);
    expected = source.file;
    roots = [ctx.catalogDir];
  } else if (node.kind === "constitution") {
    const source = constitutionSource(ctx);
    if (node.id !== "constitution" || !source || node.path !== source.path || node.bytes !== source.bytes || node.label !== "SuperSkill Constitution (T0)" || node.meta?.title !== node.label) throw new VaultError("PERMISSION_DENIED", `Invalid constitution source identity: ${node.id}`);
    expected = source.file;
    roots = [ctx.catalogDir];
  } else {
    throw new VaultError("PERMISSION_DENIED", `Invalid traverse source kind: ${node.kind}`);
  }
  if (node.file && resolve(node.file) !== expected) throw new VaultError("PERMISSION_DENIED", `Traverse file does not match source path: ${node.id}`);
  const canonical = containedFile(expected, roots);
  if ((node.kind === "skill_resource" || node.kind === "principle" || node.kind === "constitution") && canonical !== expected) throw new VaultError("PERMISSION_DENIED", `Traverse source is not its canonical file: ${node.id}`);
  return { file: canonical, roots };
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
    const indexed = ctx.skillSources?.get(entry.id);
    const file = indexed?.resolved.file;
    const path = indexed?.path;
    const bytes = file ? statSize(file) : 0;
    const id = `skill:${entry.id}`;
    builder.addNode({
      id,
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
    for (const resource of indexed?.resources ?? []) {
      builder.addNode({
        id: resource.id,
        kind: "skill_resource",
        label: resource.label,
        parent: id,
        path: resource.path,
        file: resource.file,
        bytes: resource.bytes,
        tokens: traverseTokensForBytes(resource.bytes),
        meta: { owner: entry.id, text: resource.text },
      });
      builder.addEdge({ from: id, to: resource.id, type: "skill_resource" });
    }
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

async function addCodeSection(builder: Builder, ctx: TraverseContext): Promise<void> {
  builder.addContainer("code", "code", "graph", "code");
  const { graph } = await scanRepo(ctx.root);
  const ids = new Map<string, string>();
  const symbolsByFile = new Map<string, typeof graph.nodes>();
  for (const node of graph.nodes) {
    if (node.kind === "module" || node.kind === "import-source") continue;
    const nodes = symbolsByFile.get(node.file);
    if (nodes) nodes.push(node);
    else symbolsByFile.set(node.file, [node]);
  }
  for (const file of graph.nodes.filter(node => node.kind === "module")) {
    if (!relativeFile(file.file)) continue;
    const abs = join(ctx.root, file.file);
    const stat = statFile(abs);
    const bytes = stat?.size ?? 0;
    const id = `code:${file.file}`;
    ids.set(file.id, id);
    builder.addNode({ id, kind: "code", label: file.file.split("/").pop()!, parent: ensureCodeDirs(builder, file.file), path: file.file, file: abs, bytes, tokens: traverseTokensForBytes(bytes), meta: { language: file.language } });
    let lines: string[];
    try { lines = readBoundedFile(abs, [ctx.root], MAX_SOURCE_BYTES, abs).split("\n"); }
    catch (error) { logIo(abs, error); continue; }
    for (const node of symbolsByFile.get(file.file) ?? []) {
      const id = `symbol:${node.id}`;
      const content = lines.slice(node.span.startLine - 1, node.span.endLine).join("\n");
      const bytes = Buffer.byteLength(content, "utf8");
      ids.set(node.id, id);
      builder.addNode({ id, kind: "code", label: node.name, parent: `code:${node.file}`, path: node.file, file: abs, bytes, tokens: traverseTokensForBytes(bytes), meta: { symbol: true, kind: node.kind, language: node.language, mtime: stat?.mtime ?? -1, ctime: stat?.ctime ?? -1, size: stat?.size ?? -1, ...node.span } });
    }
  }
  for (const edge of graph.edges) {
    const from = ids.get(edge.from);
    const to = ids.get(edge.to);
    const type = edge.kind === "imports" ? "code_import" : edge.kind === "calls" ? "code_call" : edge.kind === "references" ? "code_reference" : null;
    if (from && to && type) builder.addEdge({ from, to, type, confidence: edge.confidence });
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

async function buildRulesSection(ctx: TraverseContext, graph: Graph, fingerprint: string): Promise<TraverseCacheSection> {
  const builder = new Builder();
  builder.addContainer("graph", "graph", undefined, "root");
  addRulesSection(builder, ctx);
  addPrinciplesSection(builder, ctx);
  await addSkillsSection(builder, ctx, graph);
  addSkillRuleEdges(builder);
  addRuleRelatedEdges(builder);
  addGraphEdges(builder, graph);
  return { fingerprint, nodes: [...builder.nodes.values()], edges: builder.edges };
}

async function buildCodeSection(ctx: TraverseContext, fingerprint: string): Promise<TraverseCacheSection> {
  const builder = new Builder();
  await addCodeSection(builder, ctx);
  return { fingerprint, nodes: [...builder.nodes.values()], edges: builder.edges };
}

function buildVaultSection(ctx: TraverseContext, fingerprint: string): TraverseCacheSection {
  const builder = new Builder();
  addVaultSection(builder, ctx);
  return { fingerprint, nodes: [...builder.nodes.values()], edges: builder.edges };
}

function assembleIndexData(
  ctx: TraverseContext,
  sections: { code: TraverseCacheSection; rules: TraverseCacheSection; vault: TraverseCacheSection },
  fingerprint: string,
  builtAt: number,
): TraverseIndexData {
  const builder = new Builder();
  builder.addContainer("graph", "graph", undefined, "root");
  for (const section of [sections.rules, sections.code, sections.vault]) {
    for (const node of section.nodes) builder.addNode(node.kind === "container" ? { ...node, bytes: 0, tokens: 0 } : { ...node });
    for (const edge of section.edges) builder.addEdge(edge);
  }
  builder.finalize();
  return {
    version: TRAVERSE_INDEX_VERSION,
    fingerprint,
    builtAt,
    root: ctx.root,
    vaultPath: ctx.vaultPath ?? null,
    projectSlug: ctx.projectSlug ?? null,
    catalogDir: ctx.catalogDir,
    rulesDir: ctx.rulesDir,
    nodes: [...builder.nodes.values()],
    edges: builder.edges,
  };
}

function writeCache(cacheFile: string, data: TraverseCacheFile, cacheRoot: string): void {
  const tmp = `${cacheFile}.tmp-${process.pid}-${randomUUID()}`;
  try {
    mkdirSync(dirname(cacheFile), { recursive: true });
    const parent = realpathSync(dirname(cacheFile));
    if (parent !== cacheRoot && !within(cacheRoot, parent)) throw new VaultError("PERMISSION_DENIED", `Traverse cache escapes root: ${cacheFile}`);
    const raw = JSON.stringify(data);
    if (Buffer.byteLength(raw, "utf8") > MAX_CACHE_BYTES) throw new VaultError("INVALID_ARGUMENT", "Traverse cache size limit exceeded");
    writeFileSync(tmp, raw, { encoding: "utf8", flag: "wx", mode: 0o600 });
    renameSync(tmp, cacheFile);
  } catch (error: unknown) {
    console.error(`[traverse] failed to write cache ${cacheFile}: ${messageOf(error)}`);
    try {
      rmSync(tmp, { force: true });
    } catch (cleanupError: unknown) {
      console.error(`[traverse] failed to remove temp cache ${tmp}: ${messageOf(cleanupError)}`);
    }
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every(key => keys.includes(key));
}

function shortString(value: unknown, max = 4096): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max && !value.includes("\0");
}

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 512 && value.every(item => shortString(item));
}

function nonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validNode(value: unknown, ctx: TraverseContext): value is TraverseNode {
  if (!record(value) || !shortString(value.id) || !shortString(value.label) || !nonnegativeInteger(value.bytes) || !nonnegativeInteger(value.tokens)) return false;
  if (!onlyKeys(value, ["id", "kind", "label", "parent", "path", "file", "bytes", "tokens", "childrenCount", "meta"])) return false;
  if (value.parent !== undefined && !shortString(value.parent)) return false;
  if (value.childrenCount !== undefined && !nonnegativeInteger(value.childrenCount)) return false;
  if (value.file !== undefined && (!shortString(value.file) || !isAbsolute(value.file))) return false;
  if (value.path !== undefined && !relativeFile(value.path)) return false;
  if (value.meta !== undefined && !record(value.meta)) return false;
  const meta = value.meta ?? {};
  if (Object.keys(meta).length > 32) return false;
  if (value.kind === "container") {
    return value.file === undefined && value.path === undefined && onlyKeys(meta, ["container"]) && ["root", "vault", "rules", "skills", "principles", "code", "dir"].includes(String(meta.container));
  }
  if (value.bytes > MAX_SOURCE_BYTES || value.tokens !== traverseTokensForBytes(value.bytes)) return false;
  if (value.kind === "skill") {
    if (!onlyKeys(meta, ["pack", "langs", "triggers", "always", "w"])) return false;
    if (!value.id.startsWith("skill:") || !stringList(meta.langs) || !stringList(meta.triggers) || typeof meta.always !== "boolean" || typeof meta.w !== "number" || !Number.isFinite(meta.w) || meta.w < 0 || meta.w > 1 || (meta.pack !== undefined && !shortString(meta.pack))) return false;
    if (value.file === undefined && value.path === undefined) return value.bytes === 0;
  } else if (value.kind === "rule") {
    if (!onlyKeys(meta, ["lang", "prefix", "title", "severity", "enforce", "status", "triggers", "related", "linked_skills", "linked_skills_edges"])) return false;
    if (!value.id.startsWith("rule:") || !["lang", "prefix", "title", "severity", "enforce", "status"].every(key => shortString(meta[key])) || !record(meta.triggers) || !["keywords", "files", "symbols"].every(key => stringList((meta.triggers as Record<string, unknown>)[key])) || !stringList(meta.related)) return false;
    if (!onlyKeys(meta.triggers, ["keywords", "files", "symbols"]) || ["linked_skills", "linked_skills_edges"].some(key => meta[key] !== undefined && !nonnegativeInteger(meta[key]))) return false;
  } else if (value.kind === "code") {
    if (!onlyKeys(meta, meta.symbol ? ["symbol", "kind", "language", "mtime", "ctime", "size", "startLine", "endLine", "startColumn", "endColumn", "startByte", "endByte"] : ["language"])) return false;
    if (!shortString(meta.language) || (!value.id.startsWith("code:") && !value.id.startsWith("symbol:"))) return false;
    if (meta.symbol !== undefined && meta.symbol !== true) return false;
    if (meta.symbol) {
      if (!shortString(meta.kind) || !["class", "function", "method", "interface", "type", "const"].includes(meta.kind) || !nonnegativeInteger(meta.startLine) || meta.startLine < 1 || !nonnegativeInteger(meta.endLine) || meta.endLine < meta.startLine || meta.endLine > MAX_SOURCE_BYTES + 1) return false;
      if (!["mtime", "size"].every(key => typeof meta[key] === "number" && Number.isFinite(meta[key]) && (meta[key] as number) >= 0)) return false;
      if (meta.ctime !== undefined && (typeof meta.ctime !== "number" || !Number.isFinite(meta.ctime) || meta.ctime < 0)) return false;
      for (const key of ["startColumn", "endColumn", "startByte", "endByte"]) if (meta[key] !== undefined && !nonnegativeInteger(meta[key])) return false;
    } else if (value.id !== `code:${value.path}`) return false;
  } else if (value.kind === "vault") {
    if (!onlyKeys(meta, ["type"])) return false;
    if (!value.id.startsWith("vault:") || (meta.type !== undefined && !shortString(meta.type))) return false;
  } else if (value.kind === "principle") {
    if (!onlyKeys(meta, ["title", "applyWhen", "enforce", "status", "triggers", "related", "sourcesCount"])) return false;
    if (!value.id.startsWith("principle:") || !shortString(meta.title) || !shortString(meta.applyWhen) || !["tool", "review", "both"].includes(String(meta.enforce)) || !["draft", "verified"].includes(String(meta.status)) || !record(meta.triggers) || !["keywords", "files", "symbols"].every(key => stringList((meta.triggers as Record<string, unknown>)[key])) || !stringList(meta.related) || !nonnegativeInteger(meta.sourcesCount)) return false;
  } else if (value.kind === "constitution") {
    if (value.id !== "constitution" || !onlyKeys(meta, ["title"]) || !shortString(meta.title)) return false;
  } else if (value.kind === "skill_resource") {
    if (!value.id.startsWith("skill-resource:") || !onlyKeys(meta, ["owner", "text"]) || !shortString(meta.owner) || typeof meta.text !== "boolean") return false;
  } else return false;
  try {
    if (!value.file || !value.path) return false;
    const source = sourceFile(value as unknown as TraverseNode, ctx);
    if (value.kind === "skill" && value.bytes !== statSize(source.file)) return false;
    return true;
  } catch (error) { logIo(String(value.file), error); return false; }
}

const EDGE_TYPES = new Set<TraverseEdgeType>(["vault_related", "rule_related", "principle_related", "skill_resource", "skill_rule_lang", "skill_rule_trigger", "skill_coactivation", "project_skill", "code_import", "code_call", "code_reference"]);

function validEdge(value: unknown, ids: Set<string>): value is TraverseEdge {
  return record(value) && onlyKeys(value, ["from", "to", "type", "w", "label", "confidence"]) && shortString(value.from) && shortString(value.to) && ids.has(value.from) && ids.has(value.to) && EDGE_TYPES.has(value.type as TraverseEdgeType) && (value.w === undefined || (typeof value.w === "number" && Number.isFinite(value.w) && value.w >= 0 && value.w <= 1)) && (value.label === undefined || shortString(value.label)) && (value.confidence === undefined || value.confidence === "EXTRACTED" || value.confidence === "INFERRED");
}

function sectionFromCache(value: unknown, fingerprint: string, ctx: TraverseContext, kind: "code" | "rules" | "vault"): TraverseCacheSection | null {
  if (!record(value)) return null;
  const section = value as Partial<TraverseCacheSection>;
  if (section.fingerprint !== fingerprint) return null;
  if (!Array.isArray(section.nodes) || !Array.isArray(section.edges) || section.nodes.length > MAX_NODES || section.edges.length > MAX_EDGES) return null;
  const ids = new Set<string>();
  const parents = new Map<string, string | undefined>();
  for (const node of section.nodes) {
    if (!validNode(node, ctx) || ids.has(node.id)) return null;
    if (kind === "code" && !(node.kind === "code" || (node.kind === "container" && (node.id === "code" || node.id.startsWith("code:"))))) return null;
    if (kind === "vault" && !(node.kind === "vault" || (node.kind === "container" && node.id.startsWith(`vault:projects/${ctx.projectSlug}/`)))) return null;
    if (kind === "rules" && !(node.kind === "rule" || node.kind === "skill" || node.kind === "principle" || node.kind === "constitution" || node.kind === "skill_resource" || (node.kind === "container" && (node.id === "graph" || node.id === "rules" || node.id === "skills" || node.id === "principles" || node.id.startsWith("rules:") || node.id.startsWith("skills:"))))) return null;
    ids.add(node.id);
    parents.set(node.id, node.parent);
  }
  for (const node of section.nodes) {
    const seen = new Set([node.id]);
    let parent = node.parent;
    while (parent) {
      if (seen.has(parent) || seen.size > MAX_PARENT_DEPTH || (parent !== "graph" && !ids.has(parent))) return null;
      seen.add(parent);
      parent = parents.get(parent);
    }
  }
  if (section.edges.some(edge => !validEdge(edge, ids))) return null;
  const nodesById = new Map(section.nodes.map(node => [node.id, node]));
  for (const edge of section.edges) {
    if (edge.type === "principle_related") {
      const from = nodesById.get(edge.from);
      const to = nodesById.get(edge.to);
      if (from?.kind !== "principle" || to?.kind !== "principle" || !(from.meta?.related as string[]).includes(to.id.slice("principle:".length))) return null;
    } else if (edge.type === "skill_resource") {
      const from = nodesById.get(edge.from);
      const to = nodesById.get(edge.to);
      if (from?.kind !== "skill" || to?.kind !== "skill_resource" || to.parent !== from.id || to.meta?.owner !== from.id.slice("skill:".length)) return null;
    }
  }
  return { fingerprint, nodes: section.nodes, edges: section.edges };
}

function readCache(cacheFile: string, fingerprints: TraverseSectionFingerprints, ctx: TraverseContext, cacheRoot: string): TraverseCacheRead | null {
  try {
    const parsed = JSON.parse(readBoundedFile(cacheFile, [cacheRoot], MAX_CACHE_BYTES)) as Partial<TraverseCacheFile>;
    if (!record(parsed)) return null;
    if (parsed.version !== TRAVERSE_INDEX_VERSION || parsed.sections === undefined || parsed.sections === null) return null;
    const sections = parsed.sections as Partial<TraverseCacheFile["sections"]>;
    return {
      builtAt: nonnegativeInteger(parsed.builtAt) ? parsed.builtAt : 0,
      code: sectionFromCache(sections.code, fingerprints.code, ctx, "code"),
      rules: sectionFromCache(sections.rules, fingerprints.rules, ctx, "rules"),
      vault: sectionFromCache(sections.vault, fingerprints.vault, ctx, "vault"),
    };
  } catch (error) {
    if (!(error instanceof SyntaxError)) logIo(cacheFile, error);
    return null;
  }
}

function resolveContext(options: TraverseOpenOptions): TraverseContext {
  const catalogBoundary = (path: string): string => {
    const absolute = resolve(path);
    const actual = canonicalPath(absolute);
    const expected = join(canonicalPath(dirname(absolute)), basename(absolute));
    if (actual !== expected) throw new VaultError("PERMISSION_DENIED", `Traverse catalog root is a symlink: ${path}`);
    return actual;
  };
  const projectSlug = options.projectSlug == null ? undefined : validateProjectSlug(options.projectSlug);
  const vaultPath = options.vaultPath ? canonicalPath(options.vaultPath) : undefined;
  if (options.vaultFs && (canonicalPath(options.vaultFs.root) !== vaultPath || (options.vaultFs.projectSlug !== undefined && options.vaultFs.projectSlug !== projectSlug))) throw new VaultError("PERMISSION_DENIED", "Traverse vault context does not match project scope");
  return {
    root: canonicalPath(options.root ?? process.cwd()),
    vaultPath,
    projectSlug,
    vaultFs: options.vaultFs ?? (vaultPath && projectSlug ? new VaultFS(vaultPath, { projectSlug }) : undefined),
    catalogDir: catalogBoundary(options.catalogDir ?? catalogRoot()),
    rulesDir: catalogBoundary(options.rulesDir ?? rulesCatalogRoot()),
  };
}

export async function buildTraverseIndex(options: TraverseOpenOptions = {}): Promise<TraverseIndexData> {
  const ctx = resolveContext(options);
  if (ctx.vaultPath && ctx.projectSlug) ctx.vaultSources = new Set(ensureProjectIndex(ctx.vaultPath, ctx.projectSlug).fileStamps().keys());
  const graph = await loadGraph(ctx.root);
  await prepareSkillSources(ctx, graph);
  principleCatalog(ctx);
  constitutionSource(ctx);
  const fingerprints = computeSectionFingerprints(ctx);
  const sections = {
    rules: await buildRulesSection(ctx, graph, fingerprints.rules),
    code: await buildCodeSection(ctx, fingerprints.code),
    vault: buildVaultSection(ctx, fingerprints.vault),
  };
  return assembleIndexData(ctx, sections, combinedFingerprint(fingerprints), Date.now());
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

const MAX_VAULT_QUERY_TERMS = 24;

function vaultQuery(task: string): string {
  const terms: string[] = [];
  for (const token of tokenizeTask(task)) {
    if (token.length < 2 || isProseWord(token)) continue;
    if (terms.some((term) => termsMatch(term, token))) continue;
    terms.push(token);
    if (terms.length >= MAX_VAULT_QUERY_TERMS) break;
  }
  return terms.join(" ");
}

function taskLanguageScope(task: string, graph: Graph, files: readonly string[] = []): Set<string> {
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
  for (const file of files) {
    const language = languageForFile(file);
    if (language) scope.add(normalizeLang(language) ?? language.toLowerCase());
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

const CODE_QUERY_STOPWORDS = new Set(["fix", "bug", "change", "update", "implement", "add", "remove", "code", "function", "file", "the", "and", "for", "with", "from", "this", "that", "how", "does", "work"]);

function codeQueryTerms(text: string): string[] {
  return text.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter(term => term.length > 2 && !CODE_QUERY_STOPWORDS.has(term));
}

function utf8Page(content: string, offsetBytes: number, maxBytes: number): { content: string; contentBytes: number; nextOffsetBytes: number | null } {
  const buffer = Buffer.from(content, "utf8");
  if (offsetBytes > buffer.length) throw new VaultError("INVALID_ARGUMENT", "offsetBytes must not exceed content length");
  if (offsetBytes < buffer.length && (buffer[offsetBytes] & 0xc0) === 0x80) throw new VaultError("INVALID_ARGUMENT", "offsetBytes must be a UTF-8 character boundary");
  let end = Math.min(offsetBytes + maxBytes, buffer.length);
  while (end > offsetBytes && end < buffer.length && (buffer[end] & 0xc0) === 0x80) end -= 1;
  if (end === offsetBytes && end < buffer.length) throw new VaultError("INVALID_ARGUMENT", "maxBytes is too small for the next UTF-8 character");
  const page = buffer.subarray(offsetBytes, end);
  const complete = end === buffer.length;
  return {
    content: new TextDecoder("utf-8", { fatal: true }).decode(page),
    contentBytes: page.length,
    nextOffsetBytes: complete ? null : end,
  };
}

export class Traverser {
  private readonly byId: Map<string, TraverseNode>;
  private readonly childIndex: Map<string, TraverseNode[]>;
  private readonly outIndex: Map<string, TraverseEdge[]>;
  private readonly inIndex: Map<string, TraverseEdge[]>;
  private readonly ruleKeywordIndex: Map<string, Set<string>>;
  private readonly skillNodes: TraverseNode[];
  private readonly ruleNodes: TraverseNode[];
  private readonly principlesIndex: ReturnType<typeof buildPrincipleIndex>;

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
    this.principlesIndex = buildPrincipleIndex(ctx.principles ?? []);

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
    const limit = boundedInteger(options.limit, DEFAULT_CHILDREN_LIMIT, 0, 1000, "limit");
    const parent = this.lookup(id);
    if (!parent) return { id, total: 0, children: [] };
    const all = this.childIndex.get(parent.id) ?? [];
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
    const query = vaultQuery(task);
    if (query.length === 0) return [];
    try {
      const index = ensureProjectIndex(this.ctx.vaultPath, this.ctx.projectSlug);
      return index
        .search(query, limit)
        .map((hit) => ({ node: this.byId.get(`vault:${hit.path}`), reason: hit.title ? `vault match: ${hit.title}` : "vault match" }))
        .filter((entry): entry is { node: TraverseNode; reason: string } => entry.node !== undefined);
    } catch (error: unknown) {
      console.error(`[traverse] vault search failed: ${messageOf(error)}`);
      return [];
    }
  }

  resolve(task: string, options: { limit?: number; files?: string[] } = {}): TraverseResolveResult {
    const text = String(task ?? "");
    const files = options.files ?? [];
    const limit = boundedInteger(options.limit, DEFAULT_RESOLVE_LIMIT, 1, 1000, "limit");
    const phase = inferPhase(text);
    const packs = [...packsToLoad(text, phase)].sort();
    const keys = taskTokenKeys(text);
    const scope = taskLanguageScope(text, this.graph, files);
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

    const codeTerms = new Set(codeQueryTerms(text));
    const taskWords = new Set(text.toLowerCase().split(/[^a-z0-9_./-]+/).filter(Boolean));
    const codeMatches: Array<{ node: TraverseNode; score: number }> = [];
    for (const node of this.byId.values()) {
      if (node.kind !== "code") continue;
      const label = node.label.toLowerCase();
      const exactPath = node.path && taskWords.has(node.path.toLowerCase());
      const exactLabel = taskWords.has(label) && !CODE_QUERY_STOPWORDS.has(label);
      const nodeTerms = new Set(codeQueryTerms(node.meta?.symbol ? node.label : node.path ?? node.label));
      const hits = [...codeTerms].filter(term => nodeTerms.has(term)).length;
      const score = exactPath && !node.meta?.symbol ? 100 : exactLabel ? 80 : hits > 0 ? hits * 10 + (node.meta?.symbol ? 1 : 0) : 0;
      if (score > 0) codeMatches.push({ node, score });
    }
    codeMatches.sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id));
    for (const match of codeMatches.slice(0, 10)) push(match.node, `code match: ${match.node.label}`);

    const graphSkills = findNodes<SkillNode>(this.graph, "skill");
    let matchedSkillIds: string[];
    let alwaysSkillIds: string[];
    if (graphSkills.length > 0) {
      matchedSkillIds = matchTask(text, this.graph, { files });
      alwaysSkillIds = alwaysOnSkillIds(this.graph, text, { files });
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

    const selectedPrinciples = selectPrinciples({ prompt: text, files }, this.principlesIndex).selected;
    for (const selected of selectedPrinciples) {
      const node = this.byId.get(`principle:${selected.id}`);
      if (node) push(node, `principle match: ${selected.reason}`);
    }
    for (const selected of selectedPrinciples) {
      const id = `principle:${selected.id}`;
      for (const edge of this.outIndex.get(id) ?? []) {
        if (edge.type !== "principle_related") continue;
        const related = this.byId.get(edge.to);
        if (related?.kind === "principle") push(related, `one-hop reference from ${selected.id}`);
      }
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

  async open(id: string, options: { full?: boolean; offsetBytes?: number; maxBytes?: number } = {}): Promise<TraverseContent> {
    const offsetBytes = boundedInteger(options.offsetBytes, 0, 0, MAX_SOURCE_BYTES, "offsetBytes");
    const requestedBytes = boundedInteger(options.maxBytes, options.full === true ? MAX_SOURCE_BYTES : DEFAULT_OPEN_BYTES, 1, MAX_SOURCE_BYTES, "maxBytes");
    const node = this.lookup(id);
    if (!node) throw new VaultError("FILE_NOT_FOUND", `Unknown traverse node: ${id}`);
    if (node.kind === "container") {
      throw new VaultError("INVALID_ARGUMENT", `Container ${node.id} has no content; use children("${node.id}")`);
    }
    if (node.kind === "code") {
      this.ctx.codeSources = fileTree(this.ctx.root, "code").fileSet;
      if (node.path) assertNotIgnored(this.ctx.root, node.path);
    } else if (node.kind === "rule") {
      this.ctx.ruleSources = ruleCatalog(this.ctx);
    } else if (node.kind === "skill") {
      this.ctx.catalogSources = fileTree(this.ctx.catalogDir, "catalog").fileSet;
    }
    if (node.kind !== "vault" && !node.file) throw new VaultError("FILE_NOT_FOUND", `No source file for ${node.id}`);

    let content: string;
    let stale = false;
    const { file, roots } = sourceFile(node, this.ctx);
    if (node.kind === "skill_resource" && node.meta?.text !== true) throw new VaultError("INVALID_ARGUMENT", `Binary skill resource cannot be opened as UTF-8 text: ${node.id}`);
    if (node.kind === "vault") {
      if (this.ctx.vaultFs && node.path) {
        const stat = statSync(file);
        if (!stat.isFile() || stat.size > MAX_SOURCE_BYTES) throw new VaultError("INVALID_ARGUMENT", `Vault note exceeds ${MAX_SOURCE_BYTES} bytes: ${node.path}`);
        content = await this.ctx.vaultFs.read(node.path);
        containedFile(file, roots);
        if (Buffer.byteLength(content, "utf8") > MAX_SOURCE_BYTES) throw new VaultError("INVALID_ARGUMENT", `Vault note exceeds ${MAX_SOURCE_BYTES} bytes: ${node.path}`);
      } else {
        throw new VaultError("FILE_NOT_FOUND", `No vault access for ${node.id}`);
      }
    } else {
      const source = readBoundedFile(file, roots, MAX_SOURCE_BYTES, file);
      if (node.meta?.symbol) {
        const stat = statFile(file);
        const indexedMtime = Number(node.meta.mtime);
        const indexedSize = Number(node.meta.size);
        const changed = stat !== null && (stat.mtime !== indexedMtime || stat.size !== indexedSize || (node.meta.ctime !== undefined && stat.ctime !== node.meta.ctime));
        if (changed) {
          const span = await recomputeSymbolSpan(node, source);
          if (span) {
            content = source.split("\n").slice(span.startLine - 1, span.endLine).join("\n");
          } else {
            content = source;
            stale = true;
          }
        } else {
          content = source.split("\n").slice(Number(node.meta.startLine) - 1, Number(node.meta.endLine)).join("\n");
        }
      } else {
        content = source;
      }
    }

    const bytes = Buffer.byteLength(content, "utf8");
    const page = utf8Page(content, offsetBytes, requestedBytes);
    const truncated = page.nextOffsetBytes !== null;
    return {
      id: node.id,
      kind: node.kind,
      path: node.path,
      bytes,
      tokens: traverseTokensForBytes(bytes),
      offset_bytes: offsetBytes,
      next_offset_bytes: page.nextOffsetBytes,
      read_complete: !truncated,
      content_bytes: page.contentBytes,
      truncated,
      ...(stale ? { stale: true } : {}),
      content: page.content,
    };
  }
}

async function recomputeSymbolSpan(node: TraverseNode, source: string): Promise<{ startLine: number; endLine: number } | null> {
  if (!node.file || !node.path) return null;
  const language = node.meta?.language;
  if (typeof language !== "string" || language === "external") return null;
  try {
    const parser = await getParser();
    const loaded = await loadLanguage(language as LanguageId);
    parser.setLanguage(loaded);
    const tree = parser.parse(source);
    try {
      const result = extractorFor(language as LanguageId)({ file: node.path, source, tree, language: language as LanguageId });
      const indexedStart = Number(node.meta?.startLine);
      const candidates = result.nodes
        .filter((entry) => entry.name === node.label && entry.kind === node.meta?.kind)
        .sort((a, b) => Math.abs(a.span.startLine - indexedStart) - Math.abs(b.span.startLine - indexedStart));
      if (candidates.length === 0) return null;
      return { startLine: candidates[0].span.startLine, endLine: candidates[0].span.endLine };
    } finally {
      tree.delete();
    }
  } catch (error: unknown) {
    console.error(`[traverse] failed to recompute span for ${node.id}: ${messageOf(error)}`);
    return null;
  }
}

export async function openTraverser(options: TraverseOpenOptions = {}): Promise<Traverser> {
  const ctx = resolveContext(options);
  if (ctx.vaultPath && ctx.projectSlug) ctx.vaultSources = new Set(ensureProjectIndex(ctx.vaultPath, ctx.projectSlug).fileStamps().keys());
  const graph = await loadGraph(ctx.root);
  await prepareSkillSources(ctx, graph);
  principleCatalog(ctx);
  constitutionSource(ctx);
  const fingerprints = computeSectionFingerprints(ctx);
  const cacheFile = options.cacheFile ? join(canonicalPath(dirname(resolve(options.cacheFile))), basename(options.cacheFile)) : join(ctx.root, ".superskill", "traverse.json");
  const cacheRoot = options.cacheFile ? dirname(cacheFile) : ctx.root;
  const cached = options.refresh === true ? null : readCache(cacheFile, fingerprints, ctx, cacheRoot);
  const sections = {
    code: cached?.code ?? null,
    rules: cached?.rules ?? null,
    vault: cached?.vault ?? null,
  };
  let rebuilt = false;
  if (sections.rules === null) {
    sections.rules = await buildRulesSection(ctx, graph, fingerprints.rules);
    rebuilt = true;
  }
  if (sections.code === null) {
    sections.code = await buildCodeSection(ctx, fingerprints.code);
    rebuilt = true;
  }
  if (sections.vault === null) {
    sections.vault = buildVaultSection(ctx, fingerprints.vault);
    rebuilt = true;
  }
  const builtAt = rebuilt ? Date.now() : (cached?.builtAt || Date.now());
  const fingerprint = combinedFingerprint(fingerprints);
  const data = assembleIndexData(
    ctx,
    { code: sections.code, rules: sections.rules, vault: sections.vault },
    fingerprint,
    builtAt,
  );
  if (rebuilt) {
    writeCache(cacheFile, {
      version: TRAVERSE_INDEX_VERSION,
      fingerprint,
      builtAt,
      sections: { code: sections.code, rules: sections.rules, vault: sections.vault },
    }, cacheRoot);
  }
  return new Traverser(data, graph, ctx);
}
