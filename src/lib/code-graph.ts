// SPDX-License-Identifier: AGPL-3.0-or-later

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export interface CodeGraphDump {
  nodes: Array<{ id: string; title: string; type: string }>;
  edges: Array<{ from: string; to: string; type: string }>;
}

const FROM_RE = /from\s+["'](\.\.?\/[^"']+)["']/g;

function walkTs(dir: string, acc: string[]): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist") continue;
      walkTs(full, acc);
    } else if (e.isFile() && e.name.endsWith(".ts") && !e.name.endsWith(".d.ts")) {
      acc.push(full);
    }
  }
}

function posixRel(root: string, abs: string): string {
  return relative(root, abs).split("\\").join("/");
}

function resolveImport(fromAbs: string, spec: string, files: Set<string>): string | null {
  const raw = spec.replace(/\\/g, "/").replace(/['"]/g, "");
  const base = resolve(dirname(fromAbs), raw);
  const stripped = base.replace(/\.js$/, "");
  const candidates = [
    base,
    `${stripped}.ts`,
    `${stripped}.tsx`,
    join(stripped, "index.ts"),
  ];
  for (const c of candidates) {
    if (files.has(c)) return c;
  }
  return null;
}

export function scanImportGraph(projectRoot: string, srcDir = "src"): CodeGraphDump {
  const absSrc = join(projectRoot, srcDir);
  if (!existsSync(absSrc) || !statSync(absSrc).isDirectory()) {
    return { nodes: [], edges: [] };
  }
  const files: string[] = [];
  walkTs(absSrc, files);
  const fileSet = new Set(files);
  const nodes = files.map((abs) => {
    const id = posixRel(projectRoot, abs);
    return { id, title: id.split("/").pop() ?? id, type: "code" };
  });
  const edges: CodeGraphDump["edges"] = [];
  const seen = new Set<string>();
  for (const abs of files) {
    let src: string;
    try {
      src = readFileSync(abs, "utf-8");
    } catch {
      continue;
    }
    FROM_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = FROM_RE.exec(src)) !== null) {
      const resolved = resolveImport(abs, m[1], fileSet);
      if (!resolved) continue;
      const from = posixRel(projectRoot, abs);
      const to = posixRel(projectRoot, resolved);
      if (from === to) continue;
      const key = `${from}|${to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from, to, type: "import" });
    }
  }
  return { nodes, edges };
}

export function mergeGraphDumps(
  ...dumps: Array<{ nodes: CodeGraphDump["nodes"]; edges: CodeGraphDump["edges"] }>
): CodeGraphDump {
  const nodes = new Map<string, CodeGraphDump["nodes"][0]>();
  const edges: CodeGraphDump["edges"] = [];
  const ek = new Set<string>();
  for (const d of dumps) {
    for (const n of d.nodes) nodes.set(n.id, n);
    for (const e of d.edges) {
      const k = `${e.from}|${e.to}|${e.type}`;
      if (ek.has(k)) continue;
      ek.add(k);
      edges.push(e);
    }
  }
  return { nodes: [...nodes.values()], edges };
}
