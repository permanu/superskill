import { describe, expect, it } from "vitest";
import { createRegistry } from "./registry.js";
import { createProgram } from "../cli.js";

describe("bounded activation interface", () => {
  it("carries caller budgets, session identity and explicit diagnostics through MCP", () => {
    const command = createRegistry().get("superskill")!;
    expect(command.adaptArgs!({ task: "inspect", phase: "review", files: ["worker.py"], max_tokens: 1200, session_id: "codex-test", detail: "full" })).toMatchObject({
      task: "inspect", phase: "review", files: ["worker.py"], max_tokens: 1200, session_id: "codex-test", detail: "full",
    });
    expect(command.toolDef.annotations?.readOnlyHint).toBe(false);
  });

  it("exposes explicit workspace identity for lifecycle and maintenance calls", () => {
    const registry = createRegistry();
    for (const name of ["session", "superskill", "graph_traverse", "knowledge_viz", "worktree_status", "worktree_env", "worktree_audit", "worktree_gc", "worktree_activate", "worktree_apply", "worktree_uninstall"]) {
      const properties = registry.get(name)!.toolDef.inputSchema.properties as Record<string, unknown>;
      expect(properties.workspace_path, name).toBeDefined();
    }
  });

  it("exposes the same budget and identity options on the CLI", () => {
    const activate = createProgram().commands.find(command => command.name() === "skill")!.commands.find(command => command.name() === "activate")!;
    const flags = activate.options.map(option => option.long);
    expect(flags).toEqual(expect.arrayContaining(["--max-tokens", "--session-id", "--json", "--detail", "--phase", "--files"]));
  });
});
