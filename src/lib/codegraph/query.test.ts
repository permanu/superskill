// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from "vitest";
import { fixturePath } from "./__fixtures__/paths.js";
import { CodeGraphQuery } from "./query.js";
import { scanRepo } from "./scan.js";
import { CodeGraphStore } from "./store.js";
import { moduleNodeId } from "./extractors/common.js";
import type { CodeGraph } from "./types.js";

let graph: CodeGraph;
let query: CodeGraphQuery;

beforeAll(async () => {
  graph = (await scanRepo(fixturePath("typescript"))).graph;
  query = new CodeGraphQuery(new CodeGraphStore(graph));
});

describe("CodeGraphQuery", () => {
  it("finds nodes by id or by name", () => {
    expect(query.findNode("file:src/parse.ts")?.kind).toBe("module");
    expect(query.findNode("Reporter")?.kind).toBe("class");
    expect(query.findNode("missing-node")).toBeNull();
    expect(query.findNodes("format").map((node) => node.kind)).toEqual(["function"]);
  });

  it("lists definitions in a file sorted by line", () => {
    const defs = query.defsIn("src/parse.ts");
    const names = defs.map((node) => node.name);
    expect(names).toEqual(expect.arrayContaining(["Level", "DEFAULT_LEVEL", "Reporter", "report", "format"]));
    for (let i = 1; i < defs.length; i += 1) {
      expect(defs[i].span.startLine).toBeGreaterThanOrEqual(defs[i - 1].span.startLine);
    }
    expect(defs.every((node) => node.kind !== "module")).toBe(true);
    expect(query.defsInExtracted("src/parse.ts").length).toBe(defs.length);
  });

  it("finds importers of a file using INFERRED cross-file edges", () => {
    const importers = query.importersOf("src/util.ts");
    expect(importers.map((node) => node.id)).toContain(moduleNodeId("src/parse.ts"));
    expect(query.importersOfExtracted("src/util.ts")).toHaveLength(0);
  });

  it("returns outgoing and incoming neighbors with filters", () => {
    const module = moduleNodeId("src/parse.ts");
    const resolved = query.neighbors(module, { direction: "out", kinds: ["imports"], confidence: "INFERRED" });
    expect(resolved.map((entry) => entry.node?.id)).toContain(moduleNodeId("src/util.ts"));
    const extracted = query.neighborsExtracted(module, { direction: "out", kinds: ["imports"] });
    expect(extracted.map((entry) => entry.node?.id)).toContain("ext:./util.js#normalize");
    const incoming = query.neighbors(moduleNodeId("src/util.ts"), { direction: "in", kinds: ["imports"] });
    expect(incoming.map((entry) => entry.node?.id)).toContain(module);
  });

  it("finds a shortest path over INFERRED edges and not over EXTRACTED-only", () => {
    const reporter = query.findNode("Reporter")!;
    const normalize = query.findNode("normalize")!;
    const path = query.shortestPath(reporter.id, normalize.id);
    expect(path).not.toBeNull();
    expect(path![0]).toBe(reporter.id);
    expect(path![path!.length - 1]).toBe(normalize.id);
    expect(path!.length).toBe(4);
    expect(query.shortestPathExtracted(reporter.id, normalize.id)).toBeNull();
    const extractedPath = query.shortestPathExtracted(moduleNodeId("src/parse.ts"), reporter.id);
    expect(extractedPath).toEqual([moduleNodeId("src/parse.ts"), reporter.id]);
  });

  it("lists the external imports of a file", () => {
    const external = query.externalImportsOf("src/parse.ts");
    expect(external.map((node) => node.name)).toEqual(["./types.js", "./util.js"]);
  });
});
