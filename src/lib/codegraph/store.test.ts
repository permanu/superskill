// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { CodeGraphStore, edgeKey, mergeGraphs } from "./store.js";
import type { CodeEdge, CodeGraph, CodeNode } from "./types.js";

const nodeA: CodeNode = {
  id: "file:a.ts",
  kind: "module",
  name: "a.ts",
  file: "a.ts",
  language: "typescript",
  span: { startLine: 1, endLine: 3 },
};

const nodeB: CodeNode = {
  id: "sym:a.ts#run@1",
  kind: "function",
  name: "run",
  file: "a.ts",
  language: "typescript",
  span: { startLine: 1, endLine: 3 },
};

const edge: CodeEdge = {
  from: "file:a.ts",
  to: "sym:a.ts#run@1",
  kind: "defines",
  confidence: "EXTRACTED",
  file: "a.ts",
  span: { startLine: 1, endLine: 1 },
};

describe("CodeGraphStore", () => {
  it("dedupes nodes by id and edges by key", () => {
    const store = new CodeGraphStore();
    store.addNode(nodeA);
    store.addNode({ ...nodeA, span: { startLine: 9, endLine: 9 } });
    store.addEdge(edge);
    store.addEdge({ ...edge, span: { startLine: 2, endLine: 2 } });
    expect(store.nodeCount()).toBe(1);
    expect(store.edgeCount()).toBe(1);
    expect(store.stats().nodesByKind.module).toBe(1);
  });

  it("serializes and deserializes without loss", () => {
    const store = new CodeGraphStore();
    store.root = "/repo";
    store.addNode(nodeA);
    store.addNode(nodeB);
    store.addEdge(edge);
    const json = JSON.stringify(store.toJSON());
    const restored = CodeGraphStore.fromJSON(json);
    expect(restored.toJSON()).toEqual(store.toJSON());
    expect(restored.root).toBe("/repo");
    expect(restored.stats()).toEqual(store.stats());
  });

  it("merges graphs and dedupes shared keys", () => {
    const graphOne: CodeGraph = {
      root: "/repo",
      languages: ["typescript"],
      nodes: [nodeA, nodeB],
      edges: [edge],
    };
    const graphTwo: CodeGraph = {
      root: "/repo",
      languages: ["typescript"],
      nodes: [nodeA, { ...nodeB, id: "sym:a.ts#other@2", name: "other", span: { startLine: 2, endLine: 2 } }],
      edges: [edge, { ...edge, confidence: "INFERRED" }],
    };
    const merged = mergeGraphs(graphOne, graphTwo);
    expect(merged.nodeCount()).toBe(3);
    expect(merged.edgeCount()).toBe(2);
    expect(merged.languages()).toEqual(["typescript"]);
  });

  it("builds stable edge keys", () => {
    const otherFile: CodeEdge = { ...edge, file: "other.ts" };
    const inferred: CodeEdge = { ...edge, confidence: "INFERRED" };
    expect(edgeKey(edge)).toBe(edgeKey(otherFile));
    expect(edgeKey(edge)).not.toBe(edgeKey(inferred));
  });

  it("counts stats by kind and confidence", () => {
    const store = new CodeGraphStore();
    store.addGraph({
      root: "/repo",
      languages: ["typescript"],
      nodes: [nodeA, nodeB],
      edges: [edge, { ...edge, kind: "calls", confidence: "INFERRED", to: "sym:other#x@9" }],
    });
    const stats = store.stats({ parseErrors: 1, filesSkipped: 2 });
    expect(stats.files).toBe(1);
    expect(stats.nodes).toBe(2);
    expect(stats.edges).toBe(2);
    expect(stats.edgesByKind).toEqual({ defines: 1, imports: 0, exports: 0, references: 0, calls: 1 });
    expect(stats.edgesByConfidence).toEqual({ EXTRACTED: 1, INFERRED: 1 });
    expect(stats.parseErrors).toBe(1);
    expect(stats.filesSkipped).toBe(2);
  });
});
