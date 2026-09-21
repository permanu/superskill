// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureProjectIndex } from "./knowledge-index.js";
import { scanImportGraph } from "./code-graph.js";
import { attachCodeBodies, buildVizModel, mermaidFlowchart, type VizModel } from "./viz-model.js";

export function renderKnowledgeGraphHtml(model: VizModel): string {
  const data = JSON.stringify(model).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(model.graphs.root.title)}</title>
  <script src="https://unpkg.com/vis-network@9.1.9/standalone/umd/vis-network.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    html, body { margin: 0; height: 100%; background: #0f1115; color: #e6e8ee; font-family: ui-sans-serif, system-ui, sans-serif; }
    #shell { display: flex; flex-direction: column; height: 100%; }
    #nav { display: flex; gap: 6px; flex-wrap: wrap; padding: 10px 12px; background: #12151c; border-bottom: 1px solid #2a2f3a; z-index: 5; }
    #nav button { background: #2a2f3a; color: #e6e8ee; border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; font-size: 13px; }
    #nav button[aria-current="page"] { background: #8ab4f8; color: #0f1115; font-weight: 600; }
    #nav .hint { margin-left: auto; align-self: center; }
    #app { display: flex; flex: 1; min-height: 0; }
    #left { flex: 1; position: relative; min-width: 0; }
    #graph { position: absolute; inset: 0; }
    #bar { position: absolute; z-index: 2; left: 12px; top: 12px; right: 12px; display: flex; gap: 8px; align-items: center; }
    #bar button { background: #2a2f3a; color: #e6e8ee; border: 0; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
    #bar .t { font-size: 14px; }
    #bar .s { font-size: 12px; color: #9aa3b2; }
    #palette { position: absolute; z-index: 2; left: 12px; top: 56px; right: 12px; display: flex; flex-wrap: wrap; gap: 6px; max-height: 22%; overflow: auto; }
    #palette button { background: #2a2f3a; color: #e6e8ee; border: 0; border-radius: 8px; padding: 6px 10px; cursor: pointer; font-size: 12px; }
    #panel { width: 420px; max-width: 45%; overflow: auto; padding: 20px 22px 40px; background: #161a22; border-left: 1px solid #2a2f3a; }
    #panel h1, #panel h2, #panel h3 { font-size: 1.1rem; }
    #panel pre { background: #0f1115; padding: 10px; overflow: auto; font-size: 12px; }
    #panel code { font-size: 12px; }
    .hint { color: #9aa3b2; font-size: 13px; }
    #diagram-slot { padding: 72px 20px 24px; overflow: auto; height: 100%; box-sizing: border-box; }
    #diagram-slot svg { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div id="shell">
  <nav id="nav">
    <button type="button" data-qa="nav" data-view="graph">Graph</button>
    <button type="button" data-qa="nav" data-view="hla">HLA</button>
    <button type="button" data-qa="nav" data-view="lla">LLA</button>
    <button type="button" data-qa="nav" data-view="erd">ERD</button>
    <button type="button" data-qa="nav" data-view="modules">Modules</button>
    <span class="hint">g / h / l / e / m · Esc = Graph</span>
  </nav>
  <div id="app">
    <div id="left">
      <div id="bar">
        <button id="back" type="button">Back</button>
        <div><div class="t" id="title"></div><div class="s" id="sub"></div></div>
      </div>
      <div id="palette"></div>
      <div id="graph"></div>
    </div>
    <div id="panel"><p class="hint">Use the top tabs. Graph = interactive. HLA / LLA / ERD = drawn diagrams.</p></div>
  </div>
  </div>
  <script>
    const model = ${data};
    const colors = {
      architecture: "#8ab4f8", pack: "#c58af9", playbook: "#81c995",
      adr: "#fdd663", learning: "#81c995", context: "#f28b82",
      note: "#9aa0a6", module: "#ff8a65", code: "#ffab91"
    };
    const stack = ["root"];
    let network;
    const FENCE = String.fromCharCode(96,96,96);
    if (typeof mermaid !== "undefined") {
      mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
    }
    function extractMermaid(src) {
      const tag = FENCE + "mermaid";
      const i = src.indexOf(tag);
      if (i < 0) return null;
      const nl = src.indexOf("\\n", i);
      const end = src.indexOf(FENCE, nl + 1);
      if (nl < 0 || end < 0) return null;
      return src.slice(nl + 1, end).trim();
    }
    function esc(s) {
      return String(s).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
    }
    function md(src) {
      let t = esc(src);
      t = t.replace(/^### (.*)$/gm, "<h3>$1</h3>");
      t = t.replace(/^## (.*)$/gm, "<h2>$1</h2>");
      t = t.replace(/^# (.*)$/gm, "<h1>$1</h1>");
      t = t.replace(/\\*\\*(.+?)\\*\\*/g, "<strong>$1</strong>");
      t = t.replace(/\\n\\n/g, "</p><p>");
      return "<p>" + t + "</p>";
    }
    function openNode(g, id) {
      const node = g.nodes.find(n => n.id === id);
      if (!node || !node.open) { showDoc(id); return; }
      if (node.open.kind === "graph") showGraph(node.open.id);
      else showDoc(node.open.id);
    }
    function renderPalette(g) {
      const el = document.getElementById("palette");
      el.innerHTML = g.nodes.map(n =>
        "<button type='button' data-qa='node' data-id='" + esc(n.id) + "'>" + esc(n.title) + "</button>"
      ).join("");
      el.querySelectorAll("button").forEach(btn => {
        btn.onclick = function () { openNode(g, btn.getAttribute("data-id")); };
      });
    }
    async function showMermaid(code) {
      if (network) { network.destroy(); network = null; }
      const host = document.getElementById("graph");
      host.innerHTML = "<div id='diagram-slot'></div>";
      const slot = document.getElementById("diagram-slot");
      if (typeof mermaid === "undefined") {
        slot.textContent = code;
        return;
      }
      try {
        const { svg } = await mermaid.render("m" + Date.now(), code);
        slot.innerHTML = svg;
      } catch (err) {
        slot.textContent = String(err);
      }
    }
    function stripMermaid(src) {
      const mer = extractMermaid(src);
      if (!mer) return src;
      const tag = FENCE + "mermaid";
      const i = src.indexOf(tag);
      const nl = src.indexOf("\\n", i);
      const end = src.indexOf(FENCE, nl + 1);
      if (i < 0 || end < 0) return src;
      return (src.slice(0, i) + src.slice(end + 3)).trim();
    }
    function snippet(src) {
      return (src || "").replace(/\s+/g, " ").trim().slice(0, 180);
    }
    function showDoc(id) {
      const d = model.docs[id];
      const panel = document.getElementById("panel");
      if (!d) { panel.innerHTML = "<p class='hint'>Nothing stored for this node.</p>"; return; }
      const mer = extractMermaid(d.body);
      if (mer) showMermaid(mer);
      const text = stripMermaid(d.body);
      panel.innerHTML = "<p class='hint'>" + esc(d.type) + "</p><h2>" + esc(d.title) + "</h2>" + md(text || "(empty)");
    }
    function showGraph(id) {
      const g = model.graphs[id];
      if (!g) return;
      stack.push(id);
      draw(g);
      const items = g.nodes.map(function (n) {
        const d = model.docs[n.id];
        const snip = d ? snippet(stripMermaid(d.body)) : "";
        return "<div class='card' data-open='" + esc(n.id) + "'><strong>" + esc(n.title) + "</strong> <span class='hint'>" + esc(n.type) + "</span><br>" + esc(snip || "No text stored.") + "</div>";
      }).join("");
      const panel = document.getElementById("panel");
      panel.innerHTML = "<p class='hint'>" + esc(g.subtitle) + "</p>" + (items || "<p>Nothing stored here yet.</p>");
      panel.querySelectorAll(".card").forEach(function (el) {
        el.style.cursor = "pointer";
        el.style.margin = "0 0 12px";
        el.style.padding = "8px 0";
        el.style.borderBottom = "1px solid #2a2f3a";
        el.onclick = function () { openNode(g, el.getAttribute("data-open")); };
      });
    }
    function draw(g) {
      document.getElementById("graph").innerHTML = "";
      document.getElementById("title").textContent = g.title;
      document.getElementById("sub").textContent = g.subtitle;
      const nodes = new vis.DataSet(g.nodes.map(n => ({
        id: n.id, label: n.title, title: n.title,
        color: colors[n.type] || colors.note, shape: n.open && n.open.kind === "graph" ? "box" : "dot"
      })));
      const edges = new vis.DataSet(g.edges.map((e, i) => ({
        id: "e"+i, from: e.from, to: e.to, arrows: "to", label: e.type, font: { size: 10, color: "#9aa3b2" }
      })));
      renderPalette(g);
      if (network) network.destroy();
      if (typeof vis !== "undefined") {
        network = new vis.Network(document.getElementById("graph"), { nodes, edges }, {
          physics: { barnesHut: { gravitationalConstant: -4000, springLength: 140 } },
          nodes: { font: { color: "#e6e8ee", size: 14 }, size: 18, margin: 10 },
          edges: { color: { color: "#5f6368" }, length: 160 }
        });
        network.on("click", function (params) {
          if (!params.nodes.length) return;
          openNode(g, params.nodes[0]);
        });
      }
    }
    function setNav(view) {
      document.querySelectorAll("#nav [data-view]").forEach(function (b) {
        if (b.getAttribute("data-view") === view) b.setAttribute("aria-current", "page");
        else b.removeAttribute("aria-current");
      });
    }
    function go(view, pushHash) {
      if (pushHash !== false && location.hash.replace("#","") !== view) {
        location.hash = view;
        return;
      }
      setNav(view);
      document.getElementById("palette").style.display = view === "graph" ? "" : "none";
      document.getElementById("bar").style.display = view === "graph" ? "" : "none";
      if (view === "hla") {
        document.getElementById("title").textContent = "High-level architecture";
        document.getElementById("sub").textContent = "Orchestrator and specialists";
        showDoc("diag:high");
        return;
      }
      if (view === "lla") {
        document.getElementById("title").textContent = "Low-level architecture";
        document.getElementById("sub").textContent = "Module dependencies";
        showDoc("diag:low");
        return;
      }
      if (view === "erd") {
        document.getElementById("title").textContent = "Data model (ERD)";
        document.getElementById("sub").textContent = "Notes, edges, skill graph";
        showDoc("diag:erd");
        return;
      }
      if (view === "modules") {
        stack.splice(0, stack.length, "root");
        document.getElementById("palette").style.display = "";
        document.getElementById("bar").style.display = "";
        showGraph("impl");
        return;
      }
      stack.splice(0, stack.length, "root");
      draw(model.graphs.root);
      document.getElementById("panel").innerHTML = "<p class='hint'>Graph: click a node or a chip. Tabs above jump to HLA / LLA / ERD.</p>";
    }
    document.getElementById("back").onclick = function () {
      if (stack.length > 1) stack.pop();
      const id = stack[stack.length - 1];
      if (id === "root") { go("graph", false); return; }
      const g = model.graphs[id];
      draw(g);
      document.getElementById("panel").innerHTML = "<p class='hint'>" + esc(g.subtitle) + "</p>";
    };
    document.querySelectorAll("#nav [data-view]").forEach(function (b) {
      b.onclick = function () { go(b.getAttribute("data-view")); };
    });
    window.onhashchange = function () {
      const v = location.hash.replace("#","") || "graph";
      go(v, false);
    };
    document.onkeydown = function (ev) {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const k = ev.key.toLowerCase();
      if (k === "g" || k === "escape") go("graph");
      if (k === "h") go("hla");
      if (k === "l") go("lla");
      if (k === "e") go("erd");
      if (k === "m") go("modules");
    };
    go((location.hash || "#graph").replace("#",""), false);
  </script>
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

const CANVAS_COLOR: Record<string, string> = {
  adr: "5",
  learning: "4",
  task: "3",
  session: "6",
  context: "1",
  note: "2",
  code: "1",
};

type GraphDump = {
  nodes: Array<{ id: string; title: string; type: string }>;
  edges: Array<{ from: string; to: string; type: string }>;
};

function mermaidFromDoc(body: string): string {
  const m = body.match(/```mermaid\s*([\s\S]*?)```/);
  return m ? m[1].trim() : "";
}

export function renderArchitectureDiagramsHtml(model: VizModel): string {
  const blocks = [
    ["High-level architecture", mermaidFromDoc(model.docs["diag:high"]?.body ?? "")],
    ["Low-level architecture", mermaidFromDoc(model.docs["diag:low"]?.body ?? mermaidFlowchart(model.graphs.impl ?? { nodes: [], edges: [], title: "", subtitle: "" }))],
    ["Data model (ERD)", mermaidFromDoc(model.docs["diag:erd"]?.body ?? "")],
  ] as const;
  const sections = blocks
    .map(
      ([title, code]) =>
        `<section><h1>${escapeHtml(title)}</h1><pre class="mermaid">${escapeHtml(code)}</pre></section>`,
    )
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Architecture diagrams</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    body { margin: 0; background: #0f1115; color: #e6e8ee; font-family: ui-sans-serif, system-ui, sans-serif; }
    section { padding: 28px 32px 8px; border-bottom: 1px solid #2a2f3a; }
    h1 { font-size: 20px; font-weight: 600; }
    .mermaid { background: transparent; }
    svg { max-width: 100%; height: auto; }
  </style>
</head>
<body>
${sections}
<script>mermaid.initialize({ startOnLoad: true, theme: "dark", securityLevel: "loose" });</script>
</body>
</html>`;
}

export function renderObsidianCanvas(
  dump: GraphDump,
  architecture: Array<{ file: string; color: string }>,
): string {
  const archNodes = architecture.map((a, i) => ({
    id: a.file,
    type: "file" as const,
    file: a.file,
    x: -520 + i * 520,
    y: -420,
    width: 480,
    height: 360,
    color: a.color,
  }));
  const n = Math.max(dump.nodes.length, 1);
  const radius = 80 + n * 28;
  const noteNodes = dump.nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      id: node.id,
      type: "file" as const,
      file: node.id,
      x: Math.round(Math.cos(angle) * radius),
      y: 280 + Math.round(Math.sin(angle) * radius),
      width: 280,
      height: 80,
      color: CANVAS_COLOR[node.type] ?? CANVAS_COLOR.note,
    };
  });
  const nodes = [...archNodes, ...noteNodes];
  const known = new Set(nodes.map((node) => node.id));
  const edges: Array<{ id: string; fromNode: string; fromSide: string; toNode: string; toSide: string; label?: string }> = [];
  for (let i = 0; i < architecture.length - 1; i++) {
    const from = architecture[i].file;
    const to = architecture[i + 1].file;
    if (known.has(from) && known.has(to)) {
      edges.push({
        id: `arch-${i}`,
        fromNode: from,
        fromSide: "right",
        toNode: to,
        toSide: "left",
        label: i === 0 ? "refines" : "stores",
      });
    }
  }
  dump.edges
    .filter((e) => known.has(e.from) && known.has(e.to))
    .forEach((e, i) => {
      edges.push({
        id: `e${i}`,
        fromNode: e.from,
        fromSide: "right",
        toNode: e.to,
        toSide: "left",
        label: e.type === "related" ? undefined : e.type,
      });
    });
  return JSON.stringify({ nodes, edges }, null, 2);
}

export function writeKnowledgeGraphHtml(vaultRoot: string, slug: string): string {
  return writeKnowledgeGraphFiles(vaultRoot, slug).html;
}

export function writeKnowledgeGraphFiles(
  vaultRoot: string,
  slug: string,
  opts?: { codeRoot?: string },
): { html: string; canvas: string; diagrams: string; nodes: number; edges: number } {
  const idx = ensureProjectIndex(vaultRoot, slug);
  const vaultDump = idx.graphDump();
  const codeDump = opts?.codeRoot ? scanImportGraph(opts.codeRoot) : { nodes: [], edges: [] };
  const model = buildVizModel({
    slug,
    vault: vaultDump,
    docs: idx.noteDocs(),
    code: codeDump,
  });
  if (opts?.codeRoot) {
    attachCodeBodies(model, opts.codeRoot, (abs) => readFileSync(abs, "utf-8"));
  }
  const dir = join(vaultRoot, "projects", slug);
  mkdirSync(dir, { recursive: true });
  const htmlRel = `projects/${slug}/knowledge-graph.html`;
  const canvasRel = `projects/${slug}/knowledge-graph.canvas`;
  const archDir = join(dir, "architecture");
  mkdirSync(archDir, { recursive: true });
  const llaBody = model.docs["diag:low"]?.body ?? `# Low-level architecture\n`;
  const highRel = `projects/${slug}/architecture/high-level-architecture.md`;
  const lowRel = `projects/${slug}/architecture/low-level-architecture.md`;
  const erdRel = `projects/${slug}/architecture/data-model-erd.md`;
  writeFileSync(
    join(archDir, "high-level-architecture.md"),
    `---\ntype: architecture\n---\n\n# ${model.docs["diag:high"]?.title ?? "High-level architecture"}\n\n${model.docs["diag:high"]?.body ?? ""}\n`,
    "utf-8",
  );
  writeFileSync(join(archDir, "low-level-architecture.md"), `---\ntype: architecture\n---\n\n${llaBody}\n`, "utf-8");
  writeFileSync(
    join(archDir, "data-model-erd.md"),
    `---\ntype: architecture\n---\n\n# ${model.docs["diag:erd"]?.title ?? "Data model (ERD)"}\n\n${model.docs["diag:erd"]?.body ?? ""}\n`,
    "utf-8",
  );
  const diagramsRel = `projects/${slug}/architecture-diagrams.html`;
  writeFileSync(join(dir, "knowledge-graph.html"), renderKnowledgeGraphHtml(model), "utf-8");
  writeFileSync(join(dir, "architecture-diagrams.html"), renderArchitectureDiagramsHtml(model), "utf-8");
  writeFileSync(
    join(dir, "knowledge-graph.canvas"),
    renderObsidianCanvas(vaultDump, [
      { file: highRel, color: "5" },
      { file: lowRel, color: "1" },
      { file: erdRel, color: "4" },
    ]),
    "utf-8",
  );
  const root = model.graphs.root;
  return { html: htmlRel, canvas: canvasRel, diagrams: diagramsRel, nodes: root.nodes.length, edges: root.edges.length };
}


