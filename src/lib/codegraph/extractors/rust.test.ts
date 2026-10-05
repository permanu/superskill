// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { externalNodeId, moduleNodeId } from "./common.js";
import { hasEdge, nodeByName } from "../__fixtures__/graph-helpers.js";
import { extractFixture } from "../__fixtures__/paths.js";

const FILE = "lib.rs";
const MODULE = moduleNodeId(FILE);

describe("rust extractor", () => {
  it("extracts traits, structs, impl methods and functions", async () => {
    const result = await extractFixture("rust", FILE);
    const formatter = nodeByName(result, "Formatter", "interface");
    const reporter = nodeByName(result, "Reporter", "class");
    const report = nodeByName(result, "report", "method");
    const format = nodeByName(result, "format", "function");
    const constant = nodeByName(result, "DEFAULT_LEVEL", "const");
    expect(formatter).toBeDefined();
    expect(reporter).toBeDefined();
    expect(report).toBeDefined();
    expect(format).toBeDefined();
    expect(constant).toBeDefined();
    expect(hasEdge(result, reporter!.id, report!.id, "defines", "EXTRACTED")).toBe(true);
    expect(hasEdge(result, MODULE, format!.id, "defines", "EXTRACTED")).toBe(true);
  });

  it("marks pub items as exported", async () => {
    const result = await extractFixture("rust", FILE);
    for (const name of ["Formatter", "Reporter", "DEFAULT_LEVEL"]) {
      expect(nodeByName(result, name)?.exported).toBe(true);
    }
    expect(nodeByName(result, "format", "function")?.exported).toBe(true);
  });

  it("records use declarations as module paths with bindings", async () => {
    const result = await extractFixture("rust", FILE);
    expect(hasEdge(result, MODULE, externalNodeId("crate::util", "normalize"), "imports", "EXTRACTED")).toBe(true);
    expect(
      hasEdge(result, MODULE, externalNodeId("std::collections", "HashMap"), "imports", "EXTRACTED"),
    ).toBe(true);
  });

  it("emits INFERRED placeholders for imported calls", async () => {
    const result = await extractFixture("rust", FILE);
    const report = nodeByName(result, "report", "method")!;
    const format = nodeByName(result, "format", "function")!;
    expect(hasEdge(result, report.id, externalNodeId("crate::util", "normalize"), "calls", "INFERRED")).toBe(true);
    expect(hasEdge(result, format.id, externalNodeId("crate::util", "normalize"), "calls", "INFERRED")).toBe(true);
    expect(
      hasEdge(result, format.id, externalNodeId("std::collections", "HashMap"), "calls", "INFERRED"),
    ).toBe(true);
  });
});
