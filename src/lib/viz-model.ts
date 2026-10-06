// SPDX-License-Identifier: Apache-2.0
// Presentation of OUR model (vault, index, router, catalog, implementation).
// Does not change storage or routing.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { catalogRoot } from "./catalog.js";
import type { CodeGraphDump } from "./code-graph.js";

export interface VizNode {
  id: string;
  title: string;
  type: string;
  open?: { kind: "graph" | "doc"; id: string };
}

export interface VizEdge {
  from: string;
  to: string;
  type: string;
}

export interface VizGraph {
  title: string;
  subtitle: string;
  nodes: VizNode[];
  edges: VizEdge[];
}

export interface VizDoc {
  title: string;
  type: string;
  body: string;
}

export interface VizModel {
  root: string;
  graphs: Record<string, VizGraph>;
  docs: Record<string, VizDoc>;
  legend?: { types: Array<{ type: string; label: string; color: string }> };
}

const ARCH_DOCS: Record<string, VizDoc> = {
  "diag:erd": {
    title: "Data model (ERD)",
    type: "architecture",
    body: `Three stores. Markdown is source of truth. SQLite is a derived index. graph.json is the router.

\`\`\`mermaid
erDiagram
  NOTE ||--o{ EDGE : related
  NOTE {
    string path PK
    string type
    string title
    string body
  }
  EDGE {
    string from
    string to
    string type
  }
  PROJECT ||--o{ SKILL : activates
  SKILL ||--o{ SKILL : co_activation
  SESSION }o--o{ SKILL : used
  PROJECT {
    string stack
    string phase
  }
  SKILL {
    string id PK
    string pack
    bool always
  }
\`\`\``,
  },
  "arch:vault": {
    title: "Vault memory",
    type: "architecture",
    body: `The vault is SuperSkill's source of truth for **what is true about this project**.

Markdown notes live under \`projects/<slug>/\` only. Sibling projects cannot be read. Secrets in a write are rejected.

Click a note in the nested graph to read it.`,
  },
  "arch:index": {
    title: "Knowledge index",
    type: "architecture",
    body: `A derived SQLite file (FTS5 + edges), rebuilt from markdown.

- Search uses stemming (\`authorize\` finds Authorization).
- Links come from \`related:\` and \`[[wikilinks]]\`.
- The index is not a second wiki. If markdown and the index disagree, markdown wins — rebuild.`,
  },
  "arch:router": {
    title: "Skill router",
    type: "architecture",
    body: `\`graph.json\` in the repo decides **which playbook to load** for a task.

It is a small routing graph (skills, sessions, weights), not the knowledge base. Catalog packs load by language, phase, and triggers. A system brief (stack, recent sessions) is prepended so review/security see this project, not a generic checklist.`,
  },
  "arch:catalog": {
    title: "Our playbooks",
    type: "architecture",
    body: `In-repo catalog packs we own: memory, code, review, security, ops, devops, optimizer.

These are not scraped from skills.sh. Open this layer to see each pack, then open a playbook to read it.`,
  },
  "arch:impl": {
    title: "The program",
    type: "architecture",
    body: `The TypeScript implementation. Folders are modules; files import each other.

This is nested on purpose: the top picture is how SuperSkill works. The program is one node until you open it.`,
  },
};

const MODULE_TITLE: Record<string, string> = {
  src: "App entry",
  "src/cli": "Command line",
  "src/commands": "Commands",
  "src/commands/skill": "Skill commands",
  "src/commands/worktree": "Worktree commands",
  "src/core": "Command registry",
  "src/lib": "Libraries",
  "src/lib/graph": "Skill graph",
  "src/lib/skills-sh": "skills.sh client",
  "src/rules": "Rules engine",
  "src/setup": "Installer",
};

const VAULT_LAYER_FILES = new Set([
  "src/lib/vault-fs.ts",
  "src/lib/frontmatter.ts",
  "src/lib/knowledge-index.ts",
  "src/lib/knowledge-viz.ts",
]);

