// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { join } from "node:path";
import { containedPath, isWithinRoot } from "./codegraph/paths.js";
import type { CodeNode, ScanResult } from "./codegraph/types.js";
import { parseFrontmatter } from "./frontmatter.js";
import { scanForSecrets } from "./secret-scanner.js";
import { VaultError, type VaultFS } from "./vault-fs.js";

export const GENERATED_MARKER = "<!-- superskill:generated -->";

const SYMBOL_LIMIT = 40;
const REMOVAL_DEPTH = 64;
const SOURCE_BYTE_LIMIT = 1_000_000;

const FENCE_LANGUAGE: Record<string, string> = {
  typescript: "typescript",
  tsx: "tsx",
  python: "python",
  go: "go",
  rust: "rust",
  swift: "swift",
  java: "java",
  c: "c",
  cpp: "cpp",
};

export interface WriteCodeNotesResult {
  written: number;
  removed: number;
  total: number;
  skipped: number;
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function safeSourcePath(file: string): boolean {
  if (!file || file.startsWith("/") || file.includes("\\") || file.split("/").some((part) => part === "." || part === ".." || part === "")) return false;
  try {
    encodeURIComponent(file);
    return true;
  } catch {
    return false;
  }
}

async function readCodeSource(codeRoot: string, file: string): Promise<string | null> {
  const root = await realpath(codeRoot);
  const abs = await containedPath(root, file);
  if (!isWithinRoot(root, abs)) return null;
  const handle = await open(abs, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size > SOURCE_BYTE_LIMIT) return null;
    const matchesPath = async (): Promise<boolean> => {
      if (await containedPath(root, file) !== abs || !isWithinRoot(root, await realpath(abs))) return false;
      const current = await lstat(abs);
      return !current.isSymbolicLink() && current.dev === before.dev && current.ino === before.ino;
    };
    if (!await matchesPath()) return null;
    const buffer = Buffer.alloc(Math.min(before.size + 1, SOURCE_BYTE_LIMIT));
    let bytes = 0;
    while (bytes < buffer.length) {
      const read = await handle.read(buffer, bytes, buffer.length - bytes, bytes);
      if (read.bytesRead === 0) break;
      bytes += read.bytesRead;
    }
    const after = await handle.stat();
    if (bytes !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs || !await matchesPath()) return null;
    const data = buffer.subarray(0, bytes);
    if (data.some((byte) => byte < 9 || (byte > 13 && byte < 32) || byte === 127)) return null;
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(data);
    } catch {
      return null;
    }
  } finally {
    await handle.close();
  }
}

export function codeNoteVaultPath(slug: string, file: string): string {
  return `${codeNoteLinkTarget(slug, file)}.md`;
}

export function codeNoteLinkTarget(slug: string, file: string): string {
  const encoded = file.split("/").map((part) => {
    let segment = encodeURIComponent(part).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
    if (segment.includes("..")) segment = segment.replace(/\./g, "%2E");
    if (segment.startsWith(".")) segment = `%2E${segment.slice(1)}`;
    if (segment.toLowerCase() === "personal") segment = `%${segment.charCodeAt(0).toString(16).toUpperCase()}${segment.slice(1)}`;
    return segment;
  }).join("/");
  return `projects/${slug}/code/${encoded}`;
}

