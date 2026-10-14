// SPDX-License-Identifier: Apache-2.0

import { execFile } from "node:child_process";
import { constants, type Dirent } from "node:fs";
import { lstat, open, opendir, realpath, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import type {
  CodeEdge,
  CodeNode,
  ExtractResult,
  LanguageId,
  ScanOptions,
  ScanResult,
  SyntaxTree,
} from "./types.js";
import { getParser, isSupported, languageForFile, loadLanguage, PARSE_TIMEOUT_MICROS, supportedLanguages } from "./grammars.js";
import { extractorFor } from "./extractors/index.js";
import { externalNodeId, moduleNodeId } from "./extractors/common.js";
import { CodeGraphStore } from "./store.js";
import { containedPath, isWithinRoot } from "./paths.js";

export const DEFAULT_SKIP_DIRS = [".git", "node_modules", "dist", "build", ".superskill", ".venv", "venv", "target", ".next", ".turbo", "coverage", "vendor", "Pods", ".build"];
const DEFAULT_MAX_FILE_SIZE = 1_000_000;
const MAX_FILES = 10_000;
const MAX_TOTAL_BYTES = 50_000_000;
const MAX_DIRECTORY_DEPTH = 64;
const MAX_DIRECTORY_ENTRIES = 100_000;
const execFileAsync = promisify(execFile);

function limit(value: number | undefined, fallback: number, ceiling: number, name: string): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 0 || value > ceiling) {
    throw new Error(`codegraph: invalid ${name}; expected an integer from 0 to ${ceiling}`);
  }
  return value;
}

interface FileEntry {
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
  const maxFiles = limit(options.maxFiles, MAX_FILES, MAX_FILES, "maxFiles");
  const maxDepth = limit(options.maxDepth, MAX_DIRECTORY_DEPTH, MAX_DIRECTORY_DEPTH, "maxDepth");
  let skipped = 0;
  const addFile = (rel: string): boolean => {
    const abs = resolve(root, rel);
    if (!isWithinRoot(root, abs)) return true;
    const parts = rel.split("/");
    if (parts.slice(0, -1).some((part) => part === ".git" || skipDirs.has(part))) return true;
    const language = languageForFile(rel);
    if (!language || !wanted.has(language)) return true;
    if (parts.length - 1 > maxDepth || !isSupported(language)) {
      skipped += 1;
      return true;
    }
    if (files.length >= maxFiles) {
      skipped += 1;
      return false;
    }
    files.push({ rel, language });
    return true;
  };
  const env: NodeJS.ProcessEnv = { ...process.env, LC_ALL: "C", GIT_OPTIONAL_LOCKS: "0" };
  for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR"]) delete env[key];
  try {
    const { stdout } = await execFileAsync("git", ["-c", "core.fsmonitor=false", "ls-files", "-co", "--exclude-standard", "-z", "--", "."], {
      cwd: root, env, encoding: "buffer", timeout: 5_000, maxBuffer: 8_000_000,
    });
    const paths: string[] = [];
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let start = 0;
    while (start < stdout.length) {
      const end = stdout.indexOf(0, start);
      if (end < 0 || paths.length >= MAX_DIRECTORY_ENTRIES) throw new Error("codegraph: git listing exceeds file budget");
      if (end > start) paths.push(decoder.decode(stdout.subarray(start, end)));
      start = end + 1;
    }
    for (const rel of [...new Set(paths)].sort()) {
      if (!addFile(rel)) break;
    }
    return { files, skipped };
  } catch (error) {
    const failure = error as NodeJS.ErrnoException & { stderr?: Buffer | string };
    if (!/^fatal: not a git repository\b/.test(String(failure.stderr ?? ""))) {
      console.error("[codegraph] git file enumeration failed:", failure.code ?? "invalid output");
      throw new Error("codegraph: unable to enumerate non-ignored source files");
    }
  }

  const pending = [{ dir: root, depth: 0 }];
  let entriesSeen = 0;
  while (pending.length > 0) {
    const { dir, depth } = pending.pop()!;
    const entries: Dirent[] = [];
    try {
      await containedPath(root, relative(root, dir));
      if (await lstat(join(dir, ".gitignore")).then(() => true, (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return false;
        throw error;
      })) {
        skipped += 1;
        continue;
      }
      const directory = await opendir(dir);
      for await (const entry of directory) {
        if (entriesSeen >= MAX_DIRECTORY_ENTRIES) {
          skipped += 1;
          break;
        }
        entriesSeen += 1;
        entries.push(entry);
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") console.error("[codegraph] directory enumeration failed:", code ?? "unsafe path");
      skipped += 1;
      continue;
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    const children: Array<{ dir: string; depth: number }> = [];
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git" || skipDirs.has(entry.name)) continue;
        if (depth >= maxDepth) skipped += 1;
        else children.push({ dir: abs, depth: depth + 1 });
        continue;
      }
      if (!entry.isFile()) continue;
      if (!addFile(toPosix(relative(root, abs)))) return { files, skipped };
    }
    if (entriesSeen >= MAX_DIRECTORY_ENTRIES) break;
    pending.push(...children.reverse());
  }
  files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return { files, skipped };
}

