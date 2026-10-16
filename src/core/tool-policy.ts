// SPDX-License-Identifier: Apache-2.0
export function readMcpToolPolicy(value = process.env.SUPERSKILL_MCP_ALLOWED_TOOLS): readonly string[] | undefined {
  if (value === undefined) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length > 256 || !parsed.every(name => typeof name === "string" && /^[a-z][a-z0-9_]{0,79}$/.test(name))) throw new Error();
    return [...new Set(parsed)];
  } catch {
    throw new Error("SUPERSKILL_MCP_ALLOWED_TOOLS must be a JSON array of tool names; [] denies all tools");
  }
}