function contentHash(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

function yamlString(value: string): string {
  return JSON.stringify(value).replace(/[\x7f-\x9f\u2028\u2029]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

export function sealGeneratedContent(content: string, format: "markdown" | "yaml" = "markdown"): string {
  const body = content.endsWith("\n") ? content : `${content}\n`;
  const hash = contentHash(body);
  const seal = format === "markdown" ? `<!-- superskill:content-sha256: ${hash} -->` : `# superskill:content-sha256: ${hash}`;
  return `${body}${seal}\n`;
}

export function isUneditedGeneratedContent(content: string): boolean {
  const match = /(?:<!-- superskill:content-sha256: ([0-9a-f]{64}) -->|# superskill:content-sha256: ([0-9a-f]{64}))\n$/.exec(content);
  return match !== null && match.index > 0 && content[match.index - 1] === "\n" &&
    match.index + match[0].length === content.length && contentHash(content.slice(0, match.index)) === (match[1] ?? match[2]);
}

export function markdownText(value: string): string {
  return value.replace(/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g, " ").replace(/[\\`*_[\]<>|#]/g, "\\$&");
}

function inlineCode(value: string): string {
  const clean = value.replace(/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g, " ");
  const fence = fenceFor(clean);
  return `${fence} ${clean} ${fence}`;
}

function fenceFor(source: string): string {
  let longest = 0;
  for (const run of source.matchAll(/`+/g)) longest = Math.max(longest, run[0].length);
  return "`".repeat(Math.max(3, longest + 1));
}

function lineCount(source: string): number {
  if (source.length === 0) return 0;
  const trimmed = source.endsWith("\n") ? source.slice(0, -1) : source;
  return trimmed === "" ? 0 : trimmed.split("\n").length;
}

function renderNote(args: {
  slug: string;
  file: string;
  language: string;
  source: string;
  symbols: CodeNode[];
  imports: string[];
  importedBy: string[];
}): string {
  const { slug, file, language, source, symbols, imports, importedBy } = args;
  const hash = contentHash(JSON.stringify({ renderer: 2, symbolLimit: SYMBOL_LIMIT, fenceLanguage: FENCE_LANGUAGE[language], ...args })).slice(0, 12);
  const lines: string[] = [
    "---",
    "type: code",
    `project: ${yamlString(slug)}`,
    `path: ${yamlString(file)}`,
    `language: ${language}`,
    `hash: ${hash}`,
    "generated: true",
    "---",
    "",
    GENERATED_MARKER,
    "",
    `# ${markdownText(file)}`,
    "",
    `${lineCount(source)} lines · ${Buffer.byteLength(source, "utf-8")} bytes · ${language}`,
  ];
  if (symbols.length > 0) {
    lines.push("", "## Symbols", "");
    for (const symbol of symbols.slice(0, SYMBOL_LIMIT)) {
      const name = /[`\x00-\x1f\x7f-\x9f\u2028\u2029]/.test(symbol.name) ? inlineCode(symbol.name) : `\`${symbol.name}\``;
      lines.push(`- ${name} (${symbol.kind})`);
    }
  }
  const sections: ReadonlyArray<readonly [string, string[]]> = [
    ["## Imports", imports],
    ["## Imported by", importedBy],
  ];
  for (const [heading, targets] of sections) {
    if (targets.length === 0) continue;
    lines.push("", heading, "");
    for (const target of targets) lines.push(`- [[${codeNoteLinkTarget(slug, target)}]]`);
  }
  lines.push("", "## Source", "");
  if (scanForSecrets(source).length > 0) {
    lines.push("Source omitted because it contains a secret-like pattern. Inspect the local file directly.");
  } else {
    const fence = fenceFor(source);
    lines.push(`${fence}${FENCE_LANGUAGE[language] ?? ""}`, source.replace(/\r\n/g, "\n").replace(/\n$/, ""), fence);
  }
  return sealGeneratedContent(`${lines.join("\n")}\n`);
}

async function writeIfChanged(vaultFs: VaultFS, path: string, content: string): Promise<"written" | "unchanged" | "kept"> {
  let status: "written" | "unchanged" | "kept" = "kept";
  await vaultFs.update(
    path,
    async (current) => {
      if (current === content) {
        status = "unchanged";
        return current;
      }
      if (await vaultFs.exists(path) && (!current.includes(`\n${GENERATED_MARKER}\n`) || !isUneditedGeneratedContent(current))) return current;
      status = "written";
      return content;
    },
    { create: true },
  );
  return status;
}

async function removeStaleCodeNotes(vaultFs: VaultFS, slug: string, codeRoot: string, keep: Set<string>): Promise<number> {
  let entries: string[];
  try {
    entries = await vaultFs.list(`projects/${slug}/code`, REMOVAL_DEPTH);
  } catch (error) {
    if (error instanceof VaultError && error.code === "FILE_NOT_FOUND") return 0;
    throw error;
  }
  let removed = 0;
  for (const entry of entries.sort(compare)) {
    if (!entry.endsWith(".md") || keep.has(entry)) continue;
    try {
      const deleted = await vaultFs.deleteIf(entry, async (content) => {
        if (!content.includes(`\n${GENERATED_MARKER}\n`) || !isUneditedGeneratedContent(content)) return false;
        const { data } = parseFrontmatter(content);
        if (data.type !== "code" || data.project !== slug || typeof data.path !== "string" || !safeSourcePath(data.path) || codeNoteVaultPath(slug, data.path) !== entry) return false;
        try {
          await lstat(join(codeRoot, data.path));
          return false;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
          console.error(`[code-notes] cannot verify deleted source ${JSON.stringify(data.path)}: ${(error as NodeJS.ErrnoException).code ?? String(error)}`);
          return false;
        }
      });
      if (deleted) removed += 1;
    } catch (error) {
      if (error instanceof VaultError && error.code === "FILE_NOT_FOUND") continue;
      console.error(`[code-notes] cannot safely remove stale note ${JSON.stringify(entry)}: ${(error as NodeJS.ErrnoException).code ?? String(error)}`);
    }
  }
  return removed;
}

export async function writeCodeNotes(args: {
  vaultFs: VaultFS;
  slug: string;
  codeRoot: string;
  scan: ScanResult;
}): Promise<WriteCodeNotesResult> {
  const { vaultFs, slug, codeRoot, scan } = args;
  const byId = new Map(scan.graph.nodes.map((node) => [node.id, node]));
  const moduleNodes = scan.graph.nodes
    .filter((node) => node.kind === "module")
    .sort((a, b) => compare(a.file, b.file));
  const symbolsByFile = new Map<string, CodeNode[]>();
  for (const node of scan.graph.nodes) {
    if (node.kind === "module" || node.kind === "import-source") continue;
    const list = symbolsByFile.get(node.file);
    if (list) list.push(node);
    else symbolsByFile.set(node.file, [node]);
  }
  const importsByFile = new Map<string, Set<string>>();
  const importedByFile = new Map<string, Set<string>>();
  for (const edge of scan.graph.edges) {
    if (edge.kind !== "imports") continue;
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (from?.kind !== "module" || to?.kind !== "module" || from.file === to.file) continue;
    if (!safeSourcePath(from.file) || !safeSourcePath(to.file)) continue;
    const imports = importsByFile.get(from.file) ?? new Set<string>();
    imports.add(to.file);
    importsByFile.set(from.file, imports);
    const importedBy = importedByFile.get(to.file) ?? new Set<string>();
    importedBy.add(from.file);
    importedByFile.set(to.file, importedBy);
  }

  const keep = new Set<string>();
  let written = 0;
  let total = 0;
  let skipped = scan.stats.filesSkipped;
  for (const node of moduleNodes) {
    if (!safeSourcePath(node.file)) {
      console.error(`[code-notes] skipping unsafe source path ${JSON.stringify(node.file)}`);
      skipped += 1;
      continue;
    }
    const path = codeNoteVaultPath(slug, node.file);
    keep.add(path);
    let source: string | null;
    try {
      source = await readCodeSource(codeRoot, node.file);
    } catch (error) {
      console.error(`[code-notes] skipping unreadable ${JSON.stringify(node.file)}: ${(error as NodeJS.ErrnoException).code ?? String(error)}`);
      skipped += 1;
      continue;
    }
    if (source === null) {
      console.error(`[code-notes] skipping unsafe, oversized or non-UTF-8 source ${JSON.stringify(node.file)}`);
      skipped += 1;
      continue;
    }
    const symbols = (symbolsByFile.get(node.file) ?? [])
      .slice()
      .sort((a, b) => a.span.startLine - b.span.startLine || compare(a.id, b.id));
    const imports = [...(importsByFile.get(node.file) ?? [])].sort(compare);
    const importedBy = [...(importedByFile.get(node.file) ?? [])].sort(compare);
    const content = renderNote({
      slug,
      file: node.file,
      language: node.language,
      source,
      symbols,
      imports,
      importedBy,
    });
    try {
      const status = await writeIfChanged(vaultFs, path, content);
      if (status === "written") written += 1;
      if (status === "kept") skipped += 1;
      else total += 1;
    } catch (error) {
      if (error instanceof VaultError && error.code === "SECRET_REJECTED") {
        console.error(`[code-notes] vault rejected ${JSON.stringify(node.file)}: ${error.message.split("\n")[0]}`);
        skipped += 1;
        continue;
      }
      if ((error as NodeJS.ErrnoException).code === "ENAMETOOLONG") {
        console.error(`[code-notes] skipping filename too long after encoding ${JSON.stringify(node.file)}`);
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  const removed = scan.stats.filesSkipped === 0 && scan.stats.parseErrors === 0 && skipped === 0
    ? await removeStaleCodeNotes(vaultFs, slug, codeRoot, keep)
    : 0;
  return { written, removed, total, skipped };
}
