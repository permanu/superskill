// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from "vitest";
import { createRegistry } from "./registry.js";
import { readMcpToolPolicy } from "./tool-policy.js";
import type { CommandContext } from "./types.js";

describe("host MCP tool policy", () => {
  it("denies before validation, argument adaptation or side effects", async () => {
    const registry = createRegistry(["read"]);
    const handler = vi.fn();
    const adapter = vi.fn();
    registry.get("skill_install")!.handler = handler;
    registry.get("skill_install")!.adaptArgs = adapter;
    await expect(registry.execute("skill_install", { source: "owner/repo" }, {} as CommandContext)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    expect(() => registry.validate("write", { path: "x", content: "x" })).toThrow("Tool denied");
    expect(handler).not.toHaveBeenCalled();
    expect(adapter).not.toHaveBeenCalled();
    expect(registry.getToolDefinitions().map(tool => tool.name)).toEqual(["read"]);
  });
  it("copies host policy and treats an empty list as deny-all", () => {
    const allowed = ["read"];
    const registry = createRegistry(allowed);
    allowed.push("write");
    expect(() => registry.assertAllowed("write")).toThrow("Tool denied");
    expect(createRegistry([]).getToolDefinitions()).toEqual([]);
    expect(readMcpToolPolicy('["read","read"]')).toEqual(["read"]);
  });
  it.each(["", "bad", "{}", "null", '["read",42]', '["*"]'])("refuses malformed policies without echoing their values", input => {
    expect(() => readMcpToolPolicy(input)).toThrow("must be a JSON array");
  });
});
