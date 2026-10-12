// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CodeNode, ScanResult } from "./codegraph/types.js";
import { GENERATED_MARKER } from "./knowledge-viz.js";
import { scanForSecrets } from "./secret-scanner.js";
import { VaultError, type VaultFS } from "./vault-fs.js";

const SYMBOL_LIMIT = 40;
const REMOVAL_DEPTH = 64;

const FENCE_LANGUAGE: Record<string, string> = {
  typescript: "ts",
  tsx: "tsx",
  python: "python",
  go: "go",
  rust: "rs",
  swift: "swift",
  java: "java",
  c: "c",
  cpp: "cpp",
};

export interface WriteCodeNotesResult {
  written: number;
  removed: number;
  total: number;
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function codeNoteVaultPath(slug: string, file: string): string {
  return `projects/${slug}/code/${file}.md`;
}

export function codeNoteLinkTarget(slug: string, file: string): string {
  return `projects/${slug}/code/${file}`;
}

function noteHash(source: string): string {
  return createHash("sha256").update(source, "utf-8").digest("hex").slice(0, 12);
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
}): { content: string; hash: string } {
  const { slug, file, language, source, symbols, imports, importedBy } = args;
  const hash = noteHash(source);
  const lines: string[] = [
    "---",
    "type: code",
    `project: ${JSON.stringify(slug)}`,
    `path: ${JSON.stringify(file)}`,
    `language: ${language}`,
    `hash: ${hash}`,
    "generated: true",
    "---",
    "",
    GENERATED_MARKER,
    "",
    `# ${file}`,
    "",
    `${lineCount(source)} lines · ${Buffer.byteLength(source, "utf-8")} bytes · ${language}`,
  ];
  if (symbols.length > 0) {
    lines.push("", "## Symbols", "");
    for (const symbol of symbols.slice(0, SYMBOL_LIMIT)) lines.push(`- \`${symbol.name}\` (${symbol.kind})`);
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
    lines.push(`${fence}${FENCE_LANGUAGE[language] ?? ""}`, source.replace(/\n$/, ""), fence);
  }
  return { content: `${lines.join("\n")}\n`, hash };
}

async function writeIfChanged(vaultFs: VaultFS, path: string, content: string, hash: string): Promise<boolean> {
  let written = false;
  await vaultFs.update(
    path,
    (current) => {
      if (current === content) return current;
      const generated = current.includes(GENERATED_MARKER);
      if (generated && current.match(/^hash: ([0-9a-f]+)$/m)?.[1] === hash) return current;
      if (!generated && current.length > 0) return current;
      written = true;
      return content;
    },
    { create: true },
  );
  return written;
}

async function removeStaleCodeNotes(vaultFs: VaultFS, slug: string, keep: Set<string>): Promise<number> {
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
    let content: string;
    try {
      content = await vaultFs.read(entry);
    } catch (error) {
      if (error instanceof VaultError && error.code === "FILE_NOT_FOUND") continue;
      console.error(`[code-notes] cannot read stale note ${entry}: ${(error as NodeJS.ErrnoException).code ?? String(error)}`);
      continue;
    }
    if (!content.includes(GENERATED_MARKER)) continue;
    await vaultFs.delete(entry);
    removed += 1;
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
    const imports = importsByFile.get(from.file) ?? new Set<string>();
    imports.add(to.file);
    importsByFile.set(from.file, imports);
    const importedBy = importedByFile.get(to.file) ?? new Set<string>();
    importedBy.add(from.file);
    importedByFile.set(to.file, importedBy);
  }

  const keep = new Set<string>();
  let written = 0;
  for (const node of moduleNodes) {
    const path = codeNoteVaultPath(slug, node.file);
    keep.add(path);
    let source: string;
    try {
      source = await readFile(join(codeRoot, node.file), "utf-8");
    } catch (error) {
      console.error(`[code-notes] skipping unreadable ${node.file}: ${(error as NodeJS.ErrnoException).code ?? String(error)}`);
      continue;
    }
    const symbols = (symbolsByFile.get(node.file) ?? [])
      .slice()
      .sort((a, b) => a.span.startLine - b.span.startLine || compare(a.id, b.id));
    const imports = [...(importsByFile.get(node.file) ?? [])].sort(compare);
    const importedBy = [...(importedByFile.get(node.file) ?? [])].sort(compare);
    const { content, hash } = renderNote({
      slug,
      file: node.file,
      language: node.language,
      source,
      symbols,
      imports,
      importedBy,
    });
    try {
      if (await writeIfChanged(vaultFs, path, content, hash)) written += 1;
    } catch (error) {
      if (error instanceof VaultError && error.code === "SECRET_REJECTED") {
        console.error(`[code-notes] vault rejected ${node.file}: ${error.message.split("\n")[0]}`);
        continue;
      }
      throw error;
    }
  }

  const removed = await removeStaleCodeNotes(vaultFs, slug, keep);
  return { written, removed, total: moduleNodes.length };
}
