// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { VaultFS, VaultError } from "./vault-fs.js";
import { ensureProjectIndex, upsertVaultFile } from "./knowledge-index.js";
import { scanRepo } from "./codegraph/scan.js";
import { buildProjectVizModel, attachProjectSources } from "./project-viz-model.js";
import { mermaidFlowchart, type VizModel } from "./viz-model.js";

export const GENERATED_MARKER = "<!-- superskill:generated -->";

const CDN = {
  fonts:
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap",
  elkjs: "https://cdn.jsdelivr.net/npm/elkjs@0.9.3/lib/elk.bundled.js",
  cytoscape: "https://cdn.jsdelivr.net/npm/cytoscape@3.34.3/dist/cytoscape.min.js",
  cytoscapeElk: "https://cdn.jsdelivr.net/npm/cytoscape-elk@2.3.0/dist/cytoscape-elk.js",
  mermaid: "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js",
};

const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="${CDN.fonts}" rel="stylesheet"/>`;

const FALLBACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.4l1.7 4.3 4.3 1.7-4.3 1.7L8 13.4 6.3 9.1 2 7.4l4.3-1.7z" fill="none" stroke="#e8b268" stroke-width="1.3" stroke-linejoin="round"/></svg>`;

function readIconAsset(): string {
  try {
    return readFileSync(new URL("../../assets/superskill-icon.svg", import.meta.url), "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    console.error(`[knowledge-viz] icon asset unavailable (${code ?? String(err)}); using fallback`);
    return FALLBACK_ICON;
  }
}

function inlineIcon(size: number): string {
  const svg = readIconAsset()
    .replace(/^<\?xml[^>]*\?>\s*/, "")
    .replace(/\s(?:width|height|role|aria-label|aria-hidden)="[^"]*"/g, "")
    .trim();
  if (!svg.startsWith("<svg")) return FALLBACK_ICON;
  return svg.replace(/<svg\b/, `<svg width="${size}" height="${size}" aria-hidden="true"`);
}

function iconFaviconHref(): string {
  const svg = readIconAsset().replace(/^<\?xml[^>]*\?>\s*/, "").trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const PALETTE_CSS = `
  :root {
    --bg: #0f1116;
    --bg-2: #13161d;
    --bg-3: #181d26;
    --line: #232833;
    --line-strong: #333b48;
    --ink: #e9e7e2;
    --ink-2: #b3b0a8;
    --ink-3: #8f96a3;
    --accent: #e8b268;
    --accent-ink: #1a1408;
    --f-body: "Space Grotesk", sans-serif;
    --f-mono: "JetBrains Mono", ui-monospace, monospace;
  }
`;

const MERMAID_THEME = {
  background: "#13161d",
  primaryColor: "#1b2029",
  primaryTextColor: "#e9e7e2",
  primaryBorderColor: "#3a4150",
  secondaryColor: "#181d26",
  tertiaryColor: "#0f1116",
  lineColor: "#6b7486",
  textColor: "#e9e7e2",
  nodeTextColor: "#e9e7e2",
  edgeLabelBackground: "#0f1116",
  clusterBkg: "#13161d",
  clusterBorder: "#333b48",
  rowOdd: "#1b2029",
  rowEven: "#14171d",
};

type LegendEntry = { type: string; label: string; color: string };

const TYPE_STYLE: Record<string, { label: string; color: string }> = {
  architecture: { label: "Architecture", color: "#8ab4f8" },
  pack: { label: "Pack", color: "#c58af9" },
  playbook: { label: "Playbook", color: "#8fd694" },
  rules: { label: "Rules group", color: "#c9a0ff" },
  rule: { label: "Rule", color: "#e5c07b" },
  adr: { label: "Decision", color: "#f2c94c" },
  learning: { label: "Learning", color: "#7ee0b0" },
  context: { label: "Context", color: "#f2998e" },
  task: { label: "Task", color: "#7fc8f0" },
  session: { label: "Session", color: "#b7a6f0" },
  skill: { label: "Skill", color: "#c58af9" },
  module: { label: "Module", color: "#f0a35e" },
  code: { label: "Code", color: "#8fd0d8" },
  note: { label: "Note", color: "#a9b1bf" },
};

const DEFAULT_STYLE = { label: "Other", color: "#a9b1bf" };

const SAFE_COLOR = /^(#[0-9a-fA-F]{3,8}|rgba?\([0-9.,\s%]+\))$/;

function safeColor(value: unknown): string | null {
  return typeof value === "string" && SAFE_COLOR.test(value.trim()) ? value.trim() : null;
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function legendEntries(model: VizModel): LegendEntry[] {
  const raw = (model as { legend?: unknown }).legend;
  const entries: LegendEntry[] = [];
  const add = (type: string, label?: string | null, color?: string | null) => {
    if (!type || entries.some((e) => e.type === type)) return;
    const base = TYPE_STYLE[type] ?? DEFAULT_STYLE;
    entries.push({ type, label: label || base.label, color: safeColor(color) ?? base.color });
  };
  const addItems = (items: unknown[]) => {
    for (const item of items) {
      if (typeof item === "string") add(item);
      else if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const type = asText(o.type) ?? asText(o.id) ?? asText(o.name);
        if (type) add(type, asText(o.label) ?? asText(o.title), safeColor(o.color));
      }
    }
  };
  if (Array.isArray(raw)) {
    addItems(raw);
  } else if (raw && typeof raw === "object") {
    const holder = raw as Record<string, unknown>;
    if (Array.isArray(holder.types)) {
      addItems(holder.types);
    } else {
      for (const [type, value] of Object.entries(holder)) {
        if (typeof value === "string") add(type, null, safeColor(value));
        else if (value && typeof value === "object") {
          const o = value as Record<string, unknown>;
          add(type, asText(o.label) ?? asText(o.title) ?? asText(o.name), safeColor(o.color));
        } else add(type);
      }
    }
  }
  for (const [type, base] of Object.entries(TYPE_STYLE)) add(type, base.label, base.color);
  return entries;
}

const CLIENT_JS = String.raw`
(function () {
  "use strict";

  var model = __SUPERSKILL_MODEL__;
  var legend = __SUPERSKILL_LEGEND__;
  var FENCE = String.fromCharCode(96, 96, 96);
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var colorOf = {};
  legend.forEach(function (entry) { colorOf[entry.type] = entry.color; });

  var EDGE_COLORS = ["#5f6f95", "#8b6fb0", "#4f8a8b", "#a08050", "#7a8a5a", "#8b6b6b"];
  function edgeColorOf(type) {
    var s = String(type || "related");
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return EDGE_COLORS[h % EDGE_COLORS.length];
  }
  var nodeOwner = {};
  var nodeTitles = {};
  Object.keys(model.graphs).forEach(function (gid) {
    var nodes = (model.graphs[gid] && model.graphs[gid].nodes) || [];
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (!n.id) continue;
      if (!nodeOwner[n.id] || (gid.indexOf("rules") === 0 && nodeOwner[n.id].indexOf("rules") !== 0)) {
        nodeOwner[n.id] = gid;
      }
      if (!nodeTitles[n.id]) nodeTitles[n.id] = n.title || n.id;
    }
  });

  function $(id) { return document.getElementById(id); }

  function safeColor(c, fallback) {
    if (typeof c !== "string") return fallback;
    var v = c.trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
    if (/^rgba?\([0-9., %]+\)$/.test(v)) return v;
    return fallback;
  }
  function typeColor(type) { return safeColor(colorOf[type], "#a9b1bf"); }
  function typeLabel(type) {
    for (var i = 0; i < legend.length; i++) { if (legend[i].type === type) return legend[i].label; }
    return type || "note";
  }
  function dot(type) { return "<span class=\"dot\" style=\"background:" + typeColor(type) + "\"></span>"; }

  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function inline(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/(^|[^\x60])\x60([^\x60]+)\x60/g, "$1<code>$2</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (match, text, href) {
        return /^https?:\/\//i.test(href) ? "<a href=\"" + href + "\" rel=\"noreferrer\">" + text + "</a>" : text;
      });
  }

  function mdText(text) {
    var lines = String(text || "").split("\n");
    var out = "";
    var para = [];
    var inList = false;
    function flushPara() { if (para.length) { out += "<p>" + inline(para.join(" ")) + "</p>"; para = []; } }
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^\s*$/.test(line)) {
        flushPara();
        if (inList) { out += "</ul>"; inList = false; }
        continue;
      }
      var h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        flushPara();
        if (inList) { out += "</ul>"; inList = false; }
        var lvl = Math.min(h[1].length + 1, 5);
        out += "<h" + lvl + ">" + inline(h[2]) + "</h" + lvl + ">";
        continue;
      }
      var li = line.match(/^\s*[-*]\s+(.*)$/);
      if (li) {
        flushPara();
        if (!inList) { out += "<ul>"; inList = true; }
        out += "<li>" + inline(li[1]) + "</li>";
        continue;
      }
      para.push(line.trim());
    }
    flushPara();
    if (inList) out += "</ul>";
    return out;
  }

  function md(src) {
    var parts = String(src || "").split(FENCE);
    var html = "";
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        var chunk = parts[i];
        var nl = chunk.indexOf("\n");
        var code = nl > -1 ? chunk.slice(nl + 1) : "";
        html += "<pre class=\"code\"><code>" + esc(code.replace(/\n$/, "")) + "</code></pre>";
      } else {
        html += mdText(parts[i]);
      }
    }
    return html;
  }

  function extractMermaids(src) {
    var text = String(src || "");
    var tag = FENCE + "mermaid";
    var out = [];
    var i = text.indexOf(tag);
    while (i >= 0) {
      var nl = text.indexOf("\n", i);
      var end = text.indexOf(FENCE, nl + 1);
      if (nl < 0 || end < 0) break;
      out.push(text.slice(nl + 1, end).trim());
      i = text.indexOf(tag, end + 3);
    }
    return out;
  }

  function stripMermaids(src) {
    var text = String(src || "");
    var tag = FENCE + "mermaid";
    var i = text.indexOf(tag);
    if (i < 0) return text;
    var kept = "";
    while (i >= 0) {
      var nl = text.indexOf("\n", i);
      var end = text.indexOf(FENCE, nl + 1);
      if (nl < 0 || end < 0) return (kept + text.slice(0, i)).trim();
      kept += text.slice(0, i);
      text = text.slice(end + 3);
      i = text.indexOf(tag);
    }
    return (kept + text).trim();
  }

  function snippet(src) {
    var text = String(src || "");
    while (true) {
      var a = text.indexOf(FENCE);
      if (a < 0) break;
      var b = text.indexOf(FENCE, a + 3);
      if (b < 0) { text = text.slice(0, a); break; }
      text = text.slice(0, a) + " " + text.slice(b + 3);
    }
    return text.replace(/\s+/g, " ").trim().slice(0, 150);
  }

  function plainText(src) {
    return snippet(src)
      .replace(/^#+\s*/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\x60([^\x60]+)\x60/g, "$1")
      .trim();
  }

  function meaningfulDiagram(code) {
    var trimmed = String(code || "").trim();
    if (!trimmed) return null;
    if (/^flowchart\s+(TB|TD|BT|LR|RL)$/i.test(trimmed)) return null;
    return trimmed;
  }

  function nodeSize(title) {
    var len = Math.max(2, String(title || "").length);
    var w = Math.max(110, Math.min(240, 44 + len * 6.6));
    var perLine = Math.max(6, Math.floor((w - 24) / 6.6));
    var lines = Math.min(3, Math.ceil(len / perLine));
    var h = 20 + lines * 16;
    return { w: Math.round(w), h: Math.round(h) };
  }

  function presentTypes(g) {
    var counts = {};
    g.nodes.forEach(function (n) { var t = n.type || "note"; counts[t] = (counts[t] || 0) + 1; });
    var order = [];
    legend.forEach(function (e) { if (counts[e.type]) order.push(e.type); });
    Object.keys(counts).forEach(function (t) { if (order.indexOf(t) < 0) order.push(t); });
    return order;
  }

  var VIEW_HEAD = {
    graph: ["SuperSkill", "Retrieval graph"],
    hla: ["High-level architecture", "Orchestrator and specialists"],
    lla: ["Low-level architecture", "Module dependencies"],
    erd: ["Data model (ERD)", "Notes, edges, skill graph"],
    flow: ["Dataflow", "How a task becomes context \u2014 and how writes come back"],
    rules: ["Rules library", "Languages \u2192 prefixes \u2192 rules. Click a rule to read it."],
    modules: ["The program", "Layers hold modules. Click a layer to collapse it."]
  };
  var DOC_OF_VIEW = { hla: "diag:high", lla: "diag:low", erd: "diag:erd", flow: "diag:flow" };
  var GRAPH_OF_VIEW = { graph: "root", modules: "impl", rules: "rules" };
  if (model.navigation) model.navigation.forEach(function (item) {
    VIEW_HEAD[item.id] = [item.label, ""];
    if (item.doc) DOC_OF_VIEW[item.id] = item.doc;
    if (item.graph) GRAPH_OF_VIEW[item.id] = item.graph;
  });

  var state = {
    view: "graph",
    tab: "graph",
    stack: ["root"],
    selected: null,
    hovered: null,
    denseLabels: false,
    query: "",
    hidden: {},
    cy: null,
    layout: null,
    fullSource: false,
    libOk: false
  };
  function currentGraphId() { return state.stack[state.stack.length - 1]; }
  function currentGraph() { return model.graphs[currentGraphId()] || null; }

  if (typeof mermaid !== "undefined") {
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        securityLevel: "strict",
        fontFamily: "Space Grotesk, sans-serif",
        themeVariables: __SUPERSKILL_THEME__
      });
    } catch (e) { console.error(e); }
  }

  var CY_STYLE = [
    { selector: "node", style: {
      "background-color": "#1b2029",
      "border-width": 1.5,
      "border-color": "data(color)",
      "label": "data(title)",
      "color": "#e9e7e2",
      "font-family": "Space Grotesk, sans-serif",
      "font-size": 14,
      "text-wrap": "wrap",
      "text-max-width": 200,
      "text-valign": "center",
      "text-halign": "center",
      "shape": "round-rectangle",
      "padding": 8,
      "transition-property": "opacity, border-color, background-color",
      "transition-duration": "160ms"
    }},
    { selector: "node.leaf", style: { "width": "data(w)", "height": "data(h)" } },
    { selector: "node.parent-node", style: {
      "background-color": "#12161f",
      "background-opacity": 0.75,
      "border-color": "#3a4150",
      "border-style": "dashed",
      "font-size": 11,
      "color": "#8f96a3",
      "text-valign": "top",
      "text-halign": "center",
      "padding": 14
    }},
    { selector: "node.parent-node.collapsed", style: { "border-style": "solid", "background-opacity": 0.9 } },
    { selector: "node.c-hidden", style: { "display": "none" } },
    { selector: "node[open = 'graph']", style: { "border-style": "dashed", "border-width": 2 } },
    { selector: "node:selected", style: { "border-color": "#e8b268", "border-width": 3, "background-color": "#232a36" } },
    { selector: "node.q-dim", style: { "opacity": 0.14, "text-opacity": 0.14 } },
    { selector: "node.t-match", style: { "border-color": "#e8b268", "border-width": 2.5 } },
    { selector: "node.s-dim", style: { "opacity": 0.3, "text-opacity": 0.3 } },
    { selector: "node.h-dim", style: { "opacity": 0.3, "text-opacity": 0.3 } },
    { selector: "node.h-hl", style: { "border-color": "#e8b268", "z-index": 20 } },
    { selector: "node.f-hidden", style: { "display": "none" } },
    { selector: "edge", style: {
      "width": 1.3,
      "line-color": "data(ecolor)",
      "target-arrow-color": "data(ecolor)",
      "opacity": 0.95,
      "target-arrow-shape": "triangle",
      "arrow-scale": 0.9,
      "curve-style": "taxi",
      "taxi-direction": "rightward",
      "taxi-turn": 10,
      "taxi-turn-min-distance": 8,
      "label": "data(etype)",
      "font-family": "JetBrains Mono, monospace",
      "font-size": 11,
      "color": "#b3b0a8",
      "text-background-color": "#0f1116",
      "text-background-opacity": 0.85,
      "text-background-padding": 2,
      "text-rotation": "none",
      "transition-property": "opacity",
      "transition-duration": "160ms"
    }},
    { selector: "edge.dense", style: { "text-opacity": 0 } },
    { selector: "edge.dense.lbl", style: { "text-opacity": 1, "z-index": 20 } },
    { selector: "edge.q-dim", style: { "opacity": 0.08 } },
    { selector: "edge.s-dim", style: { "opacity": 0.25 } },
    { selector: "edge.h-dim", style: { "opacity": 0.25 } },
    { selector: "edge.h-hl", style: { "line-color": "#6b7486", "target-arrow-color": "#6b7486", "z-index": 20 } },
    { selector: "edge.f-hidden", style: { "display": "none" } },
    { selector: "edge.c-hidden", style: { "display": "none" } }
  ];
  if (reduceMotion) {
    CY_STYLE.push({ selector: "node", style: { "transition-duration": "0ms" } });
    CY_STYLE.push({ selector: "edge", style: { "transition-duration": "0ms" } });
  }

  if (typeof cytoscape !== "undefined" && typeof cytoscapeElk !== "undefined") {
    try { cytoscape.use(cytoscapeElk); } catch (e) { console.error(e); }
  }

  function ensureCy() {
    if (state.cy || typeof cytoscape === "undefined") return state.cy;
    try {
      state.cy = cytoscape({
        container: $("graph"),
        style: CY_STYLE,
        wheelSensitivity: 0.18,
        minZoom: 0.15,
        maxZoom: 2.5
      });
      state.cy.on("zoom", function () { $("zoom-level").textContent = Math.round(state.cy.zoom() * 100) + "%"; });
      state.cy.on("tap", "node", function (ev) {
        if (ev.target.data("role") === "layer") toggleLayer(ev.target);
        activateNode(ev.target.data("id"));
      });
      state.cy.on("mouseover", "node", function (ev) {
        if (ev.target.hasClass("f-hidden")) return;
        state.hovered = ev.target.data("id");
        refreshEmphasis();
      });
      state.cy.on("mouseout", "node", function () {
        state.hovered = null;
        refreshEmphasis();
      });
      state.cy.on("tap", function (ev) {
        if (ev.target !== state.cy) return;
        state.selected = null;
        state.cy.nodes().unselect();
        refreshEmphasis();
        renderOverview(currentGraph());
      });
      return state.cy;
    } catch (err) {
      console.error(err);
      state.cy = null;
      return null;
    }
  }

  function refreshEmphasis() {
    var cy = state.cy;
    if (!cy) return;
    var selected = state.selected ? cy.getElementById(state.selected) : cy.collection();
    var hovered = state.hovered ? cy.getElementById(state.hovered) : cy.collection();
    var hood = selected.length ? selected.closedNeighborhood() : cy.collection();
    var hoverHood = hovered.length ? hovered.closedNeighborhood() : cy.collection();
    cy.batch(function () {
      cy.elements().removeClass("s-dim s-hl h-dim h-hl");
      if (hood.length) {
        cy.elements().not(hood).addClass("s-dim");
        hood.addClass("s-hl");
      }
      if (hoverHood.length && !hood.length) {
        cy.elements().not(hoverHood).addClass("h-dim");
        hoverHood.addClass("h-hl");
      }
      if (state.denseLabels) {
        var labelled = cy.collection();
        if (selected.length) labelled = labelled.union(selected.connectedEdges());
        if (hovered.length) labelled = labelled.union(hovered.connectedEdges());
        cy.edges().removeClass("lbl");
        labelled.addClass("lbl");
      }
    });
  }

  function refreshLayerEdges(cy) {
    cy.edges().forEach(function (edge) {
      edge.toggleClass("c-hidden", edge.source().hasClass("c-hidden") || edge.target().hasClass("c-hidden"));
    });
  }

  function toggleLayer(node) {
    var cy = state.cy;
    if (!cy) return;
    var collapsed = !node.data("collapsed");
    node.data("collapsed", collapsed);
    node.toggleClass("collapsed", collapsed);
    node.children().toggleClass("c-hidden", collapsed);
    refreshLayerEdges(cy);
    runLayout(cy);
    updateStats(currentGraph());
  }

  function runLayout(cy) {
    if (state.layout) state.layout.stop();
    var eles = cy.elements().not(".c-hidden, .f-hidden");
    if (!eles.length) return;
    var options = { name: "breadthfirst", directed: true, padding: 40, spacingFactor: 1.15, animate: false, fit: true, eles: eles };
    if (typeof cytoscapeElk !== "undefined") {
      var elk = {
        "elk.algorithm": "layered",
        "elk.direction": "RIGHT",
        "elk.edgeRouting": "ORTHOGONAL",
        "elk.spacing.nodeNode": 40,
        "elk.layered.spacing.nodeNodeBetweenLayers": 72,
        "elk.layered.spacing.edgeNodeBetweenLayers": 24,
        "elk.layered.mergeEdges": true,
        "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
        "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX"
      };
      if (cy.nodes(":parent").length) {
        elk["elk.hierarchyHandling"] = "INCLUDE_CHILDREN";
        elk["elk.padding"] = "[top=36,left=20,bottom=20,right=20]";
      }
      options = { name: "elk", animate: false, fit: true, padding: 40, eles: eles, elk: elk };
    }
    if (!eles.edges().length) {
      options = { name: "grid", animate: false, fit: false, avoidOverlap: true, condense: true, padding: 40,
        cols: Math.max(1, Math.round(Math.sqrt(eles.nodes().length * cy.width() / Math.max(1, cy.height())))) };
    }
    options.stop = fitView;
    try {
      state.layout = cy.layout(options);
      state.layout.run();
    } catch (err) {
      console.error(err);
      try { cy.layout({ name: "breadthfirst", directed: true, padding: 40, animate: false, fit: true, eles: eles }).run(); } catch (e2) { console.error(e2); }
    }
  }

  function fitView() {
    if (!$("doc-slot").hidden) {
      var svg = $("doc-slot").querySelector("svg");
      if (svg && svg.viewBox.baseVal.width) setDiagramScale(Math.min(1, ($("doc-slot").clientWidth - 64) / svg.viewBox.baseVal.width));
      $("doc-slot").scrollTop = 0;
      $("doc-slot").scrollLeft = 0;
      return;
    }
    if (!state.cy) return;
    var visible = state.cy.elements().not(".f-hidden, .c-hidden");
    try {
      state.cy.fit(visible.length ? visible : state.cy.elements(), window.innerWidth < 700 ? 24 : 56);
      if (state.cy.zoom() > 1.2) { state.cy.zoom(1.2); state.cy.center(visible); }
    } catch (e) { console.error(e); }
  }

  function zoomBy(factor) {
    if (!$("doc-slot").hidden) { setDiagramScale((state.diagramScale || 1) * factor); return; }
    if (!state.cy || !state.libOk) return;
    state.cy.zoom({ level: state.cy.zoom() * factor, renderedPosition: { x: state.cy.width() / 2, y: state.cy.height() / 2 } });
  }

  function setDiagramScale(scale) {
    state.diagramScale = Math.max(0.01, Math.min(4, scale));
    Array.prototype.forEach.call($("doc-slot").querySelectorAll("svg"), function (svg) {
      svg.style.width = svg.viewBox.baseVal.width * state.diagramScale + "px";
      svg.style.maxWidth = "none";
    });
    $("zoom-level").textContent = Math.round(state.diagramScale * 100) + "%";
  }

  function clearFilters() {
    state.query = "";
    state.hidden = {};
    $("search").value = "";
  }

  function resetView() {
    if (!$("doc-slot").hidden) { fitView(); return; }
    clearFilters();
    renderChips(currentGraph());
    applyFilters();
    updateStats(currentGraph());
    if (!state.cy) { renderFallbackList(); return; }
    runLayout(state.cy);
  }

  function visibleCount(g) {
    var q = state.query;
    var count = 0;
    g.nodes.forEach(function (n) {
      if (state.hidden[n.type || "note"]) return;
      var title = String(n.title || n.id).toLowerCase();
      var id = String(n.id).toLowerCase();
      if (q && title.indexOf(q) < 0 && id.indexOf(q) < 0) return;
      count++;
    });
    return count;
  }

  function updateStats(g) {
    if (!g) return;
    var total = g.nodes.length;
    var visible = visibleCount(g);
    var nodeText = visible === total ? total + " nodes" : visible + " of " + total + " nodes";
    $("stats").textContent = nodeText + " · " + g.edges.length + " edges";
    $("empty").hidden = visible > 0;
    $("empty-message").textContent = total === 0 ? "No nodes yet" : "No matching nodes";
    $("empty-hint").textContent = total === 0 ? "Notes added to this project will appear here when you regenerate the graph." : "Try a different search or show all node types.";
    $("clear-filters").hidden = total === 0;
  }

  function applyFilters() {
    var cy = state.cy;
    var q = state.query;
    if (cy && state.libOk) {
      cy.batch(function () {
        cy.nodes().forEach(function (node) {
          var hidden = !!state.hidden[node.data("type") || "note"];
          var title = String(node.data("title") || "").toLowerCase();
          var id = String(node.data("id") || "").toLowerCase();
          var match = !q || title.indexOf(q) > -1 || id.indexOf(q) > -1;
          node.toggleClass("f-hidden", hidden);
          node.toggleClass("q-dim", !hidden && !!q && !match);
          node.toggleClass("t-match", !hidden && !!q && match);
        });
        cy.edges().forEach(function (edge) {
          var hidden = edge.source().hasClass("f-hidden") || edge.target().hasClass("f-hidden");
          var match = !q || (edge.source().hasClass("t-match") && edge.target().hasClass("t-match"));
          edge.toggleClass("f-hidden", hidden);
          edge.toggleClass("q-dim", !hidden && !!q && !match);
        });
      });
    }
    applyListFilters();
  }

  function applyListFilters() {
    var q = state.query;
    Array.prototype.forEach.call(document.querySelectorAll("#fallback .index-group"), function (section) {
      section.hidden = !!state.hidden[section.getAttribute("data-type") || "note"];
    });
    Array.prototype.forEach.call(document.querySelectorAll(".node-row"), function (row) {
      var type = row.getAttribute("data-type") || "note";
      var title = String(row.getAttribute("data-title") || "").toLowerCase();
      var button = row.querySelector("[data-qa='node']");
      var id = String((button && button.getAttribute("data-id")) || "").toLowerCase();
      var match = !q || title.indexOf(q) > -1 || id.indexOf(q) > -1;
      row.hidden = !!state.hidden[type] || (!!q && !match);
    });
  }

  function renderChips(g) {
    var counts = {};
    g.nodes.forEach(function (n) { var t = n.type || "note"; counts[t] = (counts[t] || 0) + 1; });
    var host = $("chips");
    var html = "";
    presentTypes(g).forEach(function (type) {
      var on = !state.hidden[type];
      html += "<button type=\"button\" class=\"chip\" data-type=\"" + esc(type) + "\" aria-pressed=\"" + (on ? "true" : "false") + "\">" +
        dot(type) + esc(typeLabel(type)) + " <span class=\"count\">" + counts[type] + "</span></button>";
    });
    host.innerHTML = html;
    Array.prototype.forEach.call(host.querySelectorAll(".chip"), function (button) {
      button.onclick = function () {
        var type = button.getAttribute("data-type");
        state.hidden[type] = !state.hidden[type];
        button.setAttribute("aria-pressed", state.hidden[type] ? "false" : "true");
        applyFilters();
        updateStats(g);
      };
    });
  }

  function renderLegend() {
    var host = $("legend");
    var html = "<span>Drag to pan · scroll to zoom</span><span>Open directories · select files to read source</span>";
    host.innerHTML = html;
    host.hidden = false;
  }

  function nodeButton(n) {
    var doc = model.docs[n.id];
    var body = doc ? plainText(doc.body) : "";
    return "<div class=\"node-row\" data-title=\"" + esc(n.title || n.id) + "\" data-type=\"" + esc(n.type || "note") + "\">" +
      "<button type=\"button\" class=\"node-item\" data-qa=\"node\" data-id=\"" + esc(n.id) + "\">" +
      dot(n.type) + "<span class=\"node-item-title\">" + esc(n.title || n.id) + "</span></button>" +
      (body ? "<span class=\"node-item-snip\">" + esc(body) + "</span>" : "") +
      "</div>";
  }

  function wireNodeButtons(root) {
    Array.prototype.forEach.call(root.querySelectorAll("[data-qa='node']"), function (button) {
      button.onclick = function () { activateNode(button.getAttribute("data-id")); };
    });
  }

  function renderOverview(g) {
    var panel = $("panel");
    var viewDoc = model.docs["view:" + currentGraphId()];
    var intro = viewDoc ? "<details class=\"view-guide\"><summary>About this view</summary><div class=\"doc-body view-doc\">" + md(viewDoc.body) + "</div></details>" : "";
    if (!state.libOk) {
      panel.innerHTML = "<div class=\"panel-head\"><h2>" + esc(g.title) + "</h2><p class=\"hint\">" + esc(g.subtitle || "") + "</p></div>" +
        intro + "<p class=\"hint\">Select a node from the index to read it.</p>";
      return;
    }
    var html = "<div class=\"panel-head\"><h2>Browse nodes</h2><p class=\"hint\">Select a node to read its document and explore connections.</p></div>";
    html += intro;
    html += g.nodes.length ? "<div class=\"node-list\">" + g.nodes.map(nodeButton).join("") + "</div>"
      : "<p class=\"hint\">Nothing stored here yet.</p>";
    panel.innerHTML = html;
    wireNodeButtons(panel);
    applyListFilters();
  }

  function renderDetail(g, node) {
    var doc = model.docs[node.id];
    var nodeById = {};
    g.nodes.forEach(function (n) { nodeById[n.id] = n; });
    var relMap = {};
    var relOrder = [];
    g.edges.forEach(function (edge) {
      var dir = edge.from === node.id ? "out" : edge.to === node.id ? "in" : null;
      if (!dir) return;
      var label = edge.label || edge.type || "related";
      var key = dir + "|" + (dir === "out" ? edge.to : edge.from) + "|" + label;
      if (!relMap[key]) {
        relMap[key] = { dir: dir, other: dir === "out" ? edge.to : edge.from, type: label, count: 0 };
        relOrder.push(key);
      }
      relMap[key].count++;
    });
    var relations = relOrder.map(function (k) { return relMap[k]; });
    var html = "<button type=\"button\" id=\"all-nodes\" class=\"btn\">All nodes</button><div class=\"detail anim\">";
    html += "<div class=\"detail-meta\">" + dot(node.type) + "<span class=\"chip-type\">" + esc(typeLabel(node.type)) + "</span></div>";
    html += "<h2>" + esc(node.title || node.id) + "</h2>";
    html += "<div class=\"detail-path\">" + esc(node.id) + "</div>";
    if (node.open && node.open.kind === "graph" && model.graphs[node.open.id]) {
      html += "<button type=\"button\" class=\"btn open-graph\" data-open-graph=\"" + esc(node.open.id) + "\">Open " + esc(model.graphs[node.open.id].title) + " view</button>";
    }
    html += "<h3>Relations <span class=\"count\">" + relations.length + "</span></h3>";
    if (!relations.length) {
      html += "<p class=\"hint\">No relations recorded in this graph.</p>";
    } else {
      html += "<ul class=\"rels\">" + relations.map(function (r) {
        var other = nodeById[r.other];
        return "<li><button type=\"button\" class=\"rel\" data-rel=\"" + esc(r.other) + "\"><span class=\"rel-dir\">" + (r.dir === "out" ? "\u2192" : "\u2190") + "</span><span>" +
          esc(other ? other.title || r.other : r.other) + "</span> <span class=\"rel-type\">" + esc(r.type) + (r.count > 1 ? " \u00d7" + r.count : "") + "</span></button></li>";
      }).join("") + "</ul>";
    }
    var linked = doc && doc.related ? doc.related : [];
    if (linked.length) {
      html += "<h3>Related <span class=\"count\">" + linked.length + "</span></h3>";
      html += "<ul class=\"rels\">" + linked.map(function (rid) {
        return "<li><button type=\"button\" class=\"rel\" data-jump=\"" + esc(rid) + "\"><span class=\"rel-dir\">\u2192</span><span>" +
          esc(nodeTitles[rid] || rid) + "</span> <span class=\"rel-type\">related</span></button></li>";
      }).join("") + "</ul>";
    }
    html += "<h3>Document</h3>";
    html += doc ? "<div class=\"doc-body\">" + md(stripMermaids(doc.body)) + "</div>" + sourceContent(doc)
      : "<p class=\"hint\">No document stored for this node.</p>";
    html += "</div>";
    var panel = $("panel");
    panel.innerHTML = html;
    panel.scrollTop = 0;
    if ($("read-full-source")) $("read-full-source").onclick = function () { state.fullSource = true; renderDetail(g, node); };
    $("all-nodes").onclick = function () {
      var selected = state.selected;
      state.selected = null;
      if (state.cy) { state.cy.nodes().unselect(); refreshEmphasis(); }
      renderOverview(g);
      $("back").disabled = state.stack.length <= 1;
      var buttons = panel.querySelectorAll("[data-id]");
      Array.prototype.some.call(buttons, function (button) {
        if (button.getAttribute("data-id") !== selected) return false;
        button.focus(); return true;
      });
    };
    Array.prototype.forEach.call(panel.querySelectorAll("[data-open-graph]"), function (button) {
      button.onclick = function () { openGraph(button.getAttribute("data-open-graph")); };
    });
    Array.prototype.forEach.call(panel.querySelectorAll("[data-rel]"), function (button) {
      button.onclick = function () { selectNode(button.getAttribute("data-rel")); };
    });
    Array.prototype.forEach.call(panel.querySelectorAll("[data-jump]"), function (button) {
      button.onclick = function () { jumpToNode(button.getAttribute("data-jump")); };
    });
  }

  function sourceContent(doc) {
    if (!doc.source) return "";
    if (doc.source.unavailableReason) return "<p class=\"hint\">" + esc(doc.source.unavailableReason) + "</p>";
    var source = (model.sources || {})[doc.source.path];
    if (!source) return "<p class=\"hint\">Source snapshot is unavailable. Regenerate this graph from the project directory.</p>";
    var span = doc.source.startLine && !state.fullSource;
    var text = span ? source.text.split("\n").slice(doc.source.startLine - 1, doc.source.endLine).join("\n") : source.text;
    return "<div class=\"source-head\"><span>" + esc(doc.source.path) + (span ? ":" + doc.source.startLine + "–" + doc.source.endLine : " · complete file") + "</span>" +
      (span ? "<button type=\"button\" id=\"read-full-source\" class=\"btn\">Read full file</button>" : "") + "</div>" +
      (source.truncated ? "<p class=\"hint\">Source snapshot limited to 1 MB.</p>" : "") +
      "<pre class=\"code source-code\" tabindex=\"0\"><code>" + esc(text) + "</code></pre>";
  }

  function activateNode(id) {
    var g = currentGraph();
    var node = g && g.nodes.find(function (item) { return item.id === id; });
    if (model.navigation && node && node.type !== "code" && node.open && node.open.kind === "graph") {
      openGraph(node.open.id);
      return;
    }
    selectNode(id);
  }

  function renderBreadcrumbs() {
    var host = $("breadcrumbs");
    host.innerHTML = state.stack.map(function (id, index) {
      var graph = model.graphs[id];
      return "<button type=\"button\" data-depth=\"" + index + "\"" + (index === state.stack.length - 1 ? " aria-current=\"location\"" : "") + ">" + esc(graph ? graph.title : id) + "</button>";
    }).join("<span aria-hidden=\"true\">/</span>");
    Array.prototype.forEach.call(host.querySelectorAll("button"), function (button) {
      button.onclick = function () {
        state.stack = state.stack.slice(0, Number(button.getAttribute("data-depth")) + 1);
        clearFilters();
        if (currentGraphId() === "root") state.tab = "graph";
        renderGraphView();
      };
    });
  }

  function selectNode(id) {
    var g = currentGraph();
    if (!g) return;
    var node = null;
    g.nodes.forEach(function (n) { if (n.id === id) node = n; });
    if (!node) return;
    state.selected = id;
    state.fullSource = false;
    $("back").disabled = false;
    if (state.cy) {
      state.cy.nodes().unselect();
      var el = state.cy.getElementById(id);
      if (el && el.length) el.select();
      refreshEmphasis();
    }
    renderDetail(g, node);
    $("all-nodes").focus({ preventScroll: true });
    if (window.innerWidth <= 760) $("panel").scrollIntoView({ block: "start", behavior: "instant" });
  }

  function openGraph(id) {
    if (!model.graphs[id] || currentGraphId() === id) return;
    clearFilters();
    state.stack.push(id);
    state.selected = null;
    renderGraphView();
  }

  function jumpToNode(id) {
    var g = currentGraph();
    if (g && g.nodes.some(function (n) { return n.id === id; })) { selectNode(id); return; }
    var owner = nodeOwner[id];
    if (!owner || !model.graphs[owner]) return;
    clearFilters();
    state.stack.push(owner);
    state.tab = owner.indexOf("rules") === 0 ? "rules" : state.tab;
    renderGraphView();
    selectNode(id);
  }

  function renderFallbackList() {
    var g = currentGraph();
    if (g) { renderFallback(g); applyListFilters(); updateStats(g); }
  }

  function renderFallback(g) {
    var host = $("fallback");
    host.hidden = false;
    var groups = {};
    g.nodes.forEach(function (n) { var t = n.type || "note"; (groups[t] = groups[t] || []).push(n); });
    var html = "<p class=\"fallback-note\">Graph libraries did not load. Showing a readable index instead.</p>";
    html += "<p class=\"fallback-stats\">" + g.nodes.length + " nodes \u00b7 " + g.edges.length + " edges</p>";
    Object.keys(groups).forEach(function (type) {
      html += "<section class=\"index-group\" data-type=\"" + esc(type) + "\">";
      html += "<h3>" + dot(type) + esc(typeLabel(type)) + " <span class=\"count\">" + groups[type].length + "</span></h3>";
      html += "<div class=\"node-list\">" + groups[type].map(nodeButton).join("") + "</div></section>";
    });
    host.innerHTML = html;
    wireNodeButtons(host);
  }

  function drawGraph(g) {
    state.selected = null;
    state.hovered = null;
    renderChips(g);
    renderLegend();
    updateStats(g);
    $("doc-slot").hidden = true;
    $("doc-slot").innerHTML = "";
    $("fallback").hidden = true;
    $("fallback").innerHTML = "";
    $("zoom-controls").hidden = false;
    var cy = ensureCy();
    if (!cy) {
      state.libOk = false;
      $("graph").hidden = true;
      $("zoom-controls").hidden = true;
      $("legend").hidden = true;
      $("fit").disabled = true;
      $("reset").disabled = true;
      renderFallback(g);
      applyListFilters();
      updateStats(g);
      return;
    }
    state.libOk = true;
    $("graph").hidden = false;
    $("fit").disabled = false;
    $("reset").disabled = false;
    try { cy.resize(); } catch (e) { console.error(e); }
    if (state.layout) { state.layout.stop(); state.layout = null; }
    cy.elements().remove();
    state.denseLabels =
      currentGraphId() !== "root" &&
      (g.nodes.length > 12 || g.edges.length > 18 || (g.edges.length > 8 && g.edges.length * 2 > g.nodes.length));
    var parents = {};
    g.nodes.forEach(function (n) { if (n.parent) parents[n.parent] = true; });
    var ordered = g.nodes.slice().sort(function (a, b) {
      return (a.parent ? 1 : 0) - (b.parent ? 1 : 0);
    });
    var elements = [];
    ordered.forEach(function (n) {
      var size = nodeSize(n.title || n.id);
      var isParent = !!parents[n.id];
      elements.push({ group: "nodes", classes: isParent ? "parent-node" : "leaf", data: {
        id: n.id,
        title: n.title || n.id,
        type: n.type || "note",
        open: n.open && n.open.kind === "graph" ? "graph" : "doc",
        color: typeColor(n.type),
        w: size.w,
        h: size.h,
        parent: n.parent || undefined,
        role: isParent ? "layer" : "node"
      }});
    });
    var ids = {};
    g.nodes.forEach(function (n) { ids[n.id] = true; });
    g.edges.forEach(function (e, i) {
      if (!ids[e.from] || !ids[e.to]) return;
      var etype = e.label || e.type || "related";
      elements.push({ group: "edges", data: { id: "e" + i, source: e.from, target: e.to, etype: etype, ecolor: edgeColorOf(e.type || etype) } });
    });
    if (!elements.length) {
      try { cy.fit(); } catch (e) { console.error(e); }
      return;
    }
    cy.add(elements);
    if (state.denseLabels) cy.edges().addClass("dense");
    runLayout(cy);
    refreshEmphasis();
    applyFilters();
  }

  function renderGraphView() {
    var id = currentGraphId();
    var g = model.graphs[id];
    if (!g) { go("graph", false); return; }
    $("toolbar").hidden = false;
    $("breadcrumbs").hidden = false;
    renderBreadcrumbs();
    $("back").disabled = state.stack.length <= 1;
    $("title").textContent = g.title;
    $("sub").textContent = g.subtitle || "";
    setNav(state.tab);
    $("legend").hidden = false;
    drawGraph(g);
    renderOverview(g);
  }

  function renderDocView(view) {
    var docId = DOC_OF_VIEW[view];
    var doc = docId ? model.docs[docId] : null;
    var head = VIEW_HEAD[view] || ["", ""];
    $("title").textContent = (doc && doc.title) || head[0];
    $("sub").textContent = head[1];
    setNav(view);
    $("toolbar").hidden = true;
    $("breadcrumbs").hidden = true;
    $("empty").hidden = true;
    $("zoom-controls").hidden = true;
    $("back").disabled = true;
    $("chips").innerHTML = "";
    $("legend").hidden = true;
    $("fit").disabled = true;
    $("reset").disabled = true;
    $("stats").textContent = "diagram";
    $("graph").hidden = true;
    $("fallback").hidden = true;
    $("fallback").innerHTML = "";
    var slot = $("doc-slot");
    slot.hidden = false;
    var codes = (doc ? extractMermaids(doc.body) : []).map(meaningfulDiagram).filter(Boolean);
    if (!codes.length) {
      slot.innerHTML = "<div class=\"doc-body\">" + (doc ? md(doc.body) : "<p>No diagram is available for this view.</p>") + "</div>";
    } else if (typeof mermaid === "undefined") {
      slot.innerHTML = "<p class=\"empty\">Mermaid did not load. Showing the diagram source.</p>" +
        codes.map(function (c) { return "<pre class=\"code\"><code>" + esc(c) + "</code></pre>"; }).join("");
    } else {
      var stamp = Date.now() + "-" + Math.random().toString(36).slice(2);
      slot.innerHTML = codes.map(function (c, i) {
        return "<div class=\"diagram\" id=\"diagram-" + stamp + "-" + i + "\"><p class=\"empty\">Rendering diagram\u2026</p></div>";
      }).join("");
      codes.forEach(function (code, i) {
        var host = document.getElementById("diagram-" + stamp + "-" + i);
        function showSource() {
          if (host) host.innerHTML = "<pre class=\"code\"><code>" + esc(code) + "</code></pre>";
        }
        try {
          mermaid.render("mmd" + stamp + "_" + i, code).then(function (res) {
            if (host) {
              host.innerHTML = res.svg;
              var svg = host.querySelector("svg");
              if (svg && svg.viewBox.baseVal.width) {
                $("zoom-controls").hidden = false;
                $("fit").disabled = false;
                $("reset").disabled = false;
                fitView();
              }
            }
          }).catch(function (err) { console.error(err); showSource(); });
        } catch (err) {
          console.error(err);
          showSource();
        }
      });
    }
    var panel = $("panel");
    panel.innerHTML = doc
      ? "<div class=\"detail anim\"><div class=\"detail-meta\">" + dot(doc.type) + "<span class=\"chip-type\">" + esc(typeLabel(doc.type)) + "</span></div><h2>" + esc(doc.title) + "</h2><div class=\"doc-body\">" + md(stripMermaids(doc.body)) + "</div></div>"
      : "<p class=\"hint\">Nothing stored for this view.</p>";
    panel.scrollTop = 0;
  }

  function setNav(view) {
    var item = model.navigation && model.navigation.find(function (entry) { return entry.id === view; });
    var section = item && item.section || view;
    Array.prototype.forEach.call(document.querySelectorAll("#nav [data-view]"), function (button) {
      if (button.getAttribute("data-view") === section) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    var picker = $("view-select");
    if (picker && model.navigation) {
      var choices = model.navigation.filter(function (entry) { return (entry.section || entry.id) === section; });
      picker.innerHTML = choices.map(function (entry) { return "<option value=\"" + esc(entry.id) + "\">" + esc(entry.label) + "</option>"; }).join("");
      picker.value = view;
      $("view-picker").hidden = choices.length < 2;
    }
  }

  function go(view, pushHash) {
    if (pushHash !== false && location.hash.replace("#", "") !== view) {
      location.hash = view;
      return;
    }
    state.view = view;
    state.selected = null;
    clearFilters();
    if (DOC_OF_VIEW[view]) {
      state.tab = view;
      state.stack = ["root"];
      renderDocView(view);
      return;
    }
    state.tab = GRAPH_OF_VIEW[view] ? view : "graph";
    var graphId = GRAPH_OF_VIEW[state.tab];
    state.stack = graphId === "root" ? ["root"] : ["root", graphId];
    renderGraphView();
  }

  function goBack() {
    if (state.selected && $("all-nodes")) { $("all-nodes").click(); return; }
    clearFilters();
    if (state.stack.length > 1) state.stack.pop();
    if (currentGraphId() === "root") { go("graph", false); return; }
    renderGraphView();
  }

  Array.prototype.forEach.call(document.querySelectorAll("#nav [data-view]"), function (button) {
    button.onclick = function () { go(button.getAttribute("data-view")); };
  });
  $("zoom-in").onclick = function () { zoomBy(1.25); };
  if ($("view-select")) $("view-select").onchange = function () { go(this.value); };
  $("zoom-out").onclick = function () { zoomBy(0.8); };
  $("clear-filters").onclick = function () { resetView(); $("search").focus(); };
  $("fit").onclick = function () { fitView(); };
  $("reset").onclick = function () { resetView(); };
  $("back").onclick = function () { goBack(); };
  $("search").addEventListener("input", function () {
    state.query = this.value.trim().toLowerCase();
    applyFilters();
    updateStats(currentGraph());
  });
  window.addEventListener("hashchange", function () {
    var view = location.hash.replace("#", "") || "graph";
    go(view, false);
  });
  window.addEventListener("resize", function () { if (state.cy) { try { state.cy.resize(); } catch (e) { console.error(e); } } });
  document.addEventListener("keydown", function (ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    var target = ev.target || {};
    var tag = target.tagName || "";
    var typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
    if (ev.key === "/" && !typing) { ev.preventDefault(); $("search").focus(); return; }
    if (ev.key === "Escape") {
      if (typing) { target.blur(); return; }
      if (state.query) { $("search").value = ""; state.query = ""; applyFilters(); updateStats(currentGraph()); return; }
      if (state.stack.length > 1) { goBack(); return; }
      go("graph");
      return;
    }
    if (typing) return;
    var key = ev.key.toLowerCase();
    if (key === "g") go("graph");
    else if (key === "h") go("hla");
    else if (key === "l") go("lla");
    else if (key === "e") go("erd");
    else if (key === "r") go("rules");
    else if (key === "f") go("flow");
    else if (key === "m") go("modules");
  });

  var initial = location.hash.replace("#", "") || "graph";
  if (!VIEW_HEAD[initial]) initial = "graph";
  go(initial, false);
  if (document.fonts) document.fonts.ready.then(function () {
    if (state.cy) { state.cy.style().update(); if (!$("graph").hidden) fitView(); }
  });
})();
`;

export function renderKnowledgeGraphHtml(model: VizModel): string {
  const data = JSON.stringify(model).replace(/</g, "\\u003c");
  const legend = JSON.stringify(legendEntries(model)).replace(/</g, "\\u003c");
  const theme = JSON.stringify(MERMAID_THEME).replace(/</g, "\\u003c");
  const title = escapeHtml(model.graphs.root?.title ?? "Knowledge graph");
  const nav = model.navigation ? [
    { id: "graph", label: "Explore" }, { id: "hla", label: "Architecture" }, { id: "vault", label: "Knowledge" },
  ] : [
    { id: "graph", label: "Retrieval" }, { id: "hla", label: "Architecture" },
    { id: "lla", label: "Dependencies" }, { id: "erd", label: "Data model" },
    { id: "rules", label: "Rules" }, { id: "flow", label: "Flow" }, { id: "modules", label: "Modules" },
  ];
  const brandIcon = inlineIcon(30);
  const favicon = iconFaviconHref();
  const script = CLIENT_JS.replace(/__SUPERSKILL_(MODEL|LEGEND|THEME)__/g, (token) => {
    if (token === "__SUPERSKILL_MODEL__") return data;
    if (token === "__SUPERSKILL_LEGEND__") return legend;
    return theme;
  });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title} — SuperSkill</title>
<link rel="icon" href="${favicon}"/>
${FONT_LINKS}
<script src="${CDN.elkjs}"></script>
<script src="${CDN.cytoscape}"></script>
<script src="${CDN.cytoscapeElk}"></script>
<script src="${CDN.mermaid}"></script>
<style>
${PALETTE_CSS}
  [hidden] { display: none !important; }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body { background: var(--bg); color: var(--ink); font-family: var(--f-body); font-size: 14px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
  button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
  ::selection { background: rgba(232, 178, 104, 0.32); color: var(--ink); }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 8px; border: 2px solid var(--bg); }
  * { scrollbar-color: var(--line-strong) var(--bg); scrollbar-width: thin; }

  #shell { display: flex; flex-direction: column; height: 100vh; height: 100dvh; min-height: 600px; }
  #topbar { flex: none; display: flex; align-items: center; gap: 24px; padding: 10px 20px; border-bottom: 1px solid var(--line); background: var(--bg-2); }
  #brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 600; font-size: 15px; letter-spacing: -0.01em; }
  #brand svg { display: block; flex: none; }
  #nav { display: flex; gap: 4px; min-width: 0; overflow-x: auto; padding: 3px; }
  #nav button { flex: none; min-height: 36px; padding: 6px 12px; border-radius: 999px; color: var(--ink-2); font-size: 13px; letter-spacing: -0.01em; transition: color 160ms cubic-bezier(0.16, 1, 0.3, 1), background-color 160ms cubic-bezier(0.16, 1, 0.3, 1); }
  #nav button:hover { color: var(--ink); background: var(--bg-3); }
  #nav button[aria-current="page"] { background: var(--accent); color: var(--accent-ink); font-weight: 600; }
  .kbd-hint { margin-left: auto; font-family: var(--f-mono); font-size: 11px; color: var(--ink-3); }
  @media (max-width: 900px) { .kbd-hint { display: none; } }

  #app { display: flex; flex: 1; min-height: 0; }
  #stage { display: flex; flex-direction: column; flex: 1; min-width: 0; }
  #breadcrumbs { display: flex; align-items: center; gap: 8px; padding: 14px 24px 0; font-size: 12px; color: var(--ink-3); overflow-x: auto; flex: none; }
  #breadcrumbs button { white-space: nowrap; min-height: 32px; padding: 4px; }
  #breadcrumbs button[aria-current] { color: var(--ink); }
  .source-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-block: 16px 8px; overflow-wrap: anywhere; font-size: 12px; color: var(--ink-2); }
  .source-code { max-height: 65vh; tab-size: 2; }
  #stage-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 20px 24px 12px; }
  #title { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.03em; }
  #sub { margin: 4px 0 0; color: var(--ink-2); font-size: 13px; max-width: 70ch; }
  #stage-actions { flex-wrap: wrap; display: flex; align-items: center; gap: 8px; padding-bottom: 2px; }
  #stats { font-variant-numeric: tabular-nums; margin-right: 8px; font-family: var(--f-mono); font-size: 11px; color: var(--ink-3); white-space: nowrap; }
  .btn { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 7px 12px; border: 1px solid var(--line-strong); border-radius: 8px; background: var(--bg-2); color: var(--ink-2); font-size: 12.5px; transition: color 160ms cubic-bezier(0.16, 1, 0.3, 1), border-color 160ms cubic-bezier(0.16, 1, 0.3, 1), background-color 160ms cubic-bezier(0.16, 1, 0.3, 1); }
  .btn:hover { color: var(--ink); border-color: var(--ink-3); background: var(--bg-3); }
  .btn:disabled { opacity: 0.45; cursor: default; }
  .btn:disabled:hover { color: var(--ink-2); border-color: var(--line-strong); background: var(--bg-2); }

  #toolbar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 0 24px 14px; }
  #search-wrap { display: flex; align-items: center; gap: 8px; min-width: 230px; padding: 7px 10px; border: 1px solid var(--line-strong); border-radius: 8px; background: var(--bg-2); color: var(--ink-3); transition: border-color 160ms cubic-bezier(0.16, 1, 0.3, 1); }
  #search-wrap:focus-within { border-color: var(--accent); }
  #search { font-family: var(--f-body); caret-color: var(--accent); width: 100%; border: 0; outline: none; background: transparent; color: var(--ink); font-size: 13px; }
  #search::placeholder { color: var(--ink-3); }
  #search::-webkit-search-cancel-button { -webkit-appearance: none; }
  #chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border: 1px solid var(--line-strong); border-radius: 999px; background: var(--bg-2); color: var(--ink-2); font-size: 12px; transition: color 160ms cubic-bezier(0.16, 1, 0.3, 1), border-color 160ms cubic-bezier(0.16, 1, 0.3, 1); }
  .chip:hover { color: var(--ink); border-color: var(--ink-3); }
  .chip[aria-pressed="false"] { color: var(--ink-3); border-style: dashed; background: var(--bg); }
  .chip[aria-pressed="false"] .dot { background: transparent !important; border: 1px solid currentColor; }
  .count { font-family: var(--f-mono); font-size: 10.5px; color: var(--ink-3); }
  .dot { display: inline-block; flex: none; width: 8px; height: 8px; border-radius: 50%; }

  #canvas-wrap { position: relative; flex: 1; min-height: 0; margin: 0 24px 20px; border: 1px solid var(--line); border-radius: 12px; background: var(--bg-2); overflow: hidden; }
  #graph { position: absolute; inset: 0; background: var(--bg-2); }
  #doc-slot { position: absolute; inset: 0; overflow: auto; padding: 32px; }
  #doc-slot .empty { margin: 0 0 16px; color: var(--ink-2); font-size: 13px; }
  #doc-slot .diagram svg { max-width: 100%; height: auto; }
  #view-picker { margin: 16px 24px 0; color: var(--ink-2); font-size: 13px; }
  #view-select { margin-left: 8px; padding: 8px 12px; max-width: calc(100% - 50px); color: var(--ink); background: var(--bg-2); border: 1px solid var(--line-strong); border-radius: 8px; font: inherit; }
  #doc-slot .diagram + .diagram { margin-top: 20px; }
  #fallback { position: absolute; inset: 0; overflow: auto; padding: 24px 28px; }
  #empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; text-align: center; background: var(--bg-2); color: var(--ink-2); font-size: 14px; }
  #empty strong { color: var(--ink); font-size: 20px; font-weight: 500; }
  #empty p { max-width: 38ch; }
  #fallback .fallback-note { margin: 0 0 4px; color: var(--ink-2); font-size: 13px; }
  #fallback .fallback-stats { margin: 0 0 24px; font-family: var(--f-mono); font-size: 11px; color: var(--ink-3); }
  .index-group { margin: 0 0 24px; }
  .index-group h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-2); }

  #legend { position: absolute; left: 16px; bottom: 16px; right: 190px; display: flex; flex-wrap: wrap; gap: 4px 16px; pointer-events: none; color: var(--ink-3); font-size: 11px; }
  #zoom-controls { position: absolute; right: 16px; bottom: 16px; display: flex; align-items: center; border: 1px solid var(--line-strong); border-radius: 8px; background: var(--bg); }
  #zoom-controls button { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 6px; }
  #zoom-controls button:hover { background: var(--bg-3); }
  #zoom-level { min-width: 48px; text-align: center; font: 11px var(--f-mono); color: var(--ink-2); }
  .view-guide { margin: 16px 0; padding: 12px 0; border-block: 1px solid var(--line); }
  .view-guide summary { cursor: pointer; color: var(--ink-2); }
  .view-guide[open] summary { margin-bottom: 16px; }
  .view-guide .doc-body { margin: 0; }

  #panel { flex: none; width: clamp(300px, 27vw, 380px); min-width: 0; overflow: auto; padding: 24px 24px 48px; border-left: 1px solid var(--line); background: var(--bg-2); }
  #panel h2 { margin: 16px 0 8px; font-size: 19px; font-weight: 600; letter-spacing: -0.025em; }
  #panel h3 { margin: 24px 0 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-3); }
  .hint { margin: 8px 0; color: var(--ink-2); font-size: 12.5px; }
  .panel-head h2 { margin: 0 0 4px; }
  .node-list { display: flex; flex-direction: column; gap: 2px; margin-top: 8px; }
  .node-row { display: flex; flex-direction: column; gap: 3px; padding: 9px 10px; border-radius: 8px; transition: background-color 160ms cubic-bezier(0.16, 1, 0.3, 1); }
  .node-row:hover { background: var(--bg-3); }
  .node-item { min-height: 32px; overflow-wrap: anywhere; width: 100%; display: flex; align-items: center; gap: 8px; text-align: left; }
  .node-item-title { color: var(--ink); font-weight: 500; letter-spacing: -0.01em; }
  .node-item-snip { color: var(--ink-3); font-size: 12px; line-height: 1.45; padding-left: 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .detail-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .chip-type { padding: 2px 8px; border: 1px solid var(--line-strong); border-radius: 999px; font-family: var(--f-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-3); }
  .detail-path { margin-bottom: 8px; font-family: var(--f-mono); font-size: 11px; color: var(--ink-3); word-break: break-all; }
  .open-graph { margin: 8px 0 4px; }
  .rels { display: flex; flex-direction: column; gap: 2px; margin: 0; padding: 0; list-style: none; }
  .rel { display: flex; align-items: baseline; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 6px; color: var(--ink-2); font-size: 12.5px; text-align: left; transition: background-color 160ms cubic-bezier(0.16, 1, 0.3, 1), color 160ms cubic-bezier(0.16, 1, 0.3, 1); }
  .rel:hover { background: var(--bg-3); color: var(--ink); }
  .rel-dir { font-family: var(--f-mono); color: var(--accent); }
  .rel-type { margin-left: auto; font-family: var(--f-mono); font-size: 10.5px; color: var(--ink-3); }
  .doc-body { max-width: 68ch; color: var(--ink-2); font-size: 13.5px; }
  .view-doc { margin: 4px 0 16px; }
  .doc-body p { margin: 0 0 12px; }
  .doc-body h2 { margin: 24px 0 8px; font-size: 15px; color: var(--ink); }
  .doc-body h3 { margin: 24px 0 8px; font-size: 13px; text-transform: none; letter-spacing: 0; color: var(--ink); }
  .doc-body strong { color: var(--ink); }
  .doc-body code { padding: 1px 5px; border-radius: 4px; background: var(--bg-3); font-family: var(--f-mono); font-size: 11.5px; color: #d8d4cc; }
  .doc-body ul { margin: 0 0 12px; padding-left: 18px; }
  .doc-body li { margin-bottom: 4px; }
  .doc-body a { color: var(--accent); text-underline-offset: 3px; }
  .code { max-width: 100%; margin: 0 0 16px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); overflow: auto; font-family: var(--f-mono); font-size: 11.5px; line-height: 1.6; color: #d8d4cc; }

  @media (max-width: 1100px) {
    #topbar { gap: 16px; padding-inline: 16px; }
    .kbd-hint { display: none; }
    #stage-head { padding: 20px 16px 12px; }
    #toolbar { padding-inline: 16px; gap: 12px; }
    #canvas-wrap { margin-inline: 16px; }
    #panel { width: 300px; padding: 20px 18px; }
  }
  @media (max-width: 760px) {
    #shell { height: auto; min-height: 100dvh; }
    #topbar { flex-wrap: wrap; gap: 8px; padding: 12px 16px 8px; }
    #nav { width: 100%; }
    #nav button { min-height: 44px; }
    #app { flex-direction: column; }
    #stage { flex: none; }
    #stage-head { gap: 12px; }
    #title { font-size: 23px; }
    #stage-actions { width: 100%; gap: 6px; }
    #stats { margin-right: auto; }
    #toolbar { align-items: stretch; }
    #search-wrap { width: 100%; min-height: 44px; }
    #search { font-size: 16px; }
    #chips { flex-wrap: nowrap; overflow-x: auto; padding-block: 3px; }
    .chip { flex: none; min-height: 44px; }
    #canvas-wrap { flex: none; height: 480px; height: min(60dvh, 520px); min-height: 360px; margin-bottom: 16px; }
    #legend { display: none; }
    #zoom-controls button { width: 44px; height: 44px; }
    #doc-slot { padding: 16px; }
    #panel { width: 100%; overflow: visible; border-left: 0; border-top: 1px solid var(--line); padding: 24px 20px 40px; }
    .btn, .node-item, .rel { min-height: 44px; }
    .node-row { padding-inline: 0; }
    .rel { flex-wrap: wrap; overflow-wrap: anywhere; }
    .doc-body { overflow-wrap: anywhere; }
  }

  @keyframes rise { from { opacity: 0.65; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .anim { animation: rise 320ms cubic-bezier(0.16, 1, 0.3, 1) both; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    .anim { animation: none; }
  }
</style>
</head>
<body>
<div id="shell">
  <header id="topbar">
    <span id="brand">
      ${brandIcon}
      SuperSkill
    </span>
    <nav id="nav" aria-label="Views">
      ${nav.map(item => `<button type="button" data-qa="nav" data-view="${escapeHtml(item.id)}">${escapeHtml(item.label)}</button>`).join("\n      ")}
    </nav>
    <span class="kbd-hint" aria-hidden="true">g h l e r f m · / search · esc back</span>
  </header>
  <div id="app">
    <main id="stage">
      <nav id="breadcrumbs" aria-label="Graph path"></nav>
      ${model.navigation ? '<label id="view-picker" hidden>View <select id="view-select" aria-label="View"></select></label>' : ""}
      <div id="stage-head">
        <div>
          <h1 id="title"></h1>
          <p id="sub"></p>
        </div>
        <div id="stage-actions">
          <span id="stats" role="status" aria-live="polite"></span>
          <button type="button" id="fit" class="btn">Fit view</button>
          <button type="button" id="reset" class="btn">Reset</button>
          <button type="button" id="back" class="btn">Back</button>
        </div>
      </div>
      <div id="toolbar">
        <label id="search-wrap" for="search">
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10.6 10.6L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          <input id="search" aria-label="Search nodes" type="search" placeholder="Search nodes by name" autocomplete="off" spellcheck="false"/>
        </label>
        <div id="chips" role="group" aria-label="Filter by type"></div>
      </div>
      <div id="canvas-wrap">
        <div id="graph" role="img" aria-label="Interactive knowledge graph. Use Browse nodes to explore with a keyboard."></div>
        <div id="doc-slot" hidden></div>
        <div id="fallback" hidden></div>
        <div id="empty" hidden role="status"><strong id="empty-message"></strong><p id="empty-hint"></p><button type="button" id="clear-filters" class="btn">Clear search and filters</button></div>
        <div id="zoom-controls" role="group" aria-label="Graph zoom">
          <button type="button" id="zoom-out" aria-label="Zoom out"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" stroke-width="1.5"/></svg></button>
          <output id="zoom-level" aria-label="Zoom level">100%</output>
          <button type="button" id="zoom-in" aria-label="Zoom in"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3v10" stroke="currentColor" stroke-width="1.5"/></svg></button>
        </div>
        <div id="legend" hidden></div>
      </div>
    </main>
    <aside id="panel" aria-label="Details"></aside>
  </div>
</div>
<script>
${script}
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

function meaningfulMermaid(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return "";
  if (/^flowchart\s+(TB|TD|BT|LR|RL)$/i.test(trimmed)) return "";
  return trimmed;
}

function mermaidCodes(body: string): string[] {
  const codes: string[] = [];
  const re = /```mermaid\s*([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const code = meaningfulMermaid(m[1]);
    if (code) codes.push(code);
  }
  return codes;
}

export function renderArchitectureDiagramsHtml(model: VizModel): string {
  const rootTitle = model.graphs.root?.title ?? "SuperSkill";
  const brandIcon = inlineIcon(30);
  const favicon = iconFaviconHref();
  const rows: Array<{ index: string; title: string; lede: string; codes: string[] }> = [
    {
      index: "01",
      title: "High-level architecture",
      lede: "C4-style container view of the real import graph; edges are labeled with import counts.",
      codes: mermaidCodes(model.docs["diag:high"]?.body ?? ""),
    },
    {
      index: "02",
      title: "Low-level architecture",
      lede: "Module dependency view; arrows point dependent → dependency, fan-in/out and cycles are flagged.",
      codes: mermaidCodes(model.docs["diag:low"]?.body ?? ""),
    },
    {
      index: "03",
      title: "Data model (ERD)",
      lede: "Notes, links, projects, skills, and sessions.",
      codes: mermaidCodes(model.docs["diag:erd"]?.body ?? ""),
    },
    {
      index: "04",
      title: "Dataflow",
      lede: "Two-level DFD: context plus decomposition, with token budgets on LLM-bound flows.",
      codes: mermaidCodes(model.docs["diag:flow"]?.body ?? ""),
    },
  ];
  if (model.navigation) {
    ["diag:high", "diag:low", "diag:erd", "diag:flow"].forEach((id, index) => {
      const doc = model.docs[id];
      if (!doc) return;
      rows[index].title = doc.title;
      rows[index].lede = doc.body.split("```mermaid")[0].trim();
    });
  }
  if (!rows[1].codes.length) {
    const fallback = meaningfulMermaid(
      mermaidFlowchart(model.graphs.impl ?? { nodes: [], edges: [], title: "", subtitle: "" }),
    );
    if (fallback) rows[1].codes.push(fallback);
  }
  const sections = rows
    .map(
      ({ index, title, lede, codes }) => `
  <section class="diagram-section">
    <div class="section-head">
      <span class="section-index" aria-hidden="true">${index}</span>
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p class="section-lede">${escapeHtml(lede)}</p>
      </div>
    </div>
    ${
      codes.length
        ? codes.map((code) => `<div class="diagram"><pre class="mermaid">${escapeHtml(code)}</pre></div>`).join("\n    ")
        : `<p class="empty">No diagram is stored for this view yet. Run graph viz again after the architecture notes exist.</p>`
    }
  </section>`,
    )
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Architecture diagrams — ${escapeHtml(rootTitle)}</title>
<link rel="icon" href="${favicon}"/>
${FONT_LINKS}
<script src="${CDN.mermaid}"></script>
<style>
${PALETTE_CSS}
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { background: var(--bg); color: var(--ink); font-family: var(--f-body); font-size: 15px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  a { color: var(--accent); }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
  ::selection { background: rgba(232, 178, 104, 0.32); color: var(--ink); }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 8px; border: 2px solid var(--bg); }
  * { scrollbar-color: var(--line-strong) var(--bg); scrollbar-width: thin; }

  header.page { max-width: 1180px; margin: 0 auto; padding: 48px 32px 24px; }
  .brand { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; font-weight: 600; font-size: 15px; letter-spacing: -0.01em; }
  .brand svg { display: block; flex: none; }
  .eyebrow { margin: 0 0 12px; font-family: var(--f-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--ink-3); }
  h1 { margin: 0 0 12px; font-size: clamp(26px, 4vw, 38px); font-weight: 600; letter-spacing: -0.03em; }
  .lede { max-width: 68ch; margin: 0 0 16px; color: var(--ink-2); }
  .back-link { display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px; border: 1px solid var(--line-strong); border-radius: 8px; color: var(--ink-2); font-size: 12.5px; text-decoration: none; transition: color 160ms cubic-bezier(0.16, 1, 0.3, 1), border-color 160ms cubic-bezier(0.16, 1, 0.3, 1), background-color 160ms cubic-bezier(0.16, 1, 0.3, 1); }
  .back-link:hover { color: var(--ink); border-color: var(--ink-3); background: var(--bg-2); }
  main { max-width: 1180px; margin: 0 auto; padding-bottom: 64px; }
  .diagram-section { padding: 32px 32px 48px; border-top: 1px solid var(--line); }
  .section-head { display: flex; align-items: baseline; gap: 16px; margin-bottom: 16px; }
  .section-index { font-family: var(--f-mono); font-size: 12px; color: var(--accent); }
  .section-head h2 { margin: 0 0 4px; font-size: 20px; font-weight: 600; letter-spacing: -0.02em; }
  .section-lede { margin: 0; max-width: 68ch; color: var(--ink-2); font-size: 13px; }
  .diagram { overflow: auto; padding: 8px 0; }
  .diagram + .diagram { margin-top: 12px; }
  .diagram svg { max-width: 100%; height: auto; }
  .empty { margin: 0; color: var(--ink-2); font-size: 13px; }
  .no-mermaid .diagram { padding: 0; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition-duration: 0.01ms !important; }
  }
</style>
</head>
<body>
<header class="page">
  <p class="brand">${brandIcon}<span>SuperSkill</span></p>
  <p class="eyebrow">Architecture</p>
  <h1>Architecture diagrams</h1>
  <p class="lede">High-level, low-level, data-model, and dataflow views for ${escapeHtml(rootTitle)}. Rendered from the markdown stored in this vault.</p>
  <a class="back-link" href="knowledge-graph.html">Open the interactive graph</a>
</header>
<main>
${sections}
</main>
<script>
  if (typeof mermaid !== "undefined") {
    mermaid.initialize({
      startOnLoad: true,
      theme: "base",
      securityLevel: "strict",
      fontFamily: "Space Grotesk, sans-serif",
      themeVariables: ${JSON.stringify(MERMAID_THEME)}
    });
  } else {
    document.documentElement.classList.add("no-mermaid");
  }
</script>
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

export async function writeKnowledgeGraphHtml(vaultRoot: string, slug: string): Promise<string> {
  return (await writeKnowledgeGraphFiles(vaultRoot, slug)).html;
}

function generatedNote(inner: string, related: string[]): string {
  const rel = related.length ? `related:\n${related.map((r) => `  - ${r}`).join("\n")}\n` : "";
  return `---\ntype: architecture\n${rel}---\n\n${GENERATED_MARKER}\n\n${inner}\n`;
}

function withHeading(title: string, body: string): string {
  const trimmed = body.trim();
  return trimmed.startsWith("#") ? trimmed : `# ${title}\n\n${trimmed}`;
}

async function writeGeneratedNote(vaultFs: VaultFS, path: string, content: string): Promise<boolean> {
  let written = false;
  await vaultFs.update(path, async (existing) => {
    if (await vaultFs.exists(path) && !existing.includes(GENERATED_MARKER)) return existing;
    written = true;
    return content;
  }, { create: true });
  return written;
}

export async function writeKnowledgeGraphFiles(
  vaultRoot: string,
  slug: string,
  opts?: { codeRoot?: string },
): Promise<{ html: string; canvas: string; diagrams: string; nodes: number; edges: number; kept: string[] }> {
  const vaultFs = new VaultFS(vaultRoot, { projectSlug: slug });
  const idx = ensureProjectIndex(vaultRoot, slug);
  const vaultDump = idx.graphDump();
  const codeRoot = opts?.codeRoot ?? process.cwd();
  const scan = await scanRepo(codeRoot);
  const model = buildProjectVizModel({ slug, vault: vaultDump, docs: idx.noteDocs(), scan });
  await attachProjectSources(model, codeRoot);
  const htmlRel = `projects/${slug}/knowledge-graph.html`;
  const canvasRel = `projects/${slug}/knowledge-graph.canvas`;
  const highRel = `projects/${slug}/architecture/high-level-architecture.md`;
  const lowRel = `projects/${slug}/architecture/low-level-architecture.md`;
  const erdRel = `projects/${slug}/architecture/data-model-erd.md`;
  const flowRel = `projects/${slug}/architecture/dataflow.md`;
  const notes: Array<{ rel: string; content: string }> = [
    {
      rel: highRel,
      content: generatedNote(
        withHeading(model.docs["diag:high"]?.title ?? "High-level architecture", model.docs["diag:high"]?.body ?? ""),
        [lowRel, erdRel, flowRel],
      ),
    },
    {
      rel: lowRel,
      content: generatedNote(
        withHeading(model.docs["diag:low"]?.title ?? "Low-level architecture", model.docs["diag:low"]?.body ?? `# Low-level architecture\n`),
        [highRel, erdRel, flowRel],
      ),
    },
    {
      rel: erdRel,
      content: generatedNote(
        withHeading(model.docs["diag:erd"]?.title ?? "Data model (ERD)", model.docs["diag:erd"]?.body ?? ""),
        [highRel, lowRel, flowRel],
      ),
    },
    {
      rel: flowRel,
      content: generatedNote(
        withHeading(model.docs["diag:flow"]?.title ?? "Dataflow", model.docs["diag:flow"]?.body ?? ""),
        [highRel, lowRel, erdRel],
      ),
    },
  ];
  const kept: string[] = [];
  for (const note of notes) {
    if (!(await writeGeneratedNote(vaultFs, note.rel, note.content))) kept.push(note.rel);
  }
  for (const note of notes) {
    if (kept.includes(note.rel)) continue;
    upsertVaultFile(vaultRoot, note.rel, note.content);
  }
  const diagramsRel = `projects/${slug}/architecture-diagrams.html`;
  await vaultFs.write(htmlRel, renderKnowledgeGraphHtml(model));
  await vaultFs.write(diagramsRel, renderArchitectureDiagramsHtml(model));
  await vaultFs.write(
    canvasRel,
    renderObsidianCanvas(vaultDump, [
      { file: highRel, color: "5" },
      { file: lowRel, color: "1" },
      { file: erdRel, color: "4" },
      { file: flowRel, color: "6" },
    ]),
  );
  const root = model.graphs.root;
  return { html: htmlRel, canvas: canvasRel, diagrams: diagramsRel, nodes: root.nodes.length, edges: root.edges.length, kept };
}
