// SPDX-License-Identifier: Apache-2.0
//
// CLI ↔ MCP command-surface parity guardrail.
//
// AGENTS.md promises that every command works through both interfaces, but the
// CLI (src/cli.ts, hand-written commander registrations) and the MCP registry
// (src/core/registry.ts, r.register(...)) are maintained by hand and have
// drifted before. This test builds the parity matrix from the real surfaces:
//
//   - CLI: introspect the commander program built by createProgram()
//   - MCP: createRegistry().getToolDefinitions() (the names the server exposes)
//
// It hard-fails when a command exists on one surface only and is not covered by
// an explicit allowlist below. It also hard-fails when a stale allowlist or
// override entry no longer exists, so the lists cannot silently rot.

import { describe, expect, it } from "vitest";
import type { Command } from "commander";
import { createProgram } from "../cli.js";
import { createRegistry } from "./registry.js";
import type { MCPToolDefinition } from "./types.js";

/**
 * CLI paths whose name does not mechanically normalize to the MCP tool name.
 * Keys are full CLI command paths; values are registry tool names.
 * Every entry is validated both ways (path must exist, tool must exist).
 */
const CLI_TO_MCP_OVERRIDES: Record<string, string> = {
  // `list` is the directory-listing form of the MCP `read` tool (read takes depth).
  list: "read",
  // `append` is write with mode=append.
  append: "write",
  // MCP tool names that intentionally differ from the CLI command names.
  context: "project_context",
  init: "generate_context",
  viz: "knowledge_viz",
  "graph rebuild": "knowledge_rebuild",
  "graph viz": "knowledge_viz",
  // The four traversal verbs share one MCP tool (action=node|children|resolve|open).
  "graph node": "graph_traverse",
  "graph children": "graph_traverse",
  "graph resolve": "graph_traverse",
  "graph open": "graph_traverse",
  hygiene: "hygiene_report",
  "skill init": "init",
  "skill validate": "skill_validate",
  "skill status": "status",
  "skill activate": "superskill",
  "skill list": "skill_list_installed",
  snapshot: "snapshot_repo_state",
  // The CLI verb `list` is the MCP session action `list_active`.
  "session list": "session",
  // `gate` exposes its single action through `gate check <target>` and has no action arg.
  "gate check": "gate",
};

/**
 * CLI-only command paths that intentionally have no MCP tool.
 * Key = full CLI path, value = why it is CLI-only.
 */
const CLI_ONLY_ALLOWLIST: Record<string, string> = {
  onboard: "CLI onboarding; configures local AI clients, no vault command counterpart.",
  setup: "Machine-local client configuration (src/setup); intentionally not an MCP tool.",
  teardown: "Machine-local client deconfiguration (src/setup); intentionally not an MCP tool.",
  upgrade: "Machine-local client upgrade (src/setup); intentionally not an MCP tool.",
  "worktree bootstrap": "Internal post-checkout hook entry point; never exposed over MCP.",
};

/**
 * MCP-only tools that intentionally have no CLI command.
 * Key = registry tool name, value = why it is MCP-only.
 * Currently empty: every registry tool has a CLI wrapper.
 */
const MCP_ONLY_ALLOWLIST: Record<string, string> = {};

function normalize(name: string): string {
  return name.trim().replace(/\s+/g, "_").replace(/-/g, "_");
}

/** Collects every executable (leaf) CLI command as a space-joined path. */
function collectCliLeafPaths(cmd: Command, prefix = ""): string[] {
  const paths: string[] = [];
  for (const sub of cmd.commands) {
    const full = prefix ? `${prefix} ${sub.name()}` : sub.name();
    if (sub.commands.length > 0) {
      paths.push(...collectCliLeafPaths(sub, full));
    } else {
      paths.push(full);
    }
  }
  return paths;
}

/**
 * Resolves a CLI path to an MCP tool name:
 *   1. explicit override, else
 *   2. the full path normalized (graph related -> graph_related), else
 *   3. the top-level group normalized, but only when the subcommand is one of
 *      that tool's registered `action` enum values (task add -> task; task foo -> null).
 */
export function resolveMcpToolName(
  cliPath: string,
  tools: ReadonlyMap<string, MCPToolDefinition>,
): string | null {
  const override = CLI_TO_MCP_OVERRIDES[cliPath];
  if (override !== undefined) return override;
  const direct = normalize(cliPath);
  if (tools.has(direct)) return direct;
  const [group, ...rest] = cliPath.split(" ");
  if (rest.length === 0) return null;
  const groupName = normalize(group);
  const tool = tools.get(groupName);
  if (!tool) return null;
  const properties = tool.inputSchema.properties as Record<string, unknown> | undefined;
  const action = properties?.action as { enum?: unknown[] } | undefined;
  const actions = Array.isArray(action?.enum)
    ? action.enum.filter((value): value is string => typeof value === "string")
    : [];
  return actions.includes(rest.join(" ")) ? groupName : null;
}

