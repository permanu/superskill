import { describe, expect, it } from "vitest";
import { GRAPH_SCHEMA_VERSION, validateGraph } from "./schema.js";

function legacyGraph() {
  return {
    nodes: [
      { type: "project", id: "project", stack: ["ts"], tools: [], phase: "explore", ts: 1 },
      { type: "skill", id: "a", source: "routed", audits: { gen: "pass", socket: "unknown", snyk: "warn" }, installs: 0, stars: 0, w: 0.5, ts: 1 },
      { type: "skill", id: "b", source: "native", audits: { gen: "pass", socket: "unknown", snyk: "warn" }, installs: 0, stars: 0, w: 0.5, ts: 1 },
    ],
    edges: [{ type: "project_skill", from: "project", to: "a", w: 0.5, activations: 0 }],
  };
}

describe("graph validation and migrations", () => {
  it.each([undefined, 1, 2, 3])("preserves historical version %s fields without inventing activation history", (version) => {
    const input = { ...legacyGraph(), ...(version ? { version } : {}), catalogVersion: "catalog-v1", extension: { retained: true } };
    expect(validateGraph(input)).toEqual({ ...input, version: GRAPH_SCHEMA_VERSION });
    expect(validateGraph(input).nodes[1]).not.toHaveProperty("lastUsed");
  });

  it.each([0, -1, GRAPH_SCHEMA_VERSION + 1])("rejects unsupported version %s", (version) => {
    expect(() => validateGraph({ ...legacyGraph(), version })).toThrow(/Unsupported graph schema version/);
  });

  it.each([null, [], {}, { nodes: [], edges: null }, { nodes: [null], edges: [] }])("rejects malformed graph structure %s", (input) => {
    expect(() => validateGraph(input)).toThrow(/Invalid graph/);
  });

  it.each([NaN, Infinity, -0.1, 1.1, "0.5", null])("rejects invalid node weight %s", (w) => {
    const input = legacyGraph();
    Object.assign(input.nodes[1], { w });
    expect(() => validateGraph(input)).toThrow(/Invalid graph/);
  });

  it("validates discriminated node and edge fields and endpoint types", () => {
    for (const patch of [{ source: "external" }, { audits: { gen: "pass" } }, { triggers: [null] }, { ts: Infinity }]) {
      const input = legacyGraph();
      Object.assign(input.nodes[1], patch);
      expect(() => validateGraph(input)).toThrow(/Invalid graph/);
    }
    for (const patch of [{ type: "other" }, { w: NaN }, { activations: -1 }, { to: "missing" }, { from: "a" }]) {
      const input = legacyGraph();
      Object.assign(input.edges[0], patch);
      expect(() => validateGraph(input)).toThrow(/Invalid graph/);
    }
  });

  it("normalizes historical reversed co-activation duplicates without double counting", () => {
    const input = legacyGraph();
    const edges = [
      ...input.edges,
      { type: "skill_skill", from: "b", to: "a", w: 0.3, co_activations: 2 },
      { type: "skill_skill", from: "a", to: "b", w: 0.4, co_activations: 3 },
    ];
    expect(validateGraph({ ...input, edges }).edges.filter(edge => edge.type === "skill_skill")).toEqual([
      { type: "skill_skill", from: "a", to: "b", w: 0.4, co_activations: 3 },
    ]);
  });
});
