import { afterEach, expect, it, vi } from "vitest";
import { toolManual, invokeTool } from "./direct.js";

afterEach(() => vi.unstubAllEnvs());

it("discovers callable CLI templates with argument schemas", () => {
  const manual = toolManual();
  const register = manual.tools.find(tool => tool.name === "register")!;
  expect(register.inputs.properties.arguments.contentSchema.properties).toHaveProperty("path");
  expect(register.tool_call_template.commands[0].command).toBe("superskill invoke register --json UTCP_ARG_arguments_UTCP_END");
});

it("rejects invalid arguments before context or mutation", async () => {
  await expect(invokeTool("register", { path: 12 })).rejects.toThrow("must be a string");
  await expect(invokeTool("not-a-tool", {})).rejects.toThrow("Unknown command");
});

it("honors host tool policy for discovery and execution", async () => {
  vi.stubEnv("SUPERSKILL_MCP_ALLOWED_TOOLS", '["register"]');
  expect(toolManual().tools.map(tool => tool.name)).toEqual(["register"]);
  await expect(invokeTool("search", { query: "test" })).rejects.toThrow("Tool denied");
});
