// SPDX-License-Identifier: Apache-2.0
// Presentation of OUR model (vault, index, router, catalog, implementation).
// Does not change storage or routing.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { catalogRoot } from "./catalog.js";
import { getPhaseBudget } from "./context-budget.js";
import { parseFrontmatter } from "./frontmatter.js";
import type { CodeGraphDump } from "./code-graph.js";

export interface VizNode {
  id: string;
  title: string;
  type: string;
  open?: { kind: "graph" | "doc"; id: string };
  parent?: string;
}

export interface VizEdge {
  from: string;
  to: string;
  type: string;
  label?: string;
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
  related?: string[];
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
  accTitle: Entity relationship diagram for SuperSkill
  accDescr: Notes link to related edges, projects activate skills, skills co-activate, and sessions use skills.
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
  "view:root": {
    title: "Retrieval",
    type: "architecture",
    body: `**Every edge here is a token decision.** This graph is the agent's actual path — task → router → packs → loader → context — plus the write-back loop that keeps it fed.

- \`search hits\` and \`rebuild\` are cheap: SQLite and markdown, no model context spent.
- \`pack set\` keeps routing narrow; the router never reads every playbook.
- \`top-k skills\` loads only what scored; CONTENT markdown is the heaviest phase.
- \`harness rules\` comes from the **Rules library** view: task → pack → language → prefix → rule. Open the *Rules engine* node to descend it, or follow the same path with \`graph resolve / children / open\`.
- \`brief + rules \u2264 budget\` is the contract: what reaches the agent context must fit the token budget. INDEX and NEIGHBORHOOD are optional, so a small task never pays for deep loading.
- \`outcome\` → \`markdown\` turns one session into one note the next retrieval can find, instead of replaying transcripts.
`,
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
  {
    pattern: /architecture\/dataflow\.md$/,
    node: { id: "diag:flow", title: "Dataflow", type: "architecture", open: { kind: "doc", id: "diag:flow" } },
    type: "shows",
  },
];

const LEGEND_ENTRIES: Array<{ type: string; label: string; color: string }> = [
  { type: "architecture", label: "Architecture diagram", color: "#7aa2f7" },
  { type: "agent", label: "Agent / task", color: "#f5a97f" },
  { type: "router", label: "Router", color: "#ee99a0" },
  { type: "loader", label: "Content loader", color: "#91d7e3" },
  { type: "index", label: "Index", color: "#a6da95" },
  { type: "layer", label: "Layer (collapsible)", color: "#8f96a3" },
  { type: "rules", label: "Rules group", color: "#c9a0ff" },
  { type: "rule", label: "Rule", color: "#e5c07b" },
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

interface DiagramEdge {
  from: string;
  to: string;
  label: string;
  count: number;
}

export const MERMAID_INIT =
  '%%{init: {"flowchart": {"curve": "linear", "nodeSpacing": 40, "rankSpacing": 60}}}%%';

export const RULE_BODY_MAX_CHARS = 700;

export function resolveRuleRelated(
  targets: readonly string[],
  known: ReadonlySet<string>,
): { known: string[]; skipped: number } {
  const resolved: string[] = [];
  let skipped = 0;
  for (const target of targets) {
    const t = target.trim();
    if (!t) continue;
    if (known.has(t)) {
      if (!resolved.includes(t)) resolved.push(t);
    } else {
      skipped++;
    }
  }
  return { known: resolved, skipped };
}

function sequentialIds(ids: string[]): Map<string, string> {
  const map = new Map<string, string>();
  [...new Set(ids)].sort().forEach((id, i) => map.set(id, `n${i + 1}`));
  return map;
}

function idNumber(mermaidId: string): number {
  return Number(mermaidId.replace(/^n/, "")) || 0;
}

function cleanMermaidText(s: string): string {
  return s.replace(/["|<>]/g, " ").replace(/\s+/g, " ").trim();
}

function cleanLabel(s: string): string {
  return s.replace(/["|]/g, " ").replace(/\s+/g, " ").trim();
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function sortEdges(edges: DiagramEdge[]): DiagramEdge[] {
  return [...edges].sort(
    (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.label.localeCompare(b.label),
  );
}

function textTwin(ids: Map<string, string>, nodeTable: string, edges: DiagramEdge[]): string {
  const idRows = [...ids.entries()]
    .sort((a, b) => idNumber(a[1]) - idNumber(b[1]))
    .map(([id, mermaidId]) => `| ${mermaidId} | ${escapeCell(id)} |`);
  const edgeRows = sortEdges(edges).map(
    (e) => `| ${escapeCell(e.from)} | ${escapeCell(e.to)} | ${escapeCell(e.label)} | ${e.count} |`,
  );
  return [
    "### Ids",
    "| mermaid | id |",
    "| --- | --- |",
    ...idRows,
    "",
    nodeTable,
    "",
    "### Edges",
    "| from | to | label | count |",
    "| --- | --- | --- | --- |",
    ...edgeRows,
  ].join("\n");
}

export function mermaidFlowchart(g: VizGraph): string {
  const ids = sequentialIds(g.nodes.map((n) => n.id));
  const lines = [
    MERMAID_INIT,
    "flowchart LR",
    `  accTitle: ${cleanMermaidText(g.title || "Dependency diagram")}`,
    `  accDescr: ${cleanMermaidText(g.subtitle || `${g.nodes.length} nodes and ${g.edges.length} edges`)}`,
  ];
  if (g.edges.length === 0) {
    for (const n of [...g.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      lines.push(`  ${ids.get(n.id)}["${cleanMermaidText(n.title)}"]`);
    }
  } else {
    const edges = sortEdges(
      g.edges.map((e) => ({ from: e.from, to: e.to, label: e.label ?? e.type, count: 0 })),
    );
    for (const e of edges) {
      const a = g.nodes.find((n) => n.id === e.from)?.title ?? e.from;
      const b = g.nodes.find((n) => n.id === e.to)?.title ?? e.to;
      lines.push(
        `  ${ids.get(e.from)}["${cleanMermaidText(a)}"] -->|"${cleanMermaidText(e.label)}"| ${ids.get(e.to)}["${cleanMermaidText(b)}"]`,
      );
    }
  }
  return lines.join("\n");
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

const SYSTEM_ID = "SYS:SuperSkill";

const HLA_EXTERNALS: Array<{ id: string; name: string; notes: string; label: string }> = [
  {
    id: "EXT:agent",
    name: "Coding agent (LLM)",
    notes: "[Person via MCP/CLI] — sends tasks and calls tools",
    label: "Coding agent (LLM)<br/>[Person via MCP/CLI] — sends tasks, calls tools",
  },
  {
    id: "EXT:git",
    name: "Git repo (code under analysis)",
    notes: "[External system] — source files for import scans",
    label: "Git repo (code under analysis)<br/>[External system] — source files",
  },
  {
    id: "EXT:human",
    name: "Human operator",
    notes: "[Person] — sets tasks, reads notes and diagrams",
    label: "Human operator<br/>[Person] — sets tasks, reads notes and diagrams",
  },
  {
    id: "EXT:skills.sh",
    name: "skills.sh (audit source)",
    notes: "[External system] — gen / socket / snyk audit data",
    label: "skills.sh (audit source)<br/>[External system] — gen / socket / snyk audits",
  },
];

const HLA_RESPONSIBILITY: Record<string, string> = {
  entry: "TypeScript/Node — parses tasks; exposes CLI + MCP tools",
  runtime: "TypeScript/Node — config, app context, project resolution",
  registry: "TypeScript/Node — command registry and command modules",
  vault: "files + SQLite — jailed notes and FTS5 + edges index",
  worktree: "files — shared build caches for git worktrees",
  hygiene: "TypeScript/Node — hygiene checks, watchdog, code-graph scans",
  rules: "TypeScript/Node — rules engine and harness checks",
  setup: "TypeScript/Node — installer and postinstall wiring",
  telemetry: "local files — telemetry recorder",
  skills: "skills.sh client — opt-in installs, audited content",
};

const HLA_BOUNDARY_IN: Array<{ from: string; toLayer: string; label: string }> = [
  { from: "EXT:human", toLayer: "entry", label: "task" },
  { from: "EXT:agent", toLayer: "entry", label: "task" },
  { from: "EXT:agent", toLayer: "entry", label: "tools" },
  { from: "EXT:skills.sh", toLayer: "skills", label: "audit data" },
  { from: "EXT:git", toLayer: "hygiene", label: "source files" },
];

const HLA_BOUNDARY_OUT: Array<{ fromLayer: string; to: string; label: string }> = [
  { fromLayer: "entry", to: "EXT:agent", label: "brief + rules" },
  { fromLayer: "entry", to: "EXT:human", label: "notes + diagrams" },
];

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

  const pairCounts = new Map<string, number>();
  for (const e of code.edges) {
    const a = layerByFile.get(e.from);
    const b = layerByFile.get(e.to);
    if (!a || !b || a === b) continue;
    const key = `${a}|${b}`;
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }

  if (present.length === 0) {
    return {
      title: "High-level architecture",
      type: "architecture",
      body: `High-level architecture is derived from the real module import graph, but no source modules were scanned.\n\nOpen the **Modules** tab for the low-level module graph. Open the **ERD** tab for the data model.`,
    };
  }

  const containerId = (layerId: string) => `C:${layerId}`;
  const presentIds = new Set(present.map((l) => l.id));
  const primary = presentIds.has("entry") ? "entry" : present[0].id;
  const target = (layerId: string) => (presentIds.has(layerId) ? layerId : primary);

  const nodes: Array<{ id: string; label: string; name: string; notes: string }> = [
    { id: SYSTEM_ID, label: "SuperSkill (system)", name: "SuperSkill (system)", notes: "System boundary." },
    ...present.map((l) => {
      const fileCount = counts.get(l.id) ?? 0;
      return {
        id: containerId(l.id),
        label: `${l.label}<br/>[Container] ${HLA_RESPONSIBILITY[l.id] ?? "TypeScript/Node"}`,
        name: l.label,
        notes: `[Container] ${HLA_RESPONSIBILITY[l.id] ?? "TypeScript/Node"} — ${fileCount} file${fileCount === 1 ? "" : "s"}`,
      };
    }),
    ...HLA_EXTERNALS.map((e) => ({ id: e.id, label: e.label, name: e.name, notes: e.notes })),
  ];
  const labelById = new Map(nodes.map((n) => [n.id, n.label]));

  const edges: DiagramEdge[] = [];
  for (const [key, count] of pairCounts) {
    const [from, to] = key.split("|");
    edges.push({
      from: containerId(from),
      to: containerId(to),
      label: `${count} import${count === 1 ? "" : "s"}`,
      count,
    });
  }
  for (const e of HLA_BOUNDARY_IN) {
    edges.push({ from: e.from, to: containerId(target(e.toLayer)), label: e.label, count: 1 });
  }
  for (const e of HLA_BOUNDARY_OUT) {
    edges.push({ from: containerId(target(e.fromLayer)), to: e.to, label: e.label, count: 1 });
  }

  const ids = sequentialIds(nodes.map((n) => n.id));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const totalImports = [...pairCounts.values()].reduce((a, b) => a + b, 0);

  const lines = [
    MERMAID_INIT,
    "flowchart TB",
    "  accTitle: Container diagram for SuperSkill",
    `  accDescr: System boundary with ${present.length} containers and ${totalImports} cross-layer imports. Externals are the human operator, the coding agent, skills.sh, and the git repo.`,
    `  subgraph ${ids.get(SYSTEM_ID)}["SuperSkill (system)"]`,
  ];
  for (const l of present) {
    lines.push(`    ${ids.get(containerId(l.id))}["${cleanLabel(labelById.get(containerId(l.id)) ?? l.label)}"]`);
  }
  lines.push("  end");
  for (const e of HLA_EXTERNALS) {
    lines.push(`  ${ids.get(e.id)}["${cleanLabel(e.label)}"]`);
  }
  for (const e of sortEdges(edges)) {
    lines.push(`  ${ids.get(e.from)} -->|"${cleanLabel(e.label)}"| ${ids.get(e.to)}`);
  }

  const nodeTable = [
    "### Nodes",
    "| id | name | path / notes |",
    "| --- | --- | --- |",
    ...[...nodes].sort((a, b) => a.id.localeCompare(b.id)).map(
      (n) => `| ${escapeCell(n.id)} | ${escapeCell(n.name)} | ${escapeCell(n.notes)} |`,
    ),
  ].join("\n");

  return {
    title: "High-level architecture",
    type: "architecture",
    body: `Container diagram for the SuperSkill system: **${total} modules** in **${present.length} containers**, **${totalImports} aggregated imports** across **${pairCounts.size} container pairs**. Boxes inside the boundary are containers (architectural layers); labels carry technology and one-line responsibility. Arrows are unidirectional, caller → callee; \`N imports\` is the aggregated TypeScript import count between layers. Externals sit outside the boundary.

\`\`\`mermaid
${lines.join("\n")}
\`\`\`

**Legend.** \`subgraph\` = system boundary; \`[Container]\` = inside the boundary; \`[Person]\` / \`[External system]\` = externals; \`nX\` = Mermaid id (mapped in the Ids twin); camel arrows \`-->\` = one direction only (caller → callee). Dependency direction: \`A -->|"N imports"| B\` means A imports B.

${textTwin(ids, nodeTable, edges)}

Open the **Modules** tab for the module-level (component) view. The **Flow** tab shows how data moves at runtime.`,
  };
}

export function findImportCycles(edges: ReadonlyArray<{ from: string; to: string }>): string[][] {
  const nodes = [...new Set(edges.flatMap((e) => [e.from, e.to]))].sort();
  const adjacency = new Map<string, string[]>(nodes.map((n) => [n, []]));
  for (const e of edges) {
    if (e.from === e.to) continue;
    adjacency.get(e.from)?.push(e.to);
  }
  const selfLoops = new Set(edges.filter((e) => e.from === e.to).map((e) => e.from));

  let counter = 0;
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];

  const visit = (v: string): void => {
    index.set(v, counter);
    low.set(v, counter);
    counter++;
    stack.push(v);
    onStack.add(v);
    for (const w of adjacency.get(v) ?? []) {
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }
    if (low.get(v) !== index.get(v)) return;
    const component: string[] = [];
    let w: string;
    do {
      w = stack.pop()!;
      onStack.delete(w);
      component.push(w);
    } while (w !== v);
    component.sort();
    if (component.length > 1 || (component.length === 1 && selfLoops.has(component[0]))) {
      cycles.push(component);
    }
  };

  for (const n of nodes) {
    if (!index.has(n)) visit(n);
  }
  return cycles.sort((a, b) => a[0].localeCompare(b[0]));
}

function cycleBackEdgeKeys(
  cycles: string[][],
  edges: ReadonlyArray<{ from: string; to: string }>,
): Set<string> {
  const keys = new Set<string>();
  for (const cycle of cycles) {
    const members = new Set(cycle);
    const adjacency = new Map<string, string[]>();
    for (const e of edges) {
      if (!members.has(e.from) || !members.has(e.to)) continue;
      const list = adjacency.get(e.from) ?? [];
      list.push(e.to);
      adjacency.set(e.from, list);
    }
    for (const list of adjacency.values()) list.sort();
    const seen = new Set<string>([cycle[0]]);
    const queue = [cycle[0]];
    while (queue.length > 0) {
      const v = queue.shift()!;
      for (const w of adjacency.get(v) ?? []) {
        if (seen.has(w)) {
          keys.add(`${v}|${w}`);
          continue;
        }
        seen.add(w);
        queue.push(w);
      }
    }
  }
  return keys;
}

function buildLowLevelDoc(modules: VizGraph): VizDoc {
  const layerNodes = modules.nodes.filter((n) => n.type === "layer");
  const moduleNodes = modules.nodes.filter((n) => n.type === "module").sort((a, b) => a.id.localeCompare(b.id));
  const edges = sortEdges(
    modules.edges.map((e) => ({
      from: e.from,
      to: e.to,
      label: "imports",
      count: Number((e.label ?? "1").split(" ")[0]) || 1,
    })),
  );
  const cycles = findImportCycles(edges.map((e) => ({ from: e.from, to: e.to })));
  const cycleKey = new Map<string, number>();
  cycles.forEach((cycle, i) => cycle.forEach((id) => cycleKey.set(id, i)));
  const fanOut = new Map<string, number>();
  const fanIn = new Map<string, number>();
  for (const e of edges) {
    fanOut.set(e.from, (fanOut.get(e.from) ?? 0) + 1);
    fanIn.set(e.to, (fanIn.get(e.to) ?? 0) + 1);
  }

  const diagramNodes = [
    ...layerNodes.map((l) => ({ id: l.id, title: l.title, kind: "layer" as const })),
    ...moduleNodes.map((m) => ({ id: m.id, title: m.title, kind: "module" as const, parent: m.parent })),
  ];
  const ids = sequentialIds(diagramNodes.map((n) => n.id));
  const mid = (id: string) => ids.get(id) ?? "n?";

  const lines = [
    MERMAID_INIT,
    "flowchart LR",
    "  accTitle: Module dependency diagram for the SuperSkill implementation",
    `  accDescr: ${moduleNodes.length} modules grouped in ${layerNodes.length} layers. A imports B means A depends on B. ${
      cycles.length === 0
        ? "No import cycles detected."
        : `Import cycles detected: ${cycles.map((c) => c.join(" to ")).join(", ")}.`
    }`,
  ];
  const emitted = new Set<string>();
  for (const layer of layerNodes) {
    const children = moduleNodes.filter((m) => m.parent === layer.id);
    if (children.length === 0) continue;
    const cycleCount = children.filter((m) => cycleKey.has(m.id)).length;
    const layerTitle = cycleCount > 0 ? `${layer.title} ⚠ ${cycleCount}` : layer.title;
    lines.push(`  subgraph ${mid(layer.id)}["${cleanLabel(layerTitle)}"]`);
    for (const m of children) {
      lines.push(`    ${mid(m.id)}["${cleanLabel(m.title)}<br/>in:${fanIn.get(m.id) ?? 0} out:${fanOut.get(m.id) ?? 0}"]`);
    }
    lines.push("  end");
    children.forEach((m) => emitted.add(m.id));
  }
  for (const m of moduleNodes) {
    if (emitted.has(m.id)) continue;
    lines.push(`  ${mid(m.id)}["${cleanLabel(m.title)}<br/>in:${fanIn.get(m.id) ?? 0} out:${fanOut.get(m.id) ?? 0}"]`);
  }
  const cycleEdgeLines: number[] = [];
  const backEdges = cycleBackEdgeKeys(cycles, edges);
  edges.forEach((e, i) => {
    lines.push(`  ${mid(e.from)} -->|"imports ×${e.count}"| ${mid(e.to)}`);
    if (backEdges.has(`${e.from}|${e.to}`)) cycleEdgeLines.push(i);
  });
  lines.push("  classDef cycle fill:#2a1a1f,stroke:#f7768e,stroke-width:1.5px,stroke-dasharray: 4 3;");
  const cycleMembers = [...cycleKey.keys()].sort().map(mid);
  if (cycleMembers.length) lines.push(`  class ${cycleMembers.join(",")} cycle;`);
  if (cycleEdgeLines.length) {
    lines.push(`  linkStyle ${cycleEdgeLines.join(",")} stroke:#f7768e,stroke-width:1.5px,stroke-dasharray: 4 3;`);
  }

  const nodeTable = [
    "### Nodes",
    "| id | name | path / notes | fan-in | fan-out |",
    "| --- | --- | --- | --- | --- |",
    ...[...diagramNodes]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((n) =>
        n.kind === "layer"
          ? `| ${escapeCell(n.id)} | ${escapeCell(n.title)} | architectural layer | — | — |`
          : `| ${escapeCell(n.id)} | ${escapeCell(n.title)} | module folder | ${fanIn.get(n.id) ?? 0} | ${fanOut.get(n.id) ?? 0} |`,
      ),
  ].join("\n");

  const cycleText =
    cycles.length === 0
      ? "No module-level import cycles detected."
      : [
          ...cycles.map((c) => `- ⚠ cycle: ${[...c, c[0]].join(" → ")}`),
          "",
          `Cycle members by layer: ${layerNodes
            .map((l) => ({
              title: l.title,
              count: moduleNodes.filter((m) => m.parent === l.id && cycleKey.has(m.id)).length,
            }))
            .filter((x) => x.count > 0)
            .map((x) => `${x.title} ${x.count}`)
            .join(" · ")}. Dashed red edges are the cycle-closing edges; ⚠ n marks n cycle members inside a layer subgraph.`,
        ].join("\n");

  return {
    title: "Low-level architecture",
    type: "architecture",
    body: `Module dependency diagram for the SuperSkill implementation: **${moduleNodes.length} modules** in **${layerNodes.length} layers**. Arrows point dependent → dependency.

**Legend.** \`A -->|imports ×N| B\` means **A imports B** (dependent → dependency); N is the aggregated file-level import count. \`in:N out:M\` = fan-in (modules importing this one) / fan-out (modules this one imports). Layer subgraphs group the same architectural layers as the container view. Dashed red node = module in a flagged import cycle; dashed red edge = a cycle-closing edge inside one (full cycles are spelled out under **Cycles**). \`nX\` ids are mapped in the Ids twin.

**Cycles.** ${cycleText}

\`\`\`mermaid
${lines.join("\n")}
\`\`\`

${textTwin(ids, nodeTable, edges)}
`,
  };
}

const FLOW_PHASES = ["explore", "implement", "review", "ship"] as const;

function withCommas(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const FLOW_TASK = "task text";
const FLOW_AUDIT = "audit verdict";
const FLOW_SOURCE = "source files";
const FLOW_BRIEF = `brief + rules ≤ ${withCommas(getPhaseBudget("implement").totalBudget)} tokens (implement cap)`;

interface FlowElement {
  id: string;
  kind: "external" | "process" | "store";
  label: string;
  name: string;
  notes: string;
}

const FLOW_EXTERNALS: FlowElement[] = [
  {
    id: "EXT:agent",
    kind: "external",
    label: "Coding agent (LLM)",
    name: "Coding agent (LLM)",
    notes: "[External entity] — supplies task text; consumes brief + rules and skill content",
  },
  {
    id: "EXT:git",
    kind: "external",
    label: "Git repo",
    name: "Git repo (code under analysis)",
    notes: "[External entity] — supplies source files for import scans",
  },
  {
    id: "EXT:human",
    kind: "external",
    label: "Human operator",
    name: "Human operator",
    notes: "[External entity] — supplies task text and note markdown; reads brief + rules",
  },
  {
    id: "EXT:skills.sh",
    kind: "external",
    label: "skills.sh",
    name: "skills.sh (audit source)",
    notes: "[External entity] — supplies audit verdicts (gen / socket / snyk)",
  },
];

const FLOW0_NODES: FlowElement[] = [
  ...FLOW_EXTERNALS,
  {
    id: "P0",
    kind: "process",
    label: "0 SuperSkill",
    name: "0 SuperSkill",
    notes: "[Process 0] — the system as a whole at context level",
  },
];

const FLOW0_EDGES: DiagramEdge[] = [
  { from: "EXT:agent", to: "P0", label: FLOW_TASK, count: 1 },
  { from: "EXT:human", to: "P0", label: FLOW_TASK, count: 1 },
  { from: "P0", to: "EXT:agent", label: FLOW_BRIEF, count: 1 },
  { from: "P0", to: "EXT:human", label: FLOW_BRIEF, count: 1 },
  { from: "EXT:skills.sh", to: "P0", label: FLOW_AUDIT, count: 1 },
  { from: "EXT:git", to: "P0", label: FLOW_SOURCE, count: 1 },
];

const FLOW1_NODES: FlowElement[] = [
  ...FLOW_EXTERNALS,
  {
    id: "P1",
    kind: "process",
    label: "1 Route task",
    name: "1 Route task",
    notes: "[Process 1] — match the task against the routing graph and FTS index (matchTask caps at 3)",
  },
  {
    id: "P2",
    kind: "process",
    label: "2 Load brief",
    name: "2 Load brief",
    notes: "[Process 2] — load INDEX → NEIGHBORHOOD → CONTENT into a budgeted brief",
  },
  {
    id: "P3",
    kind: "process",
    label: "3 Write memory",
    name: "3 Write memory",
    notes: "[Process 3] — write and rebuild memory: notes, index rows, activation weights",
  },
  {
    id: "P4",
    kind: "process",
    label: "4 Install & audit skills",
    name: "4 Install & audit skills",
    notes: "[Process 4] — install skills.sh content and record audit verdicts",
  },
  {
    id: "D1",
    kind: "store",
    label: "D1 vault markdown",
    name: "D1 vault markdown",
    notes: "[Data store] — project notes; source of truth",
  },
  {
    id: "D2",
    kind: "store",
    label: "D2 FTS5 + edges index",
    name: "D2 FTS5 + edges index",
    notes: "[Data store] — derived SQLite index, rebuilt from D1",
  },
  {
    id: "D3",
    kind: "store",
    label: "D3 .superskill/graph.json",
    name: "D3 .superskill/graph.json",
    notes: "[Data store] — routing graph; target 200–500 tokens",
  },
];

const FLOW1_EDGES: DiagramEdge[] = [
  { from: "EXT:agent", to: "P1", label: FLOW_TASK, count: 1 },
  { from: "EXT:human", to: "P1", label: FLOW_TASK, count: 1 },
  { from: "D2", to: "P1", label: "search hits", count: 1 },
  { from: "D3", to: "P1", label: "ranked skill ids (top 3)", count: 1 },
  { from: "P1", to: "P2", label: "matched skills", count: 1 },
  { from: "P4", to: "P2", label: "skill content (audited SKILL.md)", count: 1 },
  { from: "P2", to: "EXT:agent", label: FLOW_BRIEF, count: 1 },
  { from: "P2", to: "EXT:human", label: FLOW_BRIEF, count: 1 },
  { from: "EXT:agent", to: "P3", label: "activation + outcome", count: 1 },
  { from: "EXT:human", to: "P3", label: "note markdown", count: 1 },
  { from: "EXT:git", to: "P3", label: FLOW_SOURCE, count: 1 },
  { from: "P3", to: "D1", label: "note markdown (path, type, title, body)", count: 1 },
  { from: "D1", to: "P3", label: "note markdown + related links", count: 1 },
  { from: "P3", to: "D2", label: "FTS5 rows + edges", count: 1 },
  { from: "P3", to: "D3", label: "activation weights", count: 1 },
  { from: "EXT:skills.sh", to: "P4", label: `${FLOW_AUDIT} (gen / socket / snyk)`, count: 1 },
  { from: "P4", to: "D3", label: "audited skill entries", count: 1 },
];

function flowNodeLine(mermaidId: string, kind: FlowElement["kind"], label: string): string {
  if (kind === "process") return `  ${mermaidId}(("${cleanLabel(label)}"))`;
  if (kind === "store") return `  ${mermaidId}@{ shape: datastore, label: "${cleanLabel(label)}" }`;
  return `  ${mermaidId}["${cleanLabel(label)}"]`;
}

function renderFlowBlock(opts: {
  title: string;
  descr: string;
  nodes: FlowElement[];
  edges: DiagramEdge[];
}): string {
  const ids = sequentialIds(opts.nodes.map((n) => n.id));
  const lines = [MERMAID_INIT, "flowchart LR", `  accTitle: ${opts.title}`, `  accDescr: ${opts.descr}`];
  for (const n of [...opts.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
    lines.push(flowNodeLine(ids.get(n.id)!, n.kind, n.label));
  }
  for (const e of sortEdges(opts.edges)) {
    lines.push(`  ${ids.get(e.from)} -->|"${cleanLabel(e.label)}"| ${ids.get(e.to)}`);
  }
  const nodeTable = [
    "### Nodes",
    "| id | name | path / notes |",
    "| --- | --- | --- |",
    ...[...opts.nodes]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((n) => `| ${escapeCell(n.id)} | ${escapeCell(n.name)} | ${escapeCell(n.notes)} |`),
  ].join("\n");
  return "```mermaid\n" + lines.join("\n") + "\n```\n\n" + textTwin(ids, nodeTable, opts.edges);
}

function buildFlowDoc(): VizDoc {
  const implement = withCommas(getPhaseBudget("implement").totalBudget);
  const phaseLine = FLOW_PHASES.map((p) => `\`${p}\` ${withCommas(getPhaseBudget(p).totalBudget)}`).join(" · ");
  return {
    title: "Dataflow",
    type: "architecture",
    body: `Two-level data flow diagram (Yourdon–DeMarco symbols rendered with Mermaid). Level 0 is the context: one process, four external entities, no stores. Level 1 decomposes it into four verb-named processes over three data stores. Flow labels name the data that moves; there are no decisions, no loops, and no control flow.

## Level 0 — context

${renderFlowBlock({
  title: "Level 0 data flow diagram for SuperSkill",
  descr:
    "Context view. One process (SuperSkill) exchanges task text and brief plus rules with the coding agent and human operator, audit verdicts with skills.sh, and source files with the git repo. No data stores at this level.",
  nodes: FLOW0_NODES,
  edges: FLOW0_EDGES,
})}

## Level 1 — decomposition

${renderFlowBlock({
  title: "Level 1 data flow diagram for SuperSkill",
  descr:
    "Four processes: route task, load brief, write memory, install and audit skills. Flows carry task text, matched skills, brief plus rules within the token budget, note markdown, activation and outcome, audit verdict, and skill content.",
  nodes: FLOW1_NODES,
  edges: FLOW1_EDGES,
})}

## Token budgets

**Legend.** Rectangle = external entity; circle = process (0 at context level, 1–4 at level 1); datastore = data store (D#, the two parallel lines of Yourdon–DeMarco, rendered with Mermaid's \`datastore\` shape); arrow = data flow, label = the data that moves; \`nX\` ids are mapped in each block's Ids twin. Every process has at least one input and one output; every store has at least one input and one output; there are no entity-to-entity or store-to-store flows.

- \`getPhaseBudget()\` in \`src/lib/context-budget.ts\` clamps phase budgets to 2,000–50,000 tokens at 10 / 15 / 8 / 5% of the context window (default 128,000): ${phaseLine} tokens. The \`${FLOW_BRIEF}\` flow above uses the implement cap (${implement} tokens).
- Loader phases (design spec \`docs/superpowers/specs/2026-04-23-knowledge-graph-design.md\`, implemented in \`src/lib/graph/loader.ts\`): INDEX ≈ 50 tokens (always) → NEIGHBORHOOD ≈ 150 (on match) → CONTENT 500–2,000 per skill; session insights ≈ 100. Mature-project overhead ≈ 800–2,300 tokens (< 2% of a 128K window).
- \`matchTask()\` in \`src/lib/graph/router.ts\` caps matched skills at 3 (\`slice(0, 3)\`); the system brief keeps the last 3 sessions and 5 co-activations (\`src/lib/graph/loader.ts\`).
- \`D3 .superskill/graph.json\` target: 200–500 tokens (design spec).
`,
  };
}

interface RuleEntry {
  id: string;
  lang: string;
  prefix: string;
  title: string;
  severity: string;
  enforce: string;
  triggers: string[];
  related: string[];
  path: string;
  bytes: number;
  body: string;
  bodyBytes: number;
}

let ruleCache: RuleEntry[] | null = null;

function ruleTriggers(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const holder = value as Record<string, unknown>;
  const out: string[] = [];
  for (const key of ["keywords", "files", "symbols"]) {
    const list = holder[key];
    if (!Array.isArray(list)) continue;
    for (const v of list) if (typeof v === "string" && v.trim()) out.push(v.trim());
  }
  return [...new Set(out)];
}

function scanRules(): RuleEntry[] {
  if (ruleCache) return ruleCache;
  const entries: RuleEntry[] = [];
  const root = join(catalogRoot(), "rules");
  let langs: string[] = [];
  try {
    langs = readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch (err) {
    console.error(`[viz-model] rules catalog unavailable: ${(err as NodeJS.ErrnoException).code ?? String(err)}`);
    ruleCache = entries;
    return entries;
  }
  for (const lang of langs) {
    let files: string[] = [];
    try {
      files = readdirSync(join(root, lang))
        .filter((f) => f.endsWith(".md"))
        .sort();
    } catch (err) {
      console.error(`[viz-model] rules dir ${lang} unavailable: ${(err as NodeJS.ErrnoException).code ?? String(err)}`);
      continue;
    }
    for (const file of files) {
      const raw = readFileSync(join(root, lang, file), "utf-8");
      const { data, content } = parseFrontmatter(raw);
      const id = typeof data.id === "string" ? data.id.trim() : "";
      if (!id) continue;
      const body = content.trim();
      entries.push({
        id,
        lang,
        prefix: typeof data.prefix === "string" && data.prefix.trim() ? data.prefix.trim() : "misc",
        title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : id,
        severity: typeof data.severity === "string" ? data.severity : "",
        enforce: typeof data.enforce === "string" ? data.enforce : "",
        triggers: ruleTriggers(data.triggers),
        related: Array.isArray(data.related)
          ? data.related.filter((r): r is string => typeof r === "string")
          : [],
        path: `catalog/rules/${lang}/${file}`,
        bytes: Buffer.byteLength(raw, "utf-8"),
        body,
        bodyBytes: Buffer.byteLength(body, "utf-8"),
      });
    }
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  ruleCache = entries;
  return entries;
}

function compressRuleBody(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, (match) => {
      const lines = match.split("\n");
      if (lines.length <= 5) return match;
      return `${lines[0]}\n${lines.slice(1, 4).join("\n")}\n// ... (${lines.length - 4} lines truncated)\n${lines[lines.length - 1]}`;
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function capRuleBody(entry: RuleEntry): { excerpt: string; truncated: boolean; hard: boolean } {
  const compressed = compressRuleBody(entry.body);
  if (compressed.length <= RULE_BODY_MAX_CHARS) {
    return { excerpt: compressed, truncated: compressed !== entry.body, hard: false };
  }
  return { excerpt: compressed.slice(0, RULE_BODY_MAX_CHARS), truncated: true, hard: true };
}

function buildRulesLayer(): { graphs: Record<string, VizGraph>; docs: Record<string, VizDoc>; langs: Map<string, number> } {
  const entries = scanRules();
  const graphs: Record<string, VizGraph> = {};
  const docs: Record<string, VizDoc> = {};
  const ids = new Set(entries.map((e) => e.id));
  const resolved = new Map<string, string[]>();
  for (const e of entries) resolved.set(e.id, resolveRuleRelated(e.related, ids).known);
  const byId = new Map(entries.map((e) => [e.id, e]));

  const langs = [...new Set(entries.map((e) => e.lang))].sort();
  const langCounts = new Map<string, number>();
  for (const e of entries) langCounts.set(e.lang, (langCounts.get(e.lang) ?? 0) + 1);

  const ruleDoc = (e: RuleEntry): VizDoc => {
    const { excerpt, truncated, hard } = capRuleBody(e);
    const related = resolved.get(e.id) ?? [];
    const triggerText = e.triggers.length
      ? `${e.triggers.slice(0, 12).join(", ")}${e.triggers.length > 12 ? ` (+${e.triggers.length - 12} more)` : ""}`
      : "none";
    const note = truncated
      ? `\n\n_(excerpt: code samples shortened${hard ? `, first ${RULE_BODY_MAX_CHARS} chars` : ""} — open \`${e.path}\` for the full rule)_`
      : "";
    return {
      title: e.title,
      type: "rule",
      related: related.map((r) => `rule:${r}`),
      body: `**${e.title}**

- id: \`${e.id}\`
- severity: ${e.severity || "—"} · enforce: ${e.enforce || "—"}
- lang / prefix: ${e.lang} / ${e.prefix}
- path: \`${e.path}\` · ${e.bytes} bytes
- triggers: ${triggerText}

---

${excerpt}${note}
`,
    };
  };

  const langEdgeCounts = new Map<string, number>();
  for (const e of entries) {
    for (const t of resolved.get(e.id) ?? []) {
      const other = byId.get(t);
      if (!other || other.lang === e.lang) continue;
      const key = `${e.lang}|${other.lang}`;
      langEdgeCounts.set(key, (langEdgeCounts.get(key) ?? 0) + 1);
    }
  }
  const rootNodes: VizNode[] = langs.map((lang) => ({
    id: `rules:${lang}`,
    title: `${lang} · ${langCounts.get(lang) ?? 0} rules`,
    type: "rules",
    open: { kind: "graph", id: `rules:${lang}` },
  }));
  const rootEdges: VizEdge[] = [...langEdgeCounts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, count]) => {
      const [from, to] = key.split("|");
      return { from: `rules:${from}`, to: `rules:${to}`, type: "related", label: `${count} links` };
    });
  graphs.rules = {
    title: "Rules library",
    subtitle: `${langs.length} languages · ${entries.length} rules. Descend language → prefix → rule; click a rule to read it.`,
    nodes: rootNodes,
    edges: rootEdges,
  };
  docs["view:rules"] = {
    title: "Rules library",
    type: "rules",
    body: `**How to read this.** The library is nested: \`Rules\` → language → prefix → rule. Click a language to see its prefixes, a prefix to see its rules, and a rule to read it.

**Traversal path.** task → pack → language → prefix → rule. The retrieval view's *Rules engine* node opens this library, and a \`code/<language>\` catalog playbook links to its language group (for example \`rules:rust\`).

**For agents.** Use \`graph resolve / children / open\` for the same paths without loading content: resolve a task or pack to a language, list a group's children, then open one rule. The panel carries id, severity/enforce, lang/prefix, triggers, path, bytes, related rules, and a bounded body excerpt (${RULE_BODY_MAX_CHARS} chars, code samples shortened).

**Policies.** Related targets outside the library are skipped; files without an \`id\` (INDEX/categories/sources) are omitted. Bodies are embedded as excerpts: code samples are shortened and the text is capped at ${RULE_BODY_MAX_CHARS} characters, with a note pointing at the file path for the full rule. This keeps the page bounded (~4 MB for the full library) while every rule stays one click from its source file.`,
  };

  for (const lang of langs) {
    const list = entries.filter((e) => e.lang === lang);
    const prefixes = [...new Set(list.map((e) => e.prefix))].sort();
    const prefixCounts = new Map<string, number>();
    for (const e of list) prefixCounts.set(e.prefix, (prefixCounts.get(e.prefix) ?? 0) + 1);

    const prefixEdgeCounts = new Map<string, number>();
    for (const e of list) {
      for (const t of resolved.get(e.id) ?? []) {
        const other = byId.get(t);
        if (!other || other.lang !== lang || other.prefix === e.prefix) continue;
        const key = `${e.prefix}|${other.prefix}`;
        prefixEdgeCounts.set(key, (prefixEdgeCounts.get(key) ?? 0) + 1);
      }
    }

    const langNodes: VizNode[] = prefixes.map((prefix) => ({
      id: `rules:${lang}/${prefix}`,
      title: `${prefix} · ${prefixCounts.get(prefix) ?? 0}`,
      type: "rules",
      open: { kind: "graph", id: `rules:${lang}/${prefix}` },
    }));
    const langEdges: VizEdge[] = [...prefixEdgeCounts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => {
        const [from, to] = key.split("|");
        return { from: `rules:${lang}/${from}`, to: `rules:${lang}/${to}`, type: "related", label: `${count} links` };
      });
    graphs[`rules:${lang}`] = {
      title: `${lang} rules`,
      subtitle: `${list.length} rules in ${prefixes.length} prefixes. Click a prefix.`,
      nodes: langNodes,
      edges: langEdges,
    };
    docs[`rules:${lang}`] = {
      title: `${lang} rules`,
      type: "rules",
      body: `**${list.length} rules** in **${prefixes.length} prefixes** under \`catalog/rules/${lang}/\`. Click a prefix to see its rules.`,
    };

    for (const prefix of prefixes) {
      const group = list.filter((e) => e.prefix === prefix);
      const seen = new Set<string>();
      const edges: VizEdge[] = [];
      for (const e of group) {
        for (const t of resolved.get(e.id) ?? []) {
          const other = byId.get(t);
          if (!other || other.lang !== lang || other.prefix !== prefix) continue;
          const key = `${e.id}|${other.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          edges.push({ from: `rule:${e.id}`, to: `rule:${other.id}`, type: "related" });
        }
      }
      for (const e of group) docs[`rule:${e.id}`] = ruleDoc(e);
      graphs[`rules:${lang}/${prefix}`] = {
        title: `${lang}/${prefix}`,
        subtitle: `${group.length} rules. Click one to read it.`,
        nodes: group.map((e) => ({
          id: `rule:${e.id}`,
          title: e.title,
          type: "rule",
        })),
        edges,
      };
      docs[`rules:${lang}/${prefix}`] = {
        title: `${lang}/${prefix} rules`,
        type: "rules",
        body: `**${group.length} rules** matching \`catalog/rules/${lang}/${prefix}-*.md\`. Click a rule to read it.`,
      };
    }
  }

  return { graphs, docs, langs: new Map(langs.map((l) => [l, langCounts.get(l) ?? 0])) };
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
  const rules = buildRulesLayer();
  const docs: Record<string, VizDoc> = { ...ARCH_DOCS, ...RETRIEVAL_DOCS, ...rules.docs };
  for (const d of opts.docs) {
    docs[d.id] = { title: d.title || fileTitle(d.id), type: d.type, body: d.body };
  }

  const vault = buildVaultGraph(opts.vault);

  attachStoreInventories(docs, opts.docs, opts.vault.edges);

  const catalog = readCatalogLayer(docs, rules.langs);

  const impl = buildImplementationLayer(opts.code, docs);
  docs["diag:high"] = buildHighLevelDoc(opts.code);
  docs["diag:low"] = buildLowLevelDoc(impl.modules);
  docs["diag:flow"] = buildFlowDoc();

  const graphs: Record<string, VizGraph> = {
    root: buildRetrievalGraph(),
    vault,
    catalog: catalog.graph,
    impl: impl.modules,
    ...rules.graphs,
    ...impl.fileGraphs,
  };

  return { root: "root", graphs, docs, legend: buildLegend(graphs, docs) };
}

function readCatalogLayer(
  docs: Record<string, VizDoc>,
  rulesLangs: ReadonlyMap<string, number>,
): { graph: VizGraph } {
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
        if (p.name === "code") {
          const lang = f.replace(/\.md$/, "");
          if (rulesLangs.has(lang)) {
            const ruleNodeId = `rules:${lang}`;
            if (!nodes.some((n) => n.id === ruleNodeId)) {
              nodes.push({
                id: ruleNodeId,
                title: `${lang} rules · ${rulesLangs.get(lang)}`,
                type: "rules",
                open: { kind: "graph", id: ruleNodeId },
              });
            }
            edges.push({ from: id, to: ruleNodeId, type: "rules" });
          }
        }
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

function buildRetrievalGraph(): VizGraph {
  return {
    title: "SuperSkill",
    subtitle:
      "Retrieval graph — how a task becomes budgeted context. Edges name what moves at each hop.",
    nodes: [
      { id: "ret:task", title: "Agent task", type: "agent" },
      { id: "ret:router", title: "Router", type: "router" },
      { id: "ret:packs", title: "Packs / skills", type: "pack" },
      { id: "ret:rules", title: "Rules engine", type: "rules", open: { kind: "graph", id: "rules" } },
      { id: "ret:loader", title: "Content loader", type: "loader" },
      { id: "ret:context", title: "Agent context", type: "agent" },
      { id: "ret:index", title: "FTS5 + edges", type: "index" },
      { id: "ret:writeback", title: "Session / learn write-back", type: "session" },
      { id: "arch:vault", title: "Vault memory", type: "architecture", open: { kind: "graph", id: "vault" } },
    ],
    edges: [
      { from: "ret:task", to: "ret:router", type: "task text" },
      { from: "ret:router", to: "ret:packs", type: "pack set" },
      { from: "ret:packs", to: "ret:loader", type: "top-k skills" },
      { from: "ret:rules", to: "ret:loader", type: "harness rules" },
      { from: "ret:loader", to: "ret:context", type: "brief + rules \u2264 budget" },
      { from: "ret:index", to: "ret:router", type: "search hits" },
      { from: "arch:vault", to: "ret:index", type: "rebuild" },
      { from: "ret:context", to: "ret:writeback", type: "outcome" },
      { from: "ret:writeback", to: "arch:vault", type: "markdown" },
    ],
  };
}

const RETRIEVAL_DOCS: Record<string, VizDoc> = {
  "ret:task": {
    title: "Agent task",
    type: "agent",
    body: `The task text an agent starts from — plus the project stack and phase the router resolves. It is the only input retrieval needs.`,
  },
  "ret:router": {
    title: "Router",
    type: "router",
    body: `Scores in-repo graph entries by triggers, project stack, and current phase, then mixes in FTS5 search hits. Output is a small **pack set** — never the whole catalog.`,
  },
  "ret:packs": {
    title: "Packs / skills",
    type: "pack",
    body: `Curated in-repo packs. Only the packs the router picked are considered. skills.sh installs are opt-in and audited before they can appear here.`,
  },
  "ret:rules": {
    title: "Rules engine",
    type: "rules",
    body: `Language rules are grafted into the brief. Open the **Rules library** view to descend \`task → pack → language → prefix → rule\`: each rule node carries id, severity/enforce, triggers, path, bytes, related rules, and the rule body. Agents can follow the same path with \`graph resolve / children / open\` without loading the library.`,
  },
  "ret:loader": {
    title: "Content loader",
    type: "loader",
    body: `Loads **INDEX → NEIGHBORHOOD → CONTENT**, each phase optional. CONTENT is the expensive phase, so only top-k skills get their markdown loaded. When the token budget is spent, loading stops.`,
  },
  "ret:context": {
    title: "Agent context",
    type: "context",
    body: `The assembled context: system brief + rules + top-k skill content. This is the only thing the model pays for — a full catalog dump would cost orders of magnitude more.`,
  },
  "ret:index": {
    title: "FTS5 + edges",
    type: "index",
    body: `Derived SQLite index: FTS5 text search plus edges from \`related:\` and wikilinks. Search hits are cheap and rebuilds always come from markdown.`,
  },
  "ret:writeback": {
    title: "Session / learn write-back",
    type: "session",
    body: `When a task ends, the outcome is written back as one markdown note. That closes the loop: memory grows where the next router can find it.`,
  },
};

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
      body: excerpt || `Source file \`${n.id}\`.\n\nThis is implementation, nested under the module graph.`,
    };
  }

  const moduleLayer = new Map<string, string>();
  for (const [mod, files] of byMod) {
    const votes = new Map<string, number>();
    for (const f of files) {
      if (!isHlaSource(f)) continue;
      const layer = HLA_LAYERS.find((l) => l.match(f));
      if (!layer) continue;
      votes.set(layer.id, (votes.get(layer.id) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [id, count] of votes) {
      if (count > bestCount) {
        best = id;
        bestCount = count;
      }
    }
    if (best) moduleLayer.set(mod, best);
  }

  const layerNodes: VizNode[] = HLA_LAYERS.filter((l) => [...moduleLayer.values()].includes(l.id)).map(
    (l) => ({ id: `layer:${l.id}`, title: l.label, type: "layer" }),
  );
  for (const l of layerNodes) {
    docs[l.id] = {
      title: l.title,
      type: "layer",
      body: `Architectural layer, derived from the same mapping as the high-level view. Click the layer to collapse or expand its modules; click a module to open its file graph.`,
    };
  }

  const moduleNodes: VizNode[] = [...byMod.keys()].map((mod) => {
    const layer = moduleLayer.get(mod);
    return {
      id: `mod:${mod}`,
      title: moduleTitle(mod),
      type: "module",
      open: { kind: "graph", id: `mod:${mod}` },
      ...(layer ? { parent: `layer:${layer}` } : {}),
    };
  });

  const moduleEdgeCounts = new Map<string, number>();
  for (const e of code.edges) {
    const a = moduleId(e.from);
    const b = moduleId(e.to);
    if (a === b) continue;
    const k = `mod:${a}|mod:${b}`;
    moduleEdgeCounts.set(k, (moduleEdgeCounts.get(k) ?? 0) + 1);
  }
  const moduleEdges: VizEdge[] = [...moduleEdgeCounts.entries()].map(([k, count]) => {
    const [from, to] = k.split("|");
    return { from, to, type: "imports", label: `${count} import${count === 1 ? "" : "s"}` };
  });

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
      subtitle: "Layers hold modules. Click a layer to collapse it; click a module to see its files.",
      nodes: [...layerNodes, ...moduleNodes],
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
