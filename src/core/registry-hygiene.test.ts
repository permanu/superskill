// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { createRegistry } from "./registry.js";

describe("hygiene_report registration", () => {
  const registry = createRegistry();

  it("is registered read-only with a descriptive tool definition", () => {
    const reg = registry.get("hygiene_report");
    expect(reg).toBeDefined();
    expect(reg!.toolDef.annotations).toEqual({ readOnlyHint: true });
    expect(reg!.toolDef.description.length).toBeGreaterThan(40);
    expect(reg!.toolDef.description).toMatch(/deletes nothing/i);
    expect(registry.getToolNames()).toContain("hygiene_report");
  });

  it("adapts MCP args", () => {
    const reg = registry.get("hygiene_report")!;
    expect(reg.adaptArgs!({})).toEqual({ sizes: false, categories: undefined });
    expect(reg.adaptArgs!({ sizes: true, categories: ["docker"] })).toEqual({
      sizes: true,
      categories: ["docker"],
    });
    expect(reg.adaptArgs!({ categories: "docker" })).toEqual({ sizes: false, categories: undefined });
  });
});
