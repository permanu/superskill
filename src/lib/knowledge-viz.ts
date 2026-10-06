// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureProjectIndex } from "./knowledge-index.js";
import { scanImportGraph } from "./code-graph.js";
import { attachCodeBodies, buildVizModel, mermaidFlowchart, type VizModel } from "./viz-model.js";

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

  function extractMermaid(src) {
    var text = String(src || "");
    var tag = FENCE + "mermaid";
    var i = text.indexOf(tag);
    if (i < 0) return null;
    var nl = text.indexOf("\n", i);
    var end = text.indexOf(FENCE, nl + 1);
    if (nl < 0 || end < 0) return null;
    return text.slice(nl + 1, end).trim();
  }

  function stripMermaid(src) {
    var text = String(src || "");
    if (!extractMermaid(text)) return text;
    var tag = FENCE + "mermaid";
    var i = text.indexOf(tag);
    var nl = text.indexOf("\n", i);
    var end = text.indexOf(FENCE, nl + 1);
    if (i < 0 || end < 0) return text;
    return (text.slice(0, i) + text.slice(end + 3)).trim();
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
    graph: ["SuperSkill", ""],
    hla: ["High-level architecture", "Orchestrator and specialists"],
    lla: ["Low-level architecture", "Module dependencies"],
    erd: ["Data model (ERD)", "Notes, edges, skill graph"],
    modules: ["The program", "Modules. Click one to see the files inside."]
  };
  var DOC_OF_VIEW = { hla: "diag:high", lla: "diag:low", erd: "diag:erd" };

  var state = {
    view: "graph",
    tab: "graph",
    stack: ["root"],
    selected: null,
    query: "",
    hidden: {},
    cy: null,
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
      "font-size": 12,
      "text-wrap": "wrap",
      "text-max-width": 200,
      "text-valign": "center",
      "text-halign": "center",
      "width": "data(w)",
      "height": "data(h)",
      "shape": "round-rectangle",
      "padding": 8,
      "transition-property": "opacity, border-color, background-color",
      "transition-duration": "160ms"
    }},
    { selector: "node[open = 'graph']", style: { "border-style": "dashed", "border-width": 2 } },
    { selector: "node:selected", style: { "border-color": "#e8b268", "border-width": 3, "background-color": "#232a36" } },
    { selector: "node.q-dim", style: { "opacity": 0.14, "text-opacity": 0.14 } },
    { selector: "node.t-match", style: { "border-color": "#e8b268", "border-width": 2.5 } },
    { selector: "node.h-dim", style: { "opacity": 0.14, "text-opacity": 0.14 } },
    { selector: "node.h-hl", style: { "border-color": "#e8b268", "z-index": 20 } },
    { selector: "node.f-hidden", style: { "display": "none" } },
    { selector: "edge", style: {
      "width": 1.2,
      "line-color": "#333b48",
      "target-arrow-color": "#333b48",
      "target-arrow-shape": "triangle",
      "arrow-scale": 0.9,
      "curve-style": "bezier",
      "label": "data(etype)",
      "font-family": "JetBrains Mono, monospace",
      "font-size": 9,
      "color": "#8f96a3",
      "text-background-color": "#0f1116",
      "text-background-opacity": 0.85,
      "text-background-padding": 2,
      "text-rotation": "autorotate",
      "transition-property": "opacity",
      "transition-duration": "160ms"
    }},
    { selector: "edge.q-dim", style: { "opacity": 0.08 } },
    { selector: "edge.h-dim", style: { "opacity": 0.08 } },
    { selector: "edge.h-hl", style: { "line-color": "#6b7486", "target-arrow-color": "#6b7486", "z-index": 20 } },
    { selector: "edge.f-hidden", style: { "display": "none" } }
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
      state.cy.on("tap", "node", function (ev) { selectNode(ev.target.data("id")); });
      state.cy.on("mouseover", "node", function (ev) {
        var node = ev.target;
        if (node.hasClass("q-dim") || node.hasClass("f-hidden")) return;
        var hood = node.closedNeighborhood();
        state.cy.elements().not(hood).addClass("h-dim");
        hood.addClass("h-hl");
      });
      state.cy.on("mouseout", "node", function () {
        state.cy.elements().removeClass("h-dim h-hl");
      });
      return state.cy;
    } catch (err) {
      console.error(err);
      state.cy = null;
      return null;
    }
  }

  function runLayout(cy) {
    var options = { name: "breadthfirst", directed: true, padding: 40, spacingFactor: 1.15, animate: false, fit: true };
    if (typeof cytoscapeElk !== "undefined") {
      options = { name: "elk", animate: false, fit: true, padding: 40, elk: {
        "elk.algorithm": "layered",
        "elk.direction": "RIGHT",
        "elk.spacing.nodeNode": 28,
        "elk.layered.spacing.nodeNodeBetweenLayers": 64,
        "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX"
      }};
    }
    try {
      cy.layout(options).run();
    } catch (err) {
      console.error(err);
      try { cy.layout({ name: "breadthfirst", directed: true, padding: 40, animate: false, fit: true }).run(); } catch (e2) { console.error(e2); }
    }
    cy.one("layoutstop", function () { fitView(); });
  }

  function fitView() {
    if (!state.cy) return;
    var visible = state.cy.elements().not(".f-hidden");
    try { state.cy.fit(visible.length ? visible : state.cy.elements(), 48); } catch (e) { console.error(e); }
  }

  function resetView() {
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
    $("empty").hidden = !(total > 0 && visible === 0);
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
        renderChips(g);
        applyFilters();
        updateStats(g);
      };
    });
  }

  function renderLegend(g) {
    var host = $("legend");
    var html = "<div class=\"legend-title\">Legend</div><div class=\"legend-items\">";
    presentTypes(g).forEach(function (type) {
      html += "<span class=\"legend-item\">" + dot(type) + esc(typeLabel(type)) + "</span>";
    });
    html += "</div><div class=\"legend-note\">Dashed outline opens a nested view</div>";
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
      button.onclick = function () { selectNode(button.getAttribute("data-id")); };
    });
  }

  function renderOverview(g) {
    var panel = $("panel");
    if (!state.libOk) {
      panel.innerHTML = "<div class=\"panel-head\"><h2>" + esc(g.title) + "</h2><p class=\"hint\">" + esc(g.subtitle || "") + "</p></div>" +
        "<p class=\"hint\">Select a node from the index to read it.</p>";
      return;
    }
    var html = "<div class=\"panel-head\"><h2>" + esc(g.title) + "</h2><p class=\"hint\">" + esc(g.subtitle || "") + "</p></div>";
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
    var relations = [];
    g.edges.forEach(function (edge) {
      if (edge.from === node.id) relations.push({ dir: "out", other: edge.to, type: edge.type });
      else if (edge.to === node.id) relations.push({ dir: "in", other: edge.from, type: edge.type });
    });
    var html = "<div class=\"detail anim\">";
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
          esc(other ? other.title || r.other : r.other) + "</span> <span class=\"rel-type\">" + esc(r.type) + "</span></button></li>";
      }).join("") + "</ul>";
    }
    html += "<h3>Document</h3>";
    html += doc ? "<div class=\"doc-body\">" + md(stripMermaid(doc.body)) + "</div>"
      : "<p class=\"hint\">No document stored for this node.</p>";
    html += "</div>";
    var panel = $("panel");
    panel.innerHTML = html;
    panel.scrollTop = 0;
    Array.prototype.forEach.call(panel.querySelectorAll("[data-open-graph]"), function (button) {
      button.onclick = function () { openGraph(button.getAttribute("data-open-graph")); };
    });
    Array.prototype.forEach.call(panel.querySelectorAll("[data-rel]"), function (button) {
      button.onclick = function () { selectNode(button.getAttribute("data-rel")); };
    });
  }

  function selectNode(id) {
    var g = currentGraph();
    if (!g) return;
    var node = null;
    g.nodes.forEach(function (n) { if (n.id === id) node = n; });
    if (!node) return;
    state.selected = id;
    if (state.cy) {
      state.cy.nodes().unselect();
      var el = state.cy.getElementById(id);
      if (el && el.length) el.select();
    }
    renderDetail(g, node);
  }

  function openGraph(id) {
    if (!model.graphs[id] || currentGraphId() === id) return;
    state.stack.push(id);
    state.selected = null;
    renderGraphView();
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
    renderChips(g);
    renderLegend(g);
    updateStats(g);
    $("doc-slot").hidden = true;
    $("doc-slot").innerHTML = "";
    $("fallback").hidden = true;
    $("fallback").innerHTML = "";
    var cy = ensureCy();
    if (!cy) {
      state.libOk = false;
      $("graph").hidden = true;
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
    cy.elements().remove();
    var elements = [];
    g.nodes.forEach(function (n) {
      var size = nodeSize(n.title || n.id);
      elements.push({ group: "nodes", data: {
        id: n.id,
        title: n.title || n.id,
        type: n.type || "note",
        open: n.open && n.open.kind === "graph" ? "graph" : "doc",
        color: typeColor(n.type),
        w: size.w,
        h: size.h
      }});
    });
    var ids = {};
    g.nodes.forEach(function (n) { ids[n.id] = true; });
    g.edges.forEach(function (e, i) {
      if (!ids[e.from] || !ids[e.to]) return;
      elements.push({ group: "edges", data: { id: "e" + i, source: e.from, target: e.to, etype: e.type || "related" } });
    });
    if (!elements.length) {
      try { cy.fit(); } catch (e) { console.error(e); }
      return;
    }
    cy.add(elements);
    runLayout(cy);
    applyFilters();
  }

  function renderGraphView() {
    var id = currentGraphId();
    var g = model.graphs[id];
    if (!g) { go("graph", false); return; }
    $("toolbar").hidden = false;
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
    var code = meaningfulDiagram(doc ? extractMermaid(doc.body) : null);
    if (!code) {
      slot.innerHTML = "<p class=\"empty\">No diagram stored for this view yet.</p>";
    } else if (typeof mermaid === "undefined") {
      slot.innerHTML = "<p class=\"empty\">Mermaid did not load. Showing the diagram source.</p><pre class=\"code\"><code>" + esc(code) + "</code></pre>";
    } else {
      slot.innerHTML = "<p class=\"empty\">Rendering diagram\u2026</p>";
      try {
        mermaid.render("mmd" + Date.now(), code).then(function (res) {
          slot.innerHTML = "<div class=\"diagram\">" + res.svg + "</div>";
        }).catch(function (err) {
          console.error(err);
          slot.innerHTML = "<pre class=\"code\"><code>" + esc(code) + "</code></pre>";
        });
      } catch (err) {
        console.error(err);
        slot.innerHTML = "<pre class=\"code\"><code>" + esc(code) + "</code></pre>";
      }
    }
    var panel = $("panel");
    panel.innerHTML = doc
      ? "<div class=\"detail anim\"><div class=\"detail-meta\">" + dot(doc.type) + "<span class=\"chip-type\">" + esc(typeLabel(doc.type)) + "</span></div><h2>" + esc(doc.title) + "</h2><div class=\"doc-body\">" + md(stripMermaid(doc.body)) + "</div></div>"
      : "<p class=\"hint\">Nothing stored for this view.</p>";
    panel.scrollTop = 0;
  }

  function setNav(view) {
    Array.prototype.forEach.call(document.querySelectorAll("#nav [data-view]"), function (button) {
      if (button.getAttribute("data-view") === view) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function go(view, pushHash) {
    if (pushHash !== false && location.hash.replace("#", "") !== view) {
      location.hash = view;
      return;
    }
    state.view = view;
    state.selected = null;
    state.query = "";
    $("search").value = "";
    if (view === "hla" || view === "lla" || view === "erd") {
      state.tab = view;
      state.stack = ["root"];
      renderDocView(view);
      return;
    }
    state.tab = view === "modules" ? "modules" : "graph";
    state.stack = view === "modules" ? ["root", "impl"] : ["root"];
    renderGraphView();
  }

  function goBack() {
    if (state.stack.length > 1) state.stack.pop();
    if (currentGraphId() === "root") { go("graph", false); return; }
    renderGraphView();
  }

  Array.prototype.forEach.call(document.querySelectorAll("#nav [data-view]"), function (button) {
    button.onclick = function () { go(button.getAttribute("data-view")); };
  });
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
    var typing = tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
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
    else if (key === "m") go("modules");
    else if (key === "f") fitView();
  });

  var initial = location.hash.replace("#", "") || "graph";
  if (!VIEW_HEAD[initial]) initial = "graph";
  go(initial, false);
})();
`;

export function renderKnowledgeGraphHtml(model: VizModel): string {
  const data = JSON.stringify(model).replace(/</g, "\\u003c");
  const legend = JSON.stringify(legendEntries(model)).replace(/</g, "\\u003c");
  const theme = JSON.stringify(MERMAID_THEME).replace(/</g, "\\u003c");
  const title = escapeHtml(model.graphs.root?.title ?? "Knowledge graph");
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

  #shell { display: flex; flex-direction: column; height: 100vh; height: 100dvh; }
  #topbar { display: flex; align-items: center; gap: 24px; padding: 10px 20px; border-bottom: 1px solid var(--line); background: var(--bg-2); }
  #brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 600; font-size: 15px; letter-spacing: -0.01em; }
  #brand svg { display: block; }
  #nav { display: flex; gap: 4px; }
  #nav button { padding: 6px 12px; border-radius: 999px; color: var(--ink-2); font-size: 13px; letter-spacing: -0.01em; transition: color 160ms cubic-bezier(0.16, 1, 0.3, 1), background-color 160ms cubic-bezier(0.16, 1, 0.3, 1); }
  #nav button:hover { color: var(--ink); background: var(--bg-3); }
  #nav button[aria-current="page"] { background: var(--accent); color: var(--accent-ink); font-weight: 600; }
  .kbd-hint { margin-left: auto; font-family: var(--f-mono); font-size: 11px; color: var(--ink-3); }
  @media (max-width: 900px) { .kbd-hint { display: none; } }

  #app { display: flex; flex: 1; min-height: 0; }
  #stage { display: flex; flex-direction: column; flex: 1; min-width: 0; }
  #stage-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 20px 24px 12px; }
  #title { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.03em; }
  #sub { margin: 4px 0 0; color: var(--ink-2); font-size: 13px; max-width: 70ch; }
  #stage-actions { display: flex; align-items: center; gap: 8px; padding-bottom: 2px; }
  #stats { margin-right: 8px; font-family: var(--f-mono); font-size: 11px; color: var(--ink-3); white-space: nowrap; }
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border: 1px solid var(--line-strong); border-radius: 8px; background: var(--bg-2); color: var(--ink-2); font-size: 12.5px; transition: color 160ms cubic-bezier(0.16, 1, 0.3, 1), border-color 160ms cubic-bezier(0.16, 1, 0.3, 1), background-color 160ms cubic-bezier(0.16, 1, 0.3, 1); }
  .btn:hover { color: var(--ink); border-color: var(--ink-3); background: var(--bg-3); }
  .btn:disabled { opacity: 0.45; cursor: default; }
  .btn:disabled:hover { color: var(--ink-2); border-color: var(--line-strong); background: var(--bg-2); }

  #toolbar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 0 24px 14px; }
  #search-wrap { display: flex; align-items: center; gap: 8px; min-width: 230px; padding: 7px 10px; border: 1px solid var(--line-strong); border-radius: 8px; background: var(--bg-2); color: var(--ink-3); transition: border-color 160ms cubic-bezier(0.16, 1, 0.3, 1); }
  #search-wrap:focus-within { border-color: var(--accent); }
  #search { width: 100%; border: 0; outline: none; background: transparent; color: var(--ink); font-size: 13px; }
  #search::placeholder { color: var(--ink-3); }
  #search::-webkit-search-cancel-button { -webkit-appearance: none; }
  #chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border: 1px solid var(--line-strong); border-radius: 999px; background: var(--bg-2); color: var(--ink-2); font-size: 12px; transition: color 160ms cubic-bezier(0.16, 1, 0.3, 1), border-color 160ms cubic-bezier(0.16, 1, 0.3, 1); }
  .chip:hover { color: var(--ink); border-color: var(--ink-3); }
  .chip[aria-pressed="false"] { opacity: 0.45; border-style: dashed; }
  .count { font-family: var(--f-mono); font-size: 10.5px; color: var(--ink-3); }
  .dot { display: inline-block; flex: none; width: 8px; height: 8px; border-radius: 50%; }

  #canvas-wrap { position: relative; flex: 1; min-height: 0; margin: 0 24px 20px; border: 1px solid var(--line); border-radius: 12px; background: var(--bg-2); overflow: hidden; }
  #graph { position: absolute; inset: 0; background: var(--bg-2); }
  #doc-slot { position: absolute; inset: 0; overflow: auto; padding: 32px; }
  #doc-slot .empty { margin: 0 0 16px; color: var(--ink-2); font-size: 13px; }
  #doc-slot .diagram svg { max-width: 100%; height: auto; }
  #fallback { position: absolute; inset: 0; overflow: auto; padding: 24px 28px; }
  #empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; color: var(--ink-2); font-size: 13px; }
  #fallback .fallback-note { margin: 0 0 4px; color: var(--ink-2); font-size: 13px; }
  #fallback .fallback-stats { margin: 0 0 24px; font-family: var(--f-mono); font-size: 11px; color: var(--ink-3); }
  .index-group { margin: 0 0 24px; }
  .index-group h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-2); }

  #legend { position: absolute; left: 14px; bottom: 14px; max-width: 300px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: rgba(15, 17, 22, 0.92); }
  .legend-title { margin-bottom: 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-3); }
  .legend-items { display: flex; flex-wrap: wrap; gap: 4px 12px; }
  .legend-item { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--ink-2); }
  .legend-note { margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--line); font-size: 11px; color: var(--ink-3); }

  #panel { flex: none; width: min(540px, 42vw); min-width: 300px; overflow: auto; padding: 24px 24px 48px; border-left: 1px solid var(--line); background: var(--bg-2); }
  #panel h2 { margin: 16px 0 8px; font-size: 19px; font-weight: 600; letter-spacing: -0.025em; }
  #panel h3 { margin: 24px 0 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-3); }
  .hint { margin: 8px 0; color: var(--ink-2); font-size: 12.5px; }
  .panel-head h2 { margin: 0 0 4px; }
  .node-list { display: flex; flex-direction: column; gap: 2px; margin-top: 8px; }
  .node-row { display: flex; flex-direction: column; gap: 3px; padding: 9px 10px; border-radius: 8px; transition: background-color 160ms cubic-bezier(0.16, 1, 0.3, 1); }
  .node-row:hover { background: var(--bg-3); }
  .node-item { display: flex; align-items: center; gap: 8px; text-align: left; }
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
  .doc-body p { margin: 0 0 12px; }
  .doc-body h2 { margin: 24px 0 8px; font-size: 15px; color: var(--ink); }
  .doc-body h3 { margin: 24px 0 8px; font-size: 13px; text-transform: none; letter-spacing: 0; color: var(--ink); }
  .doc-body strong { color: var(--ink); }
  .doc-body code { padding: 1px 5px; border-radius: 4px; background: var(--bg-3); font-family: var(--f-mono); font-size: 11.5px; color: #d8d4cc; }
  .doc-body ul { margin: 0 0 12px; padding-left: 18px; }
  .doc-body li { margin-bottom: 4px; }
  .doc-body a { color: var(--accent); }
  .code { max-width: 100%; margin: 0 0 16px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); overflow: auto; font-family: var(--f-mono); font-size: 11.5px; line-height: 1.6; color: #d8d4cc; }

  @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
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
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.4l1.7 4.3 4.3 1.7-4.3 1.7L8 13.4 6.3 9.1 2 7.4l4.3-1.7z" fill="none" stroke="var(--accent)" stroke-width="1.3" stroke-linejoin="round"/></svg>
      SuperSkill
    </span>
    <nav id="nav" aria-label="Views">
      <button type="button" data-qa="nav" data-view="graph">Graph</button>
      <button type="button" data-qa="nav" data-view="hla">HLA</button>
      <button type="button" data-qa="nav" data-view="lla">LLA</button>
      <button type="button" data-qa="nav" data-view="erd">ERD</button>
      <button type="button" data-qa="nav" data-view="modules">Modules</button>
    </nav>
    <span class="kbd-hint" aria-hidden="true">g h l e m · / search · esc back</span>
  </header>
  <div id="app">
    <main id="stage">
      <div id="stage-head">
        <div>
          <h1 id="title"></h1>
          <p id="sub"></p>
        </div>
        <div id="stage-actions">
          <span id="stats" aria-live="polite"></span>
          <button type="button" id="fit" class="btn">Fit</button>
          <button type="button" id="reset" class="btn">Reset</button>
          <button type="button" id="back" class="btn">Back</button>
        </div>
      </div>
      <div id="toolbar">
        <label id="search-wrap" for="search">
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10.6 10.6L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          <input id="search" type="search" placeholder="Search nodes by name" autocomplete="off" spellcheck="false"/>
        </label>
        <div id="chips" role="group" aria-label="Filter by type"></div>
      </div>
      <div id="canvas-wrap">
        <div id="graph"></div>
        <div id="doc-slot" hidden></div>
        <div id="fallback" hidden></div>
        <div id="empty" hidden>No nodes match the current search or filters.</div>
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

function mermaidFromDoc(body: string): string {
  const m = body.match(/```mermaid\s*([\s\S]*?)```/);
  return m ? m[1].trim() : "";
}

function meaningfulMermaid(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return "";
  if (/^flowchart\s+(TB|TD|BT|LR|RL)$/i.test(trimmed)) return "";
  return trimmed;
}

export function renderArchitectureDiagramsHtml(model: VizModel): string {
  const rootTitle = model.graphs.root?.title ?? "SuperSkill";
  const blocks = [
    ["01", "High-level architecture", "Orchestrator, vault, index, router, and the specialist packs.", meaningfulMermaid(mermaidFromDoc(model.docs["diag:high"]?.body ?? ""))],
    ["02", "Low-level architecture", "Module dependencies inside the implementation.", meaningfulMermaid(mermaidFromDoc(model.docs["diag:low"]?.body ?? mermaidFlowchart(model.graphs.impl ?? { nodes: [], edges: [], title: "", subtitle: "" })))],
    ["03", "Data model (ERD)", "Notes, links, projects, skills, and sessions.", meaningfulMermaid(mermaidFromDoc(model.docs["diag:erd"]?.body ?? ""))],
  ] as const;
  const sections = blocks
    .map(
      ([index, title, lede, code]) => `
  <section class="diagram-section">
    <div class="section-head">
      <span class="section-index" aria-hidden="true">${index}</span>
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p class="section-lede">${escapeHtml(lede)}</p>
      </div>
    </div>
    ${
      code
        ? `<div class="diagram"><pre class="mermaid">${escapeHtml(code)}</pre></div>`
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
  <p class="eyebrow">SuperSkill · Architecture</p>
  <h1>Architecture diagrams</h1>
  <p class="lede">High-level, low-level, and data-model views for ${escapeHtml(rootTitle)}. Rendered from the markdown stored in this vault.</p>
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

export function writeKnowledgeGraphHtml(vaultRoot: string, slug: string): string {
  return writeKnowledgeGraphFiles(vaultRoot, slug).html;
}

function generatedNote(inner: string): string {
  return `---\ntype: architecture\n---\n\n${GENERATED_MARKER}\n\n${inner}\n`;
}

function withHeading(title: string, body: string): string {
  const trimmed = body.trim();
  return trimmed.startsWith("#") ? trimmed : `# ${title}\n\n${trimmed}`;
}

function writeGeneratedNote(abs: string, content: string): boolean {
  let existing: string | null = null;
  try {
    existing = readFileSync(abs, "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`[knowledge-viz] keeping ${abs}: ${code ?? String(err)}`);
      return false;
    }
  }
  if (existing !== null && !existing.includes(GENERATED_MARKER)) return false;
  writeFileSync(abs, content, "utf-8");
  return true;
}

export function writeKnowledgeGraphFiles(
  vaultRoot: string,
  slug: string,
  opts?: { codeRoot?: string },
): { html: string; canvas: string; diagrams: string; nodes: number; edges: number; kept: string[] } {
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
  const highRel = `projects/${slug}/architecture/high-level-architecture.md`;
  const lowRel = `projects/${slug}/architecture/low-level-architecture.md`;
  const erdRel = `projects/${slug}/architecture/data-model-erd.md`;
  const notes: Array<{ rel: string; abs: string; content: string }> = [
    {
      rel: highRel,
      abs: join(archDir, "high-level-architecture.md"),
      content: generatedNote(
        withHeading(model.docs["diag:high"]?.title ?? "High-level architecture", model.docs["diag:high"]?.body ?? ""),
      ),
    },
    {
      rel: lowRel,
      abs: join(archDir, "low-level-architecture.md"),
      content: generatedNote(
        withHeading(model.docs["diag:low"]?.title ?? "Low-level architecture", model.docs["diag:low"]?.body ?? `# Low-level architecture\n`),
      ),
    },
    {
      rel: erdRel,
      abs: join(archDir, "data-model-erd.md"),
      content: generatedNote(
        withHeading(model.docs["diag:erd"]?.title ?? "Data model (ERD)", model.docs["diag:erd"]?.body ?? ""),
      ),
    },
  ];
  const kept: string[] = [];
  for (const note of notes) {
    if (!writeGeneratedNote(note.abs, note.content)) kept.push(note.rel);
  }
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
  return { html: htmlRel, canvas: canvasRel, diagrams: diagramsRel, nodes: root.nodes.length, edges: root.edges.length, kept };
}
