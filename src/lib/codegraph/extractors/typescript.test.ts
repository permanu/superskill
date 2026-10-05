// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { externalNodeId, moduleNodeId } from "./common.js";
import { edgesOf, hasEdge, nodeByName } from "../__fixtures__/graph-helpers.js";
import { extractFixture } from "../__fixtures__/paths.js";

const FILE = "src/parse.ts";
const MODULE = moduleNodeId(FILE);

describe("typescript extractor", () => {
  it("extracts definitions as EXTRACTED defines edges", async () => {
    const result = await extractFixture("typescript", FILE);
    const reporter = nodeByName(result, "Reporter", "class");
    const format = nodeByName(result, "format", "function");
    const level = nodeByName(result, "Level", "type");
    const constant = nodeByName(result, "DEFAULT_LEVEL", "const");
    const report = nodeByName(result, "report", "method");
    expect(reporter).toBeDefined();
    expect(format).toBeDefined();
    expect(level).toBeDefined();
    expect(constant).toBeDefined();
    expect(report).toBeDefined();
    expect(hasEdge(result, MODULE, reporter!.id, "defines", "EXTRACTED")).toBe(true);
    expect(hasEdge(result, reporter!.id, report!.id, "defines", "EXTRACTED")).toBe(true);
    expect(hasEdge(result, MODULE, format!.id, "defines", "EXTRACTED")).toBe(true);
    expect(hasEdge(result, MODULE, level!.id, "defines", "EXTRACTED")).toBe(true);
    expect(hasEdge(result, MODULE, constant!.id, "defines", "EXTRACTED")).toBe(true);
  });

  it("records imports as EXTRACTED module -> import-source edges", async () => {
    const result = await extractFixture("typescript", FILE);
    expect(hasEdge(result, MODULE, externalNodeId("./util.js", "normalize"), "imports", "EXTRACTED")).toBe(true);
    expect(hasEdge(result, MODULE, externalNodeId("./types.js", "Options"), "imports", "EXTRACTED")).toBe(true);
    const external = result.nodes.find((node) => node.id === externalNodeId("./util.js", "normalize"));
    expect(external?.kind).toBe("import-source");
    expect(external?.language).toBe("external");
    expect(external?.name).toBe("./util.js");
  });

  it("marks exported symbols with EXTRACTED exports edges", async () => {
    const result = await extractFixture("typescript", FILE);
    for (const name of ["Reporter", "format", "Level", "DEFAULT_LEVEL"]) {
      const symbol = nodeByName(result, name);
      expect(symbol?.exported).toBe(true);
      expect(hasEdge(result, MODULE, symbol!.id, "exports", "EXTRACTED")).toBe(true);
    }
  });

  it("resolves same-file calls to local symbols as INFERRED", async () => {
    const result = await extractFixture("typescript", FILE);
    const report = nodeByName(result, "report", "method")!;
    const format = nodeByName(result, "format", "function")!;
    expect(hasEdge(result, report.id, format.id, "calls", "INFERRED")).toBe(true);
  });

  it("leaves cross-file calls as INFERRED placeholders on the import source", async () => {
    const result = await extractFixture("typescript", FILE);
    const format = nodeByName(result, "format", "function")!;
    expect(
      hasEdge(result, format.id, externalNodeId("./util.js", "normalize"), "calls", "INFERRED"),
    ).toBe(true);
  });

  it("resolves imported type references as INFERRED placeholders", async () => {
    const result = await extractFixture("typescript", FILE);
    const constructor = nodeByName(result, "constructor", "method")!;
    expect(
      hasEdge(result, constructor.id, externalNodeId("./types.js", "Options"), "references", "INFERRED"),
    ).toBe(true);
  });

  it("never labels calls or references EXTRACTED", async () => {
    const result = await extractFixture("typescript", FILE);
    for (const edge of result.edges) {
      if (edge.kind === "calls" || edge.kind === "references") {
        expect(edge.confidence).toBe("INFERRED");
      }
      if (edge.kind === "defines" || edge.kind === "imports" || edge.kind === "exports") {
        expect(edge.confidence).toBe("EXTRACTED");
      }
    }
    expect(edgesOf(result, MODULE, "imports", "EXTRACTED")).toHaveLength(2);
  });
});
