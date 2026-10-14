import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandContext } from "./core/types.js";

const harness = vi.hoisted(() => ({
  createScopedCtx: vi.fn(),
  graphTraverseCommand: vi.fn(),
  validateNativeSkillCommand: vi.fn(),
}));

vi.mock("./app-context.js", () => ({
  createScopedCtx: harness.createScopedCtx,
  createCtx: vi.fn(),
}));

vi.mock("./commands/graph.js", () => ({
  graphRelatedCommand: vi.fn(),
  graphCrossProjectCommand: vi.fn(),
  graphTraverseCommand: harness.graphTraverseCommand,
}));

vi.mock("./commands/skill/validate.js", () => ({
  validateNativeSkillCommand: harness.validateNativeSkillCommand,
}));

describe("CLI graph-open paging and native validation", () => {
  const ctx = { projectSlug: "fixture" } as CommandContext;

  beforeEach(() => {
    process.exitCode = 0;
    harness.createScopedCtx.mockReset().mockResolvedValue(ctx);
    harness.graphTraverseCommand.mockReset().mockResolvedValue({
      id: "skill:fixture", kind: "skill", bytes: 8192, offset_bytes: 1024,
      next_offset_bytes: 2048, read_complete: false, content_bytes: 1024,
      content: "page", truncated: true,
    });
    harness.validateNativeSkillCommand.mockReset().mockResolvedValue({
      success: true, valid: true, profile: "anthropic", checked_paths: ["skills/demo/SKILL.md"], issues: [],
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = 0;
  });

  it("passes bounded byte pagination flags through graph open", async () => {
    const { createProgram } = await import("./cli.js");
    await createProgram().parseAsync([
      "node", "superskill", "graph", "open", "skill:fixture",
      "--offset-bytes", "1024", "--max-bytes", "2048", "--json",
    ]);

    expect(harness.graphTraverseCommand).toHaveBeenCalledWith({
      action: "open", id: "skill:fixture", full: undefined, offsetBytes: 1024, maxBytes: 2048,
    }, ctx);
    expect(process.exitCode).toBe(0);
  });

  it.each([
    ["--offset-bytes", "1.5"],
    ["--max-bytes", "8388609"],
  ])("rejects invalid graph-open %s before dispatch", async (flag, value) => {
    const { createProgram } = await import("./cli.js");
    await createProgram().parseAsync(["node", "superskill", "graph", "open", "skill:fixture", flag, value]);

    expect(harness.graphTraverseCommand).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it("runs skill validate with a workspace-relative path and returns success only after checks", async () => {
    const { createProgram } = await import("./cli.js");
    await createProgram().parseAsync([
      "node", "superskill", "skill", "validate", "skills/demo/SKILL.md", "--profile", "portable",
    ]);

    expect(harness.validateNativeSkillCommand).toHaveBeenCalledWith({
      path: "skills/demo/SKILL.md", profile: "portable",
    }, { ...ctx, workspacePath: process.cwd() });
    expect(process.exitCode).toBe(0);
  });

  it("preserves a resolved workspace root for mapped native validation", async () => {
    const mappedCtx = { ...ctx, workspacePath: "/mapped/workspace" };
    harness.createScopedCtx.mockResolvedValue(mappedCtx);
    const { createProgram } = await import("./cli.js");
    await createProgram().parseAsync(["node", "superskill", "skill", "validate", "skills/demo/SKILL.md"]);

    expect(harness.validateNativeSkillCommand).toHaveBeenCalledWith({
      path: "skills/demo/SKILL.md", profile: "anthropic",
    }, mappedCtx);
    expect(process.exitCode).toBe(0);
  });

  it.each([
    { success: false, valid: false, checked_paths: ["skills/demo/SKILL.md"] },
    { success: true, valid: true, checked_paths: [] },
  ])("sets a nonzero exit status for failed or empty native validation", async report => {
    harness.validateNativeSkillCommand.mockResolvedValue(report);
    const { createProgram } = await import("./cli.js");
    await createProgram().parseAsync(["node", "superskill", "skill", "validate", "skills/demo/SKILL.md"]);

    expect(process.exitCode).toBe(1);
  });

  it("rejects absolute and escaping validation paths without invoking the validator", async () => {
    const { createProgram } = await import("./cli.js");
    await createProgram().parseAsync(["node", "superskill", "skill", "validate", "../outside/SKILL.md"]);

    expect(harness.validateNativeSkillCommand).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
