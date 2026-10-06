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
  "skill status": "status",
  "skill activate": "superskill",
  "skill list": "skill_list_installed",
  snapshot: "snapshot_repo_state",
};

/**
 * CLI-only command paths that intentionally have no MCP tool.
 * Key = full CLI path, value = why it is CLI-only.
 */
const CLI_ONLY_ALLOWLIST: Record<string, string> = {
  onboard: "CLI onboarding; configures local AI clients, no vault command counterpart.",
  setup: "Machine-local client configuration (src/setup); intentionally not an MCP tool.",
  teardown: "Machine-local client deconfiguration (src/setup); intentionally not an MCP tool.",
  "todo list": "Deprecated alias for `task`; kept on the CLI only.",
  "todo add": "Deprecated alias for `task`; kept on the CLI only.",
  "todo complete": "Deprecated alias for `task`; kept on the CLI only.",
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
 *   3. the top-level group normalized (task add -> task).
 */
function resolveMcpToolName(cliPath: string, mcpNames: ReadonlySet<string>): string | null {
  const override = CLI_TO_MCP_OVERRIDES[cliPath];
  if (override !== undefined) return override;
  for (const candidate of [normalize(cliPath), normalize(cliPath.split(" ")[0])]) {
    if (mcpNames.has(candidate)) return candidate;
  }
  return null;
}

describe("CLI <-> MCP command parity", () => {
  const cliPaths = collectCliLeafPaths(createProgram());
  const registry = createRegistry();
  const toolDefs = registry.getToolDefinitions();
  const mcpNames = new Set(toolDefs.map((def) => def.name));

  function coveredMcpNames(): Set<string> {
    return new Set(
      cliPaths
        .map((path) => resolveMcpToolName(path, mcpNames))
        .filter((name): name is string => name !== null),
    );
  }

  it("exposes registry keys and toolDef names identically", () => {
    expect([...mcpNames].sort()).toEqual([...registry.getToolNames()].sort());
  });

  it("maps every CLI command to an MCP tool or a documented CLI-only allowlist entry", () => {
    const undocumented = cliPaths.filter(
      (path) => resolveMcpToolName(path, mcpNames) === null && !(path in CLI_ONLY_ALLOWLIST),
    );
    expect(
      undocumented,
      "New CLI-only command(s). Register a matching tool in src/core/registry.ts, or add each path to CLI_ONLY_ALLOWLIST with a reason.",
    ).toEqual([]);
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
        resolveMcpToolName(path, mcpNames),
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
