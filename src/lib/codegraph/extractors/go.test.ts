// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { externalNodeId, moduleNodeId } from "./common.js";
import { hasEdge, nodeByName } from "../__fixtures__/graph-helpers.js";
import { extractFixture } from "../__fixtures__/paths.js";

const FILE = "main.go";
const MODULE = moduleNodeId(FILE);

describe("go extractor", () => {
  it("extracts interfaces, structs, methods and functions", async () => {
    const result = await extractFixture("go", FILE);
    const formatter = nodeByName(result, "Formatter", "interface");
    const reporter = nodeByName(result, "Reporter", "class");
    const report = nodeByName(result, "Report", "method");
    const format = nodeByName(result, "Format", "function");
    const main = nodeByName(result, "main", "function");
    expect(formatter).toBeDefined();
    expect(reporter).toBeDefined();
    expect(report).toBeDefined();
    expect(format).toBeDefined();
    expect(main).toBeDefined();
    expect(hasEdge(result, MODULE, formatter!.id, "defines", "EXTRACTED")).toBe(true);
    expect(hasEdge(result, reporter!.id, report!.id, "defines", "EXTRACTED")).toBe(true);
  });

  it("marks exported identifiers and records imports", async () => {
    const result = await extractFixture("go", FILE);
    expect(nodeByName(result, "Format", "function")?.exported).toBe(true);
    expect(nodeByName(result, "main", "function")?.exported).toBeFalsy();
    expect(hasEdge(result, MODULE, externalNodeId("fmt", "fmt"), "imports", "EXTRACTED")).toBe(true);
    expect(
      hasEdge(result, MODULE, externalNodeId("example.com/proj/util", "util"), "imports", "EXTRACTED"),
    ).toBe(true);
  });

  it("resolves receiver type references and local calls as INFERRED", async () => {
    const result = await extractFixture("go", FILE);
    const report = nodeByName(result, "Report", "method")!;
    const reporter = nodeByName(result, "Reporter", "class")!;
    const format = nodeByName(result, "Format", "function")!;
    expect(hasEdge(result, report.id, reporter.id, "references", "INFERRED")).toBe(true);
    expect(hasEdge(result, report.id, format.id, "calls", "INFERRED")).toBe(true);
  });

  it("keeps qualified calls on package imports as INFERRED placeholders", async () => {
    const result = await extractFixture("go", FILE);
    const format = nodeByName(result, "Format", "function")!;
    expect(
      hasEdge(result, format.id, externalNodeId("example.com/proj/util", "util"), "calls", "INFERRED"),
    ).toBe(true);
    const util = await extractFixture("go", "util/util.go");
    expect(nodeByName(util, "DefaultLevel", "const")?.exported).toBe(true);
    expect(nodeByName(util, "Scorer", "class")?.exported).toBe(true);
  });
});