const HLA_LAYERS: Array<{ id: string; label: string; match: (file: string) => boolean }> = [
  {
    id: "entry",
    label: "Entry (CLI + MCP)",
    match: (f) => f === "src/main.ts" || f === "src/cli.ts" || f === "src/mcp-server.ts",
  },
  {
    id: "runtime",
    label: "Runtime",
    match: (f) => f === "src/app-context.ts" || f === "src/config.ts",
  },
  {
    id: "registry",
    label: "Registry + Commands",
    match: (f) => f.startsWith("src/core/") || f.startsWith("src/commands/"),
  },
  {
    id: "vault",
    label: "Vault + Index + Skill graph",
    match: (f) => VAULT_LAYER_FILES.has(f) || f.startsWith("src/lib/graph/"),
  },
  {
    id: "worktree",
    label: "Worktrees + Toolchains",
    match: (f) => f.startsWith("src/lib/worktree/") || f.startsWith("src/lib/toolchains/"),
  },
  {
    id: "hygiene",
    label: "Hygiene + Watchdog + Codegraph",
    match: (f) =>
      f.startsWith("src/lib/hygiene/") || f.startsWith("src/lib/watchdog/") || f.startsWith("src/lib/codegraph/"),
  },
  {
    id: "rules",
    label: "Rules engine + harness",
    match: (f) => f.startsWith("src/rules/"),
  },
  {
    id: "setup",
    label: "Installer",
    match: (f) => f.startsWith("src/setup/"),
  },
  {
    id: "telemetry",
    label: "Telemetry",
    match: (f) => f.startsWith("src/telemetry/"),
  },
  {
    id: "skills",
    label: "skills.sh (opt-in)",
    match: (f) => f.startsWith("src/lib/skills-sh/") || f === "src/lib/skill-installer.ts",
  },
];

const VAULT_ANCHOR: VizNode = {
  id: "arch:vault",
  title: "Vault memory",
  type: "architecture",
  open: { kind: "doc", id: "arch:vault" },
};

const NOTE_MODEL_LINKS: Array<{ pattern: RegExp; node: VizNode; type: string }> = [
  {
    pattern: /architecture\/high-level-architecture\.md$/,
    node: { id: "diag:high", title: "High-level architecture", type: "architecture", open: { kind: "doc", id: "diag:high" } },
    type: "shows",
  },
  {
    pattern: /architecture\/low-level-architecture\.md$/,
    node: { id: "arch:impl", title: "Modules", type: "architecture", open: { kind: "graph", id: "impl" } },
    type: "shows",
  },
  {
    pattern: /architecture\/data-model-erd\.md$/,
    node: { id: "diag:erd", title: "Data model (ERD)", type: "architecture", open: { kind: "doc", id: "diag:erd" } },
    type: "shows",
  },
];

const LEGEND_ENTRIES: Array<{ type: string; label: string; color: string }> = [
  { type: "architecture", label: "Architecture diagram", color: "#7aa2f7" },
  { type: "module", label: "Module (folder)", color: "#bb9af7" },
  { type: "code", label: "Source file", color: "#7dcfff" },
  { type: "pack", label: "Playbook pack", color: "#ff9e64" },
  { type: "playbook", label: "Playbook", color: "#9ece6a" },
  { type: "note", label: "Note", color: "#a9b1d6" },
  { type: "context", label: "Project context", color: "#e0af68" },
  { type: "adr", label: "Decision (ADR)", color: "#f7768e" },
  { type: "learning", label: "Learning", color: "#73daca" },
  { type: "task", label: "Task", color: "#ffc777" },
  { type: "session", label: "Session", color: "#2ac3de" },
  { type: "brainstorm", label: "Brainstorm", color: "#c678dd" },
  { type: "watchdog", label: "Watchdog report", color: "#e06c75" },
  { type: "evidence", label: "Evidence", color: "#7fd7c4" },
  { type: "ticket", label: "Ticket", color: "#ffb4a2" },
  { type: "spec", label: "Spec", color: "#b0c4de" },
];

const LEGEND_FALLBACK_COLOR = "#a9b1d6";