async function readSource(root: string, file: FileEntry, maxSize: number, remaining: number): Promise<{ source: string | null; bytes: number }> {
  const abs = await containedPath(root, file.rel);
  const handle = await open(abs, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  let bytes = 0;
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size > maxSize || before.size > remaining) return { source: null, bytes };
    const physical = await realpath(abs);
    if (!isWithinRoot(root, physical)) return { source: null, bytes };
    const current = await lstat(abs);
    if (current.isSymbolicLink() || current.dev !== before.dev || current.ino !== before.ino) return { source: null, bytes };
    const buffer = Buffer.alloc(Math.min(maxSize + 1, remaining, before.size + 1));
    while (bytes < buffer.length) {
      const read = await handle.read(buffer, bytes, buffer.length - bytes, bytes);
      if (read.bytesRead === 0) break;
      bytes += read.bytesRead;
    }
    const after = await handle.stat();
    if (bytes > maxSize || bytes !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
      return { source: null, bytes };
    }
    const data = buffer.subarray(0, bytes);
    if (data.some((byte) => byte < 9 || (byte > 13 && byte < 32) || byte === 127)) return { source: null, bytes };
    try {
      return { source: new TextDecoder("utf-8", { fatal: true }).decode(data), bytes };
    } catch {
      return { source: null, bytes };
    }
  } catch (error) {
    console.error(`[codegraph] handle read failed for ${file.rel}:`, (error as NodeJS.ErrnoException).code ?? "unknown error");
    return { source: null, bytes };
  } finally {
    await handle.close().catch((error: NodeJS.ErrnoException) => {
      console.error("[codegraph] handle close failed:", error.code ?? "unknown error");
    });
  }
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
      `${base}.js`,
      `${base}.jsx`,
      `${base}.mjs`,
      `${base}.cjs`,
      `${base}.d.ts`,
      `${stripped}.ts`,
      `${stripped}.tsx`,
      `${stripped}.d.ts`,
      `${stripped}/index.ts`,
      `${stripped}/index.tsx`,
      `${base}/index.ts`,
      `${base}/index.tsx`,
      `${base}/index.js`,
      `${base}/index.jsx`,
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
  const alias = result.exportAliases?.[name];
  if (alias) return result.nodes.find((node) => node.id === alias) ?? null;
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
  const rootStat = await stat(rootAbs).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    console.error("[codegraph] scan root lookup failed:", error.code ?? "unknown error");
    throw error;
  });
  if (!rootStat?.isDirectory()) {
    throw new Error(`codegraph: scan root is not a directory: ${rootAbs}`);
  }
  const physicalRoot = await realpath(rootAbs);
  const maxSize = limit(options.maxFileSize, DEFAULT_MAX_FILE_SIZE, 10_000_000, "maxFileSize");
  const maxTotalBytes = limit(options.maxTotalBytes, MAX_TOTAL_BYTES, MAX_TOTAL_BYTES, "maxTotalBytes");
  const { files, skipped } = await collectFiles(physicalRoot, options);
  const parser = await getParser();
  const results = new Map<string, ExtractResult>();
  let parseErrors = 0;
  let filesSkipped = skipped;
  let bytesRead = 0;

  for (const file of files) {
    if (bytesRead >= maxTotalBytes) {
      filesSkipped += 1;
      continue;
    }
    let source: string;
    try {
      const read = await readSource(physicalRoot, file, maxSize, maxTotalBytes - bytesRead);
      bytesRead += read.bytes;
      if (read.source === null) {
        filesSkipped += 1;
        continue;
      }
      source = read.source;
    } catch (error) {
      filesSkipped += 1;
      console.error(`[codegraph] read failed for ${file.rel}:`, (error as NodeJS.ErrnoException).code ?? "unsafe path");
      continue;
    }
    let tree: SyntaxTree | undefined;
    try {
      const language = await loadLanguage(file.language);
      parser.reset();
      parser.setLanguage(language);
      parser.setTimeoutMicros(PARSE_TIMEOUT_MICROS);
      tree = parser.parse(source);
      if (tree.rootNode.hasError) parseErrors += 1;
      results.set(file.rel, extractorFor(file.language)({ file: file.rel, source, tree, language: file.language }));
    } catch (error) {
      if (!tree?.rootNode.hasError) parseErrors += 1;
      filesSkipped += 1;
      console.error(`[codegraph] parse/extraction failed for ${file.rel}:`, (error as NodeJS.ErrnoException).code ?? (error instanceof Error ? error.name : "unknown error"));
    } finally {
      tree?.delete();
      parser.reset();
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
