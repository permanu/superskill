// SPDX-License-Identifier: Apache-2.0

import { readdir, readFile, stat } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import type {
  CodeEdge,
  CodeNode,
  ExtractResult,
  LanguageId,
  ScanOptions,
  ScanResult,
} from "./types.js";
import { getParser, isSupported, languageForFile, loadLanguage, supportedLanguages } from "./grammars.js";
import { extractorFor } from "./extractors/index.js";
import { externalNodeId, moduleNodeId } from "./extractors/common.js";
import { CodeGraphStore } from "./store.js";

const DEFAULT_SKIP_DIRS = [".git", "node_modules", "dist", "build"];
const DEFAULT_MAX_FILE_SIZE = 1_000_000;

interface FileEntry {
  abs: string;
  rel: string;
  language: LanguageId;
}

export interface FileIndex {
  files: Set<string>;
  byBasename: Map<string, string[]>;
}

function toPosix(path: string): string {
  return path.split("\\").join("/");
}

function posixJoin(...parts: string[]): string {
  const segments: string[] = [];
  for (const part of parts.join("/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      segments.pop();
      continue;
    }
    segments.push(part);
  }
  return segments.join("/");
}

async function collectFiles(
  root: string,
  options: ScanOptions,
): Promise<{ files: FileEntry[]; skipped: number }> {
  const skipDirs = new Set(options.skipDirs ?? DEFAULT_SKIP_DIRS);
  const wanted = new Set(options.languages ?? supportedLanguages());
  const files: FileEntry[] = [];
  let skipped = 0;
  const walk = async (dir: string): Promise<void> => {
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "EACCES") {
        console.error(`[codegraph] readdir failed for ${dir}:`, code ?? error);
      }
      return;
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) await walk(abs);
        continue;
      }
      if (!entry.isFile()) continue;
      const language = languageForFile(entry.name);
      if (!language || !wanted.has(language)) continue;
      const rel = toPosix(relative(root, abs));
      if (!isSupported(language)) {
        skipped += 1;
        console.error(`[codegraph] unsupported grammar for ${rel} (${language})`);
        continue;
      }
      files.push({ abs, rel, language });
    }
  };
  await walk(root);
  files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return { files, skipped };
}

function buildFileIndex(results: Map<string, ExtractResult>): FileIndex {
  const files = new Set(results.keys());
  const byBasename = new Map<string, string[]>();
  for (const rel of [...files].sort()) {
    const base = rel.split("/").pop() ?? rel;
    const list = byBasename.get(base);
    if (list) list.push(rel);
    else byBasename.set(base, [rel]);
  }
  return { files, byBasename };
}

function firstExisting(candidates: string[], files: Set<string>): string | null {
  for (const candidate of candidates) {
    if (files.has(candidate)) return candidate;
  }
  return null;
}

function firstByBasename(index: FileIndex, basename: string): string | null {
  return index.byBasename.get(basename)?.[0] ?? null;
}

