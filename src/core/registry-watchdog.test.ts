// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { createRegistry } from "./registry.js";

describe("watchdog registration", () => {
  const registry = createRegistry();

  it("is registered with dig/fix/status and destructive hint", () => {
    const reg = registry.get("watchdog");
    expect(reg).toBeDefined();
    expect(reg!.toolDef.annotations?.destructiveHint).toBe(true);
    expect(reg!.toolDef.description).toMatch(/session review/i);
    expect(reg!.toolDef.description).toMatch(/quarantined/i);
    expect(registry.getToolNames()).toContain("watchdog");
  });

  it("adapts MCP args", () => {
    const reg = registry.get("watchdog")!;
    expect(reg.adaptArgs!({ action: "dig", scope: "window", since: "7d", count: 5 })).toEqual({
      action: "dig",
      scope: "window",
      sessionId: undefined,
      tool: undefined,
      since: "7d",
      count: 5,
      project: undefined,
      allProjects: false,
      persist: undefined,
      findingIds: undefined,
      categories: undefined,
      dismiss: false,
      apply: false,
      reportPath: undefined,
    });
    expect(reg.adaptArgs!({ action: "fix", apply: true, finding_ids: ["f_1"], persist: false })).toMatchObject({
      action: "fix",
      apply: true,
      findingIds: ["f_1"],
      persist: false,
    });
  });
});