export function mermaidFlowchart(g: VizGraph): string {
  const lines = ["flowchart LR"];
  const clean = (s: string) => s.replace(/"/g, "");
  if (g.edges.length === 0) {
    for (const n of g.nodes) lines.push(`  ${mermaidId(n.id)}["${clean(n.title)}"]`);
  } else {
    for (const e of g.edges) {
      const a = g.nodes.find((n) => n.id === e.from)?.title ?? e.from;
      const b = g.nodes.find((n) => n.id === e.to)?.title ?? e.to;
      lines.push(`  ${mermaidId(e.from)}["${clean(a)}"] --> ${mermaidId(e.to)}["${clean(b)}"]`);
    }
  }
  return lines.join("\n");
}

function mermaidId(s: string): string {
  const id = s.replace(/[^a-zA-Z0-9]/g, "_");
  return id.length ? id.slice(0, 48) : "n";
}

function humanTitle(title: string | undefined, id: string): string {
  if (title && title.trim() && title !== fileTitle(id) && !title.includes("/")) return title.trim();
  const base = fileTitle(id).replace(/[-_]/g, " ").replace(/\.md$/i, "");
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function snippet(body: string): string {
  return body.replace(/```[\s\S]*?```/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

function attachStoreInventories(
  docs: Record<string, VizDoc>,
  notes: Array<{ id: string; title: string; type: string; body: string }>,
  edges: Array<{ from: string; to: string; type: string }>,
): void {
  const rows = notes.filter((n) => n.id.startsWith("projects/") || n.type !== "architecture");
  const list =
    rows.length === 0
      ? "_Nothing stored yet. Decide / learn / context writes will show up here._"
      : rows
          .map((n) => `- **${humanTitle(n.title, n.id)}** (${n.type})\n  ${snippet(n.body) || "(empty)"}`)
          .join("\n");
  const edgeList =
    edges.length === 0
      ? "_No links yet. Put \`related:\` or \`[[wikilinks]]\` in a note._"
      : edges.map((e) => `- ${humanTitle("", e.from)} → ${humanTitle("", e.to)} (${e.type})`).join("\n");

  docs["arch:vault"] = {
    ...docs["arch:vault"],
    body:
      `${docs["arch:vault"].body}\n\n## What is stored here (human-readable)\n\nThese are the actual notes in this project's vault:\n\n${list}\n`,
  };
  docs["arch:index"] = {
    ...docs["arch:index"],
    body:
      `${docs["arch:index"].body}\n\n## Indexed right now\n\n**${rows.length} notes**, **${edges.length} links** in FTS5.\n\n### Notes\n${list}\n\n### Links\n${edgeList}\n`,
  };
}

function fileTitle(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.tsx?$/, "");
}

function moduleId(fileId: string): string {
  const parts = fileId.split("/");
  if (parts.length <= 2) return parts[0] ?? "src";
  return parts.slice(0, -1).join("/");
}

function moduleTitle(id: string): string {
  const curated = MODULE_TITLE[id];
  if (curated) return curated;
  const parts = id.replace(/^src\//, "").split("/").filter(Boolean);
  if (parts.length === 0) return id;
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  return parts.reverse().join(" · ");
}

function isHlaSource(id: string): boolean {
  return !id.endsWith(".test.ts") && !id.endsWith(".spec.ts") && !id.includes("__fixtures__");
}

function hlaId(id: string): string {
  return `hla_${id.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

function buildHighLevelDoc(code: CodeGraphDump): VizDoc {
  const layerByFile = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const n of code.nodes) {
    if (!isHlaSource(n.id)) continue;
    const layer = HLA_LAYERS.find((l) => l.match(n.id));
    if (!layer) continue;
    layerByFile.set(n.id, layer.id);
    counts.set(layer.id, (counts.get(layer.id) ?? 0) + 1);
  }

  const present = HLA_LAYERS.filter((l) => counts.has(l.id));

  const pairs = new Set<string>();
  for (const e of code.edges) {
    const a = layerByFile.get(e.from);
    const b = layerByFile.get(e.to);
    if (!a || !b || a === b) continue;
    pairs.add(`${a}|${b}`);
  }

  if (present.length === 0) {
    return {
      title: "High-level architecture",
      type: "architecture",
      body: `High-level architecture is derived from the real module import graph, but no source modules were scanned.\n\nClick **The program** for the low-level module graph. Click **Data model** for the ERD.`,
    };
  }

  const order = new Map(HLA_LAYERS.map((l, i) => [l.id, i]));
  const sorted = [...pairs].sort((x, y) => {
    const [xa, xb] = x.split("|");
    const [ya, yb] = y.split("|");
    return (order.get(xa) ?? 0) - (order.get(ya) ?? 0) || (order.get(xb) ?? 0) - (order.get(yb) ?? 0);
  });

  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const lines = ["flowchart TB"];
  for (const l of present) {
    const count = counts.get(l.id) ?? 0;
    lines.push(`  ${hlaId(l.id)}["${l.label}<br/>${count} file${count === 1 ? "" : "s"}"]`);
  }
  for (const p of sorted) {
    const [from, to] = p.split("|");
    lines.push(`  ${hlaId(from)} --> ${hlaId(to)}`);
  }

  return {
    title: "High-level architecture",
    type: "architecture",
    body: `Layer view derived from the real import graph: **${total} modules** in **${present.length} layers**, **${pairs.size} aggregated imports**. Arrows point from importer to imported.\n\n\`\`\`mermaid\n${lines.join("\n")}\n\`\`\`\n\nClick **The program** for the low-level module graph. Click **Data model** for the ERD.`,
  };
}

function buildVaultGraph(vault: {
  nodes: Array<{ id: string; title: string; type: string }>;
  edges: Array<{ from: string; to: string; type: string }>;
}): VizGraph {
  const nodes: VizNode[] = vault.nodes.map((n) => ({
    id: n.id,
    title: humanTitle(n.title, n.id),
    type: n.type || "note",
    open: { kind: "doc", id: n.id },
  }));
  const ids = new Set(nodes.map((n) => n.id));
  const edges: VizEdge[] = vault.edges
    .filter((e) => ids.has(e.from) && ids.has(e.to))
    .map((e) => ({ ...e }));
  const edgeKeys = new Set(edges.map((e) => `${e.from}|${e.to}|${e.type}`));

  const ensureNode = (node: VizNode): void => {
    if (ids.has(node.id)) return;
    ids.add(node.id);
    nodes.push({ ...node });
  };
  const addEdge = (from: string, to: string, type: string): void => {
    const key = `${from}|${to}|${type}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ from, to, type });
  };

  for (const note of [...nodes]) {
    for (const link of NOTE_MODEL_LINKS) {
      if (!link.pattern.test(note.id)) continue;
      ensureNode(link.node);
      addEdge(note.id, link.node.id, link.type);
    }
  }

  const touched = new Set<string>();
  for (const e of edges) {
    touched.add(e.from);
    touched.add(e.to);
  }
  const orphans = nodes.filter((n) => n.id.startsWith("projects/") && !touched.has(n.id));
  if (orphans.length > 0) {
    ensureNode(VAULT_ANCHOR);
    for (const n of orphans) addEdge(n.id, VAULT_ANCHOR.id, "stored in");
  }

  return {
    title: "Vault memory",
    subtitle: "Notes for this project. Click a note to read it.",
    nodes,
    edges,
  };
}

function humanTypeLabel(type: string): string {
  return type
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildLegend(
  graphs: Record<string, VizGraph>,
  docs: Record<string, VizDoc>,
): { types: Array<{ type: string; label: string; color: string }> } {
  const present = new Set<string>();
  for (const g of Object.values(graphs)) {
    for (const n of g.nodes) present.add(n.type || "note");
  }
  for (const d of Object.values(docs)) {
    if (d.type) present.add(d.type);
  }
  const types = LEGEND_ENTRIES.filter((e) => present.has(e.type)).map((e) => ({ ...e }));
  const known = new Set(LEGEND_ENTRIES.map((e) => e.type));
  for (const t of present) {
    if (known.has(t)) continue;
    types.push({ type: t, label: humanTypeLabel(t), color: LEGEND_FALLBACK_COLOR });
  }
  return { types };
}

export function buildVizModel(opts: {
  slug: string;
  vault: { nodes: Array<{ id: string; title: string; type: string }>; edges: Array<{ from: string; to: string; type: string }> };
  docs: Array<{ id: string; title: string; type: string; body: string }>;
  code: CodeGraphDump;
}): VizModel {
  const docs: Record<string, VizDoc> = { ...ARCH_DOCS };
  for (const d of opts.docs) {
    docs[d.id] = { title: d.title || fileTitle(d.id), type: d.type, body: d.body };
  }

  const vault = buildVaultGraph(opts.vault);

  attachStoreInventories(docs, opts.docs, opts.vault.edges);

  const catalog = readCatalogLayer(docs);

  const impl = buildImplementationLayer(opts.code, docs);
  docs["diag:high"] = buildHighLevelDoc(opts.code);
  docs["diag:low"] = {
    title: "Low-level architecture",
    type: "architecture",
    body: `Module dependencies in this repo.\n\n\`\`\`mermaid\n${mermaidFlowchart(impl.modules)}\n\`\`\`\n`,
  };

  const graphs: Record<string, VizGraph> = {
    root: {
      title: "SuperSkill",
      subtitle: `How ${opts.slug} is put together — click a node to open it`,
      nodes: [
        { id: "diag:high", title: "High-level architecture", type: "architecture", open: { kind: "doc", id: "diag:high" } },
        { id: "arch:vault", title: "Vault memory", type: "architecture", open: { kind: "graph", id: "vault" } },
        { id: "arch:index", title: "Knowledge index", type: "architecture", open: { kind: "doc", id: "arch:index" } },
        { id: "arch:router", title: "Skill router", type: "architecture", open: { kind: "doc", id: "arch:router" } },
        { id: "arch:catalog", title: "Our playbooks", type: "architecture", open: { kind: "graph", id: "catalog" } },
        { id: "diag:low", title: "Low-level architecture", type: "architecture", open: { kind: "doc", id: "diag:low" } },
        { id: "diag:erd", title: "Data model (ERD)", type: "architecture", open: { kind: "doc", id: "diag:erd" } },
        { id: "arch:impl", title: "Modules", type: "architecture", open: { kind: "graph", id: "impl" } },
      ],
      edges: [
        { from: "arch:vault", to: "arch:index", type: "indexed into" },
        { from: "arch:index", to: "arch:router", type: "briefs" },
        { from: "arch:catalog", to: "arch:router", type: "loads" },
        { from: "arch:router", to: "arch:impl", type: "runs in" },
        { from: "arch:impl", to: "arch:vault", type: "writes" },
        { from: "arch:impl", to: "arch:index", type: "rebuilds" },
      ],
    },
    vault,
    catalog: catalog.graph,
    impl: impl.modules,
    ...impl.fileGraphs,
  };

  return { root: "root", graphs, docs, legend: buildLegend(graphs, docs) };
}

function readCatalogLayer(docs: Record<string, VizDoc>): { graph: VizGraph } {
  const nodes: VizNode[] = [];
  const edges: VizEdge[] = [];
  let root: string;
  try {
    root = catalogRoot();
    const packs = readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory());
    for (const p of packs) {
      const packId = `pack:${p.name}`;
      nodes.push({
        id: packId,
        title: packLabel(p.name),
        type: "pack",
        open: { kind: "doc", id: packId },
      });
      docs[packId] = {
        title: packLabel(p.name),
        type: "pack",
        body: `Playbook pack **${p.name}**. Open a skill node (if shown as a child edge) to read the markdown we own in-repo.`,
      };
      const files = readdirSync(join(root, p.name)).filter((f) => f.endsWith(".md"));
      for (const f of files) {
        const id = `catalog:${p.name}/${f}`;
        const abs = join(root, p.name, f);
        let raw = "";
        try {
          raw = readFileSync(abs, "utf-8");
        } catch {
          continue;
        }
        const title = heading(raw) || f.replace(/\.md$/, "");
        nodes.push({ id, title, type: "playbook", open: { kind: "doc", id } });
        docs[id] = { title, type: "playbook", body: raw };
        edges.push({ from: packId, to: id, type: "contains" });
      }
    }
  } catch {
    return {
      graph: { title: "Our playbooks", subtitle: "Catalog not on disk.", nodes: [], edges: [] },
    };
  }
  return {
    graph: {
      title: "Our playbooks",
      subtitle: "In-repo packs. Click a playbook to read it.",
      nodes,
      edges,
    },
  };
}

function packLabel(name: string): string {
  const labels: Record<string, string> = {
    memory: "Shared memory",
    code: "Language craft",
    review: "Review",
    security: "Security",
    ops: "Operations",
    devops: "DevOps",
    optimizer: "Token driving",
    pipeline: "Delivery order",
  };
  return labels[name] ?? name;
}

function heading(raw: string): string | null {
  const m = raw.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function buildImplementationLayer(
  code: CodeGraphDump,
  docs: Record<string, VizDoc>,
): { modules: VizGraph; fileGraphs: Record<string, VizGraph> } {
  const fileGraphs: Record<string, VizGraph> = {};
  const byMod = new Map<string, string[]>();
  for (const n of code.nodes) {
    const mod = moduleId(n.id);
    const list = byMod.get(mod) ?? [];
    list.push(n.id);
    byMod.set(mod, list);
    const excerpt = ""; // filled by caller via code files if needed
    docs[n.id] = {
      title: fileTitle(n.id),
      type: "code",
      body: excerpt || `Source file \`${n.id}\`.\n\nThis is implementation, nested under **The program**.`,
    };
  }

  const moduleNodes: VizNode[] = [...byMod.keys()].map((mod) => ({
    id: `mod:${mod}`,
    title: moduleTitle(mod),
    type: "module",
    open: { kind: "graph", id: `mod:${mod}` },
  }));

  const moduleEdges: VizEdge[] = [];
  const mek = new Set<string>();
  for (const e of code.edges) {
    const a = moduleId(e.from);
    const b = moduleId(e.to);
    if (a === b) continue;
    const k = `mod:${a}|mod:${b}`;
    if (mek.has(k)) continue;
    mek.add(k);
    moduleEdges.push({ from: `mod:${a}`, to: `mod:${b}`, type: "uses" });
  }

  for (const [mod, files] of byMod) {
    const fileSet = new Set(files);
    const nodes: VizNode[] = files.map((id) => ({
      id,
      title: fileTitle(id),
      type: "code",
      open: { kind: "doc", id },
    }));
    const edges = code.edges.filter((e) => fileSet.has(e.from) && fileSet.has(e.to));
    fileGraphs[`mod:${mod}`] = {
      title: moduleTitle(mod),
      subtitle: "Click a file name to see what it is.",
      nodes,
      edges,
    };
  }

  return {
    modules: {
      title: "The program",
      subtitle: "Modules. Click one to see the files inside.",
      nodes: moduleNodes,
      edges: moduleEdges,
    },
    fileGraphs,
  };
}

const CODE_BODY_MAX_LINES = 60;
const CODE_BODY_MAX_CHARS = 2048;

export function attachCodeBodies(
  model: VizModel,
  codeRoot: string,
  readFile: (abs: string) => string,
): void {
  for (const [id, doc] of Object.entries(model.docs)) {
    if (doc.type !== "code" || !id.endsWith(".ts")) continue;
    let raw: string;
    try {
      raw = readFile(join(codeRoot, id));
    } catch {
      continue;
    }
    const total = raw.split("\n").length;
    const kept = raw.split("\n").slice(0, CODE_BODY_MAX_LINES);
    let excerpt = kept.join("\n");
    while (excerpt.length > CODE_BODY_MAX_CHARS && kept.length > 1) {
      kept.pop();
      excerpt = kept.join("\n");
    }
    if (excerpt.length > CODE_BODY_MAX_CHARS) excerpt = excerpt.slice(0, CODE_BODY_MAX_CHARS);
    const shown = excerpt.split("\n").length;
    const suffix = shown < total ? `\n// … truncated: first ${shown} of ${total} lines` : "";
    doc.body = `# ${doc.title}\n\n\`${id}\`\n\n\`\`\`ts\n${excerpt}${suffix}\n\`\`\`\n`;
  }
}
