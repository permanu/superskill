// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { externalNodeId, moduleNodeId } from "./common.js";
import { hasEdge, nodeByName } from "../__fixtures__/graph-helpers.js";
import { extractFixture } from "../__fixtures__/paths.js";

describe("swift extractor", () => {
  it("extracts classes, protocols, methods, functions and properties", async () => {
    const result = await extractFixture("swift", "Reporter.swift");
    const reporter = nodeByName(result, "Reporter", "class");
    const formatter = nodeByName(result, "Formatter", "interface");
    const report = nodeByName(result, "report", "method");
    const format = nodeByName(result, "format", "method");
    const normalize = nodeByName(result, "normalize", "function");
    expect(reporter).toBeDefined();
    expect(formatter).toBeDefined();
    expect(report).toBeDefined();
    expect(format).toBeDefined();
    expect(normalize).toBeDefined();
    expect(hasEdge(result, reporter!.id, report!.id, "defines", "EXTRACTED")).toBe(true);
    expect(nodeByName(result, "defaultLevel", "const")?.exported).toBe(true);
  });

  it("records imports and inheritance references", async () => {
    const result = await extractFixture("swift", "Reporter.swift");
    expect(hasEdge(result, moduleNodeId("Reporter.swift"), externalNodeId("Foundation", "Foundation"), "imports", "EXTRACTED")).toBe(true);
    const reporter = nodeByName(result, "Reporter", "class")!;
    const formatter = nodeByName(result, "Formatter", "interface")!;
    expect(hasEdge(result, reporter.id, formatter.id, "references", "INFERRED")).toBe(true);
  });

  it("resolves unqualified method calls to the enclosing class as INFERRED", async () => {
    const result = await extractFixture("swift", "Reporter.swift");
    const report = nodeByName(result, "report", "method")!;
    const format = nodeByName(result, "format", "method")!;
    expect(hasEdge(result, report.id, format.id, "calls", "INFERRED")).toBe(true);
  });
});

describe("java extractor", () => {
  it("extracts classes, methods, constructors and fields", async () => {
    const result = await extractFixture("java", "Reporter.java");
    const reporter = nodeByName(result, "Reporter", "class");
    const report = nodeByName(result, "report", "method");
    const format = nodeByName(result, "format", "method");
    const count = nodeByName(result, "count", "const");
    expect(reporter).toBeDefined();
    expect(report).toBeDefined();
    expect(format).toBeDefined();
    expect(count).toBeDefined();
    expect(nodeByName(result, "Reporter", "method")).toBeDefined();
    expect(hasEdge(result, reporter!.id, report!.id, "defines", "EXTRACTED")).toBe(true);
  });

  it("separates class imports from static member imports and records calls", async () => {
    const result = await extractFixture("java", "Reporter.java");
    const module = moduleNodeId("Reporter.java");
    expect(hasEdge(result, module, externalNodeId("java.util.List", "List"), "imports", "EXTRACTED")).toBe(true);
    expect(
      hasEdge(result, module, externalNodeId("com.example.app.Util", "Util"), "imports", "EXTRACTED"),
    ).toBe(true);
    const report = nodeByName(result, "report", "method")!;
    expect(
      hasEdge(result, report.id, externalNodeId("com.example.app.Util", "Util"), "calls", "INFERRED"),
    ).toBe(true);
  });
});

describe("c extractor", () => {
  it("extracts structs, functions and includes", async () => {
    const result = await extractFixture("c", "reporter.c");
    const struct = nodeByName(result, "reporter", "class");
    const format = nodeByName(result, "format_message", "function");
    const report = nodeByName(result, "report_message", "function");
    const module = moduleNodeId("reporter.c");
    expect(struct).toBeDefined();
    expect(format).toBeDefined();
    expect(report).toBeDefined();
    expect(hasEdge(result, module, externalNodeId("<stdio.h>", "*"), "imports", "EXTRACTED")).toBe(true);
    expect(hasEdge(result, module, externalNodeId("util.h", "*"), "imports", "EXTRACTED")).toBe(true);
  });

  it("resolves local calls and tag references as INFERRED", async () => {
    const result = await extractFixture("c", "reporter.c");
    const report = nodeByName(result, "report_message", "function")!;
    const format = nodeByName(result, "format_message", "function")!;
    const struct = nodeByName(result, "reporter", "class")!;
    expect(hasEdge(result, report.id, format.id, "calls", "INFERRED")).toBe(true);
    expect(hasEdge(result, report.id, struct.id, "references", "INFERRED")).toBe(true);
    const header = await extractFixture("c", "util.h");
    expect(nodeByName(header, "normalize_text", "function")).toBeDefined();
  });
});

describe("cpp extractor", () => {
  it("extracts namespaces, classes, methods and includes", async () => {
    const result = await extractFixture("cpp", "reporter.cpp");
    const namespace = nodeByName(result, "app", "class");
    const reporter = nodeByName(result, "Reporter", "class");
    const report = nodeByName(result, "report", "method");
    const format = nodeByName(result, "format", "method");
    const module = moduleNodeId("reporter.cpp");
    expect(namespace).toBeDefined();
    expect(reporter).toBeDefined();
    expect(report).toBeDefined();
    expect(format).toBeDefined();
    expect(hasEdge(result, namespace!.id, reporter!.id, "defines", "EXTRACTED")).toBe(true);
    expect(hasEdge(result, module, externalNodeId("<string>", "*"), "imports", "EXTRACTED")).toBe(true);
    expect(hasEdge(result, module, externalNodeId("util.hpp", "*"), "imports", "EXTRACTED")).toBe(true);
  });

  it("resolves method calls and keeps free functions in headers", async () => {
    const result = await extractFixture("cpp", "reporter.cpp");
    const report = nodeByName(result, "report", "method")!;
    const format = nodeByName(result, "format", "method")!;
    expect(hasEdge(result, report.id, format.id, "calls", "INFERRED")).toBe(true);
    const header = await extractFixture("cpp", "util.hpp");
    expect(nodeByName(header, "normalize", "function")).toBeDefined();
  });
});
