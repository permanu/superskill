// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { externalNodeId, moduleNodeId } from "./common.js";
import { hasEdge, nodeByName } from "../__fixtures__/graph-helpers.js";
import { extractFixture } from "../__fixtures__/paths.js";

const FILE = "app.py";
const MODULE = moduleNodeId(FILE);

describe("python extractor", () => {
  it("extracts classes, methods, functions and module constants", async () => {
    const result = await extractFixture("python", FILE);
    const reporter = nodeByName(result, "Reporter", "class");
    const init = nodeByName(result, "__init__", "method");
    const report = nodeByName(result, "report", "method");
    const format = nodeByName(result, "format", "function");
    const flush = nodeByName(result, "flush", "function");
    const max = nodeByName(result, "MAX", "const");
    expect(reporter).toBeDefined();
    expect(init).toBeDefined();
    expect(report).toBeDefined();
    expect(format).toBeDefined();
    expect(flush).toBeDefined();
    expect(max).toBeDefined();
    expect(hasEdge(result, reporter!.id, init!.id, "defines", "EXTRACTED")).toBe(true);
    expect(hasEdge(result, reporter!.id, report!.id, "defines", "EXTRACTED")).toBe(true);
    expect(hasEdge(result, MODULE, format!.id, "defines", "EXTRACTED")).toBe(true);
  });

  it("records absolute and relative imports as EXTRACTED import-source edges", async () => {
    const result = await extractFixture("python", FILE);
    expect(hasEdge(result, MODULE, externalNodeId("os", "os"), "imports", "EXTRACTED")).toBe(true);
    expect(hasEdge(result, MODULE, externalNodeId(".util", "normalise"), "imports", "EXTRACTED")).toBe(true);
    expect(hasEdge(result, MODULE, externalNodeId(".util", "DEFAULT"), "imports", "EXTRACTED")).toBe(true);
  });

  it("resolves same-file calls as INFERRED and imported calls as placeholders", async () => {
    const result = await extractFixture("python", FILE);
    const flush = nodeByName(result, "flush", "function")!;
    const format = nodeByName(result, "format", "function")!;
    const report = nodeByName(result, "report", "method")!;
    expect(hasEdge(result, flush.id, format.id, "calls", "INFERRED")).toBe(true);
    expect(hasEdge(result, report.id, externalNodeId(".util", "normalise"), "calls", "INFERRED")).toBe(true);
    expect(hasEdge(result, format.id, externalNodeId(".util", "normalise"), "calls", "INFERRED")).toBe(true);
  });

  it("does not emit exports without an explicit __all__", async () => {
    const result = await extractFixture("python", FILE);
    expect(result.edges.filter((edge) => edge.kind === "exports")).toHaveLength(0);
  });

  it("emits exports for names listed in __all__", async () => {
    const result = await extractFixture("python", "util.py");
    const normalise = nodeByName(result, "normalise", "function")!;
    expect(hasEdge(result, moduleNodeId("util.py"), normalise.id, "exports", "EXTRACTED")).toBe(true);
    const helper = nodeByName(result, "Helper", "class")!;
    expect(result.edges.some((edge) => edge.kind === "exports" && edge.to === helper.id)).toBe(false);
  });
});