function resolveTs(fromFile: string, spec: string, index: FileIndex): string | null {
  if (!spec.startsWith(".")) return null;
  const base = posixJoin(dirname(fromFile), spec);
  const stripped = base.replace(/\.(js|jsx|mjs|cjs)$/, "");
  return firstExisting(
    [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.d.ts`,
      `${stripped}.ts`,
      `${stripped}.tsx`,
      `${stripped}.d.ts`,
      `${stripped}/index.ts`,
      `${stripped}/index.tsx`,
      `${base}/index.ts`,
      `${base}/index.tsx`,
    ],
    index.files,
  );
}

function resolvePython(fromFile: string, spec: string, index: FileIndex): string | null {
  if (spec.startsWith(".")) {
    const dots = spec.match(/^\.+/)?.[0].length ?? 0;
    const rest = spec.slice(dots);
    let baseDir = dirname(fromFile);
    for (let i = 1; i < dots; i += 1) baseDir = dirname(baseDir);
    const path = rest ? posixJoin(baseDir, rest.split(".").join("/")) : baseDir;
    return firstExisting([`${path}.py`, `${path}/__init__.py`], index.files);
  }
  const path = spec.split(".").join("/");
  const direct = firstExisting([`${path}.py`, `${path}/__init__.py`], index.files);
  if (direct) return direct;
  const basename = `${spec.split(".").pop() ?? spec}.py`;
  return firstByBasename(index, basename);
}

function resolveGo(spec: string, index: FileIndex): string | null {
  const segment = spec.split("/").filter(Boolean).pop();
  if (!segment) return null;
  const dirs = new Set<string>();
  for (const rel of index.files) {
    if (!rel.endsWith(".go")) continue;
    const dir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
    const dirSegment = dir.split("/").pop();
    if (dirSegment === segment) dirs.add(dir);
  }
  if (dirs.size > 0) {
    const dir = [...dirs].sort((a, b) => a.length - b.length || (a < b ? -1 : 1))[0];
    const prefix = dir === "" ? "" : `${dir}/`;
    const file = [...index.files]
      .filter((candidate) => candidate.startsWith(prefix) && candidate.endsWith(".go") && !candidate.slice(prefix.length).includes("/"))
      .sort()[0];
    if (file) return file;
  }
  return firstByBasename(index, `${segment}.go`);
}

function findCrateRoot(fromFile: string, files: Set<string>): string {
  let dir = dirname(fromFile);
  while (true) {
    const current = dir === "." ? "" : dir;
    if (files.has(posixJoin(current, "lib.rs")) || files.has(posixJoin(current, "main.rs"))) {
      return current;
    }
    if (dir === "." || dir === "") return "";
    dir = dirname(dir);
  }
}

function resolveRust(fromFile: string, spec: string, index: FileIndex): string | null {
  const parts = spec.split("::");
  const root = parts[0];
  let baseDir: string;
  if (root === "crate") {
    baseDir = findCrateRoot(fromFile, index.files);
  } else if (root === "self") {
    const dir = dirname(fromFile);
    baseDir = dir === "." ? "" : dir;
  } else if (root === "super") {
    const dir = dirname(dirname(fromFile));
    baseDir = dir === "." ? "" : dir;
  } else {
    return null;
  }
  const rest = parts.slice(1).join("/");
  if (!rest) return null;
  const path = posixJoin(baseDir, rest);
  return firstExisting([`${path}.rs`, `${path}/mod.rs`], index.files);
}

function resolveJava(spec: string, index: FileIndex): string | null {
  const basename = spec.split(".").pop();
  if (!basename || basename === "*") return null;
  return firstByBasename(index, `${basename}.java`);
}

function resolveCInclude(fromFile: string, spec: string, index: FileIndex): string | null {
  if (spec.startsWith("<")) return null;
  const direct = firstExisting([posixJoin(dirname(fromFile), spec), spec], index.files);
  if (direct) return direct;
  const basename = spec.split("/").pop();
  return basename ? firstByBasename(index, basename) : null;
}

export function resolveSpecifier(
  language: LanguageId,
  fromFile: string,
  spec: string,
  index: FileIndex,
): string | null {
  switch (language) {
    case "typescript":
    case "tsx":
      return resolveTs(fromFile, spec, index);
    case "python":
      return resolvePython(fromFile, spec, index);
    case "go":
      return resolveGo(spec, index);
    case "rust":
      return resolveRust(fromFile, spec, index);
    case "java":
      return resolveJava(spec, index);
    case "c":
    case "cpp":
      return resolveCInclude(fromFile, spec, index);
    case "swift":
      return null;
    default:
      return null;
  }
}

function findSymbol(result: ExtractResult, name: string): CodeNode | null {
  const candidates = result.nodes.filter(
    (node) => node.name === name && node.kind !== "module" && node.kind !== "import-source",
  );
  if (candidates.length === 0) return null;
  const exported = candidates.filter((node) => node.exported);
  const pool = exported.length > 0 ? exported : candidates;
  return [...pool].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0] ?? null;
}

export async function scanRepo(root: string, options: ScanOptions = {}): Promise<ScanResult> {
  const rootAbs = resolve(root);
  const rootStat = await stat(rootAbs).catch(() => null);
  if (!rootStat?.isDirectory()) {
    throw new Error(`codegraph: scan root is not a directory: ${rootAbs}`);
  }
  const { files, skipped } = await collectFiles(rootAbs, options);
  const parser = await getParser();
  const maxSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
  const results = new Map<string, ExtractResult>();
  let parseErrors = 0;
  let filesSkipped = skipped;

  for (const file of files) {
    const fileStat = await stat(file.abs).catch(() => null);
    if (!fileStat || fileStat.size > maxSize) {
      filesSkipped += 1;
      continue;
    }
    let source: string;
    try {
      source = await readFile(file.abs, "utf8");
    } catch (error) {
      filesSkipped += 1;
      console.error(`[codegraph] read failed for ${file.rel}:`, (error as NodeJS.ErrnoException).code ?? error);
      continue;
    }
    const language = await loadLanguage(file.language);
    parser.setLanguage(language);
    const tree = parser.parse(source);
    try {
      if (tree.rootNode.hasError) parseErrors += 1;
      results.set(file.rel, extractorFor(file.language)({ file: file.rel, source, tree, language: file.language }));
    } finally {
      tree.delete();
    }
  }

  const store = new CodeGraphStore();
  store.root = rootAbs;
  const placeholders = new Map<string, CodeEdge[]>();
  for (const result of results.values()) {
    for (const node of result.nodes) store.addNode(node);
    for (const edge of result.edges) {
      if (edge.to.startsWith("ext:") && edge.confidence === "INFERRED") {
        const key = `${edge.file}\u0000${edge.to}`;
        const list = placeholders.get(key);
        if (list) list.push(edge);
        else placeholders.set(key, [edge]);
        continue;
      }
      store.addEdge(edge);
    }
  }

  const index = buildFileIndex(results);
  const resolvedPlaceholders = new Set<string>();
  for (const file of files) {
    const result = results.get(file.rel);
    if (!result) continue;
    for (const imp of result.imports) {
      const target = resolveSpecifier(file.language, file.rel, imp.specifier, index);
      if (!target || target === file.rel) continue;
      store.addEdge({
        from: moduleNodeId(file.rel),
        to: moduleNodeId(target),
        kind: "imports",
        confidence: "INFERRED",
        file: file.rel,
        span: imp.span,
      });
      const targetResult = results.get(target);
      if (!targetResult) continue;
      for (const binding of imp.bindings) {
        if (binding === "*") continue;
        const symbol = findSymbol(targetResult, binding);
        if (!symbol) continue;
        const key = `${file.rel}\u0000${externalNodeId(imp.specifier, binding)}`;
        const pending = placeholders.get(key);
        if (!pending) continue;
        resolvedPlaceholders.add(key);
        for (const edge of pending) {
          store.addEdge({ ...edge, to: symbol.id });
        }
      }
    }
  }

  for (const [key, edges] of placeholders) {
    if (resolvedPlaceholders.has(key)) continue;
    for (const edge of edges) store.addEdge(edge);
  }

  return { graph: store.toGraph(), stats: store.stats({ parseErrors, filesSkipped }) };
}