describe("CLI <-> MCP command parity", () => {
  const cliPaths = collectCliLeafPaths(createProgram());
  const registry = createRegistry();
  const toolDefs = registry.getToolDefinitions();
  const mcpNames = new Set(toolDefs.map((def) => def.name));
  const toolMap = new Map(toolDefs.map((def) => [def.name, def]));

  function coveredMcpNames(): Set<string> {
    return new Set(
      cliPaths
        .map((path) => resolveMcpToolName(path, toolMap))
        .filter((name): name is string => name !== null),
    );
  }

  it("exposes registry keys and toolDef names identically", () => {
    expect([...mcpNames].sort()).toEqual([...registry.getToolNames()].sort());
  });

  it("maps every CLI command to an MCP tool or a documented CLI-only allowlist entry", () => {
    const undocumented = cliPaths.filter(
      (path) => resolveMcpToolName(path, toolMap) === null && !(path in CLI_ONLY_ALLOWLIST),
    );
    expect(
      undocumented,
      "New CLI-only command(s). Register a matching tool in src/core/registry.ts, or add each path to CLI_ONLY_ALLOWLIST with a reason.",
    ).toEqual([]);
  });

  it("rejects CLI subcommands that are not registered actions of the group tool", () => {
    expect(resolveMcpToolName("task frobnicate", toolMap)).toBeNull();
    expect(resolveMcpToolName("learn ghost", toolMap)).toBeNull();
    expect(resolveMcpToolName("tickets archive", toolMap)).toBeNull();
    expect(resolveMcpToolName("task add", toolMap)).toBe("task");
    expect(resolveMcpToolName("tickets ready", toolMap)).toBe("tickets");
    expect(resolveMcpToolName("session list", toolMap)).toBe("session");
    expect(resolveMcpToolName("session frobnicate", toolMap)).toBeNull();
  });

  it("exposes every MCP tool through a CLI wrapper or a documented MCP-only allowlist entry", () => {
    const covered = coveredMcpNames();
    const undocumented = [...mcpNames].filter(
      (name) => !covered.has(name) && !(name in MCP_ONLY_ALLOWLIST),
    );
    expect(
      undocumented,
      "New MCP-only tool(s). Add a commander wrapper in src/cli.ts, or add each tool to MCP_ONLY_ALLOWLIST with a reason.",
    ).toEqual([]);
  });

  it("keeps the CLI-only allowlist honest", () => {
    for (const [path, reason] of Object.entries(CLI_ONLY_ALLOWLIST)) {
      expect(reason.trim().length, `CLI_ONLY_ALLOWLIST["${path}"] needs a reason`).toBeGreaterThan(0);
      expect(cliPaths, `allowlisted CLI-only command "${path}" no longer exists — remove it from CLI_ONLY_ALLOWLIST`).toContain(path);
      expect(
        resolveMcpToolName(path, toolMap),
        `"${path}" now maps to an MCP tool — remove it from CLI_ONLY_ALLOWLIST`,
      ).toBeNull();
    }
  });

  it("keeps the MCP-only allowlist honest", () => {
    const covered = coveredMcpNames();
    for (const [name, reason] of Object.entries(MCP_ONLY_ALLOWLIST)) {
      expect(reason.trim().length, `MCP_ONLY_ALLOWLIST["${name}"] needs a reason`).toBeGreaterThan(0);
      expect(mcpNames.has(name), `allowlisted MCP-only tool "${name}" no longer exists — remove it from MCP_ONLY_ALLOWLIST`).toBe(true);
      expect(covered.has(name), `"${name}" now has a CLI wrapper — remove it from MCP_ONLY_ALLOWLIST`).toBe(false);
    }
  });

  it("keeps CLI_TO_MCP_OVERRIDES valid", () => {
    for (const [path, tool] of Object.entries(CLI_TO_MCP_OVERRIDES)) {
      expect(cliPaths, `override key "${path}" is not a CLI command — remove or fix the override`).toContain(path);
      expect(mcpNames.has(tool), `override target "${tool}" is not an MCP tool — remove or fix the override`).toBe(true);
    }
  });

  it("has no duplicate or empty CLI paths", () => {
    expect(new Set(cliPaths).size).toBe(cliPaths.length);
    expect(cliPaths.filter((path) => path.trim().length === 0)).toEqual([]);
  });
});
