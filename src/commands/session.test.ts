import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, rm, realpath } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { sessionCommand } from "./session.js";
import { SessionRegistryManager } from "../lib/session-registry.js";
import { VaultFS } from "../lib/vault-fs.js";
import type { CommandContext } from "../core/types.js";
import * as lifecycle from "../lib/worktree/lifecycle.js";
import * as cleanupModule from "../lib/worktree/cleanup.js";
import * as graphStore from "../lib/graph/store.js";
import type { Graph, SessionNode } from "../lib/graph/schema.js";

function createCommandContext(vaultFs: VaultFS, overrides?: Partial<CommandContext>): CommandContext {
  return {
    vaultFs,
    vaultPath: vaultFs.root,
    sessionRegistry: {} as any,
    config: {} as any,
    log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides,
  };
}

describe("sessionCommand", () => {
  let vaultRoot: string;
  let vaultFs: VaultFS;
  let registry: SessionRegistryManager;
  let ctx: CommandContext;

  beforeEach(async () => {
    vaultRoot = join(homedir(), `.vault-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(vaultRoot, { recursive: true });
    await mkdir(join(vaultRoot, "coordination/locks"), { recursive: true });
    vaultFs = new VaultFS(vaultRoot);
    registry = new SessionRegistryManager(vaultRoot, 24);
    ctx = createCommandContext(vaultFs, { sessionRegistry: registry });
    vi.spyOn(lifecycle, "assessWorktreeLifecycle").mockResolvedValue({ status: "not_repo", worktreeCount: null, currentLinked: null, policyInstalled: null, safety: "not_assessed", nextActions: [] });
    vi.spyOn(graphStore, "mutateGraph").mockImplementation(async (_root, update) => update({ nodes: [], edges: [] }));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(vaultRoot, { recursive: true, force: true });
  });

  it("automatically assesses the actual workspace at register and completion", async () => {
    ctx.workspacePath = vaultRoot;
    const registered = await sessionCommand({ action: "register", tool: "codex", project: "test-project" }, ctx);
    expect(registered.worktree?.status).toBe("not_repo");
    expect(lifecycle.assessWorktreeLifecycle).toHaveBeenLastCalledWith(vaultRoot, { phase: "register" });
    expect((await registry.get(registered.session_id!))?.workspace_path).toBe(vaultRoot);
    const completed = await sessionCommand({ action: "complete", sessionId: registered.session_id }, ctx);
    expect(completed.worktree?.status).toBe("not_repo");
    expect(lifecycle.assessWorktreeLifecycle).toHaveBeenLastCalledWith(vaultRoot, { phase: "complete" });
  });

  it("preserves captured learning counts when completion rewrites the same session note", async () => {
    const registered = await registry.register("codex", "test-project");
    const first = await sessionCommand({ action: "complete", sessionId: registered.session_id, project: "test-project", outcome: "Initial result" }, ctx);
    await vaultFs.update(first.session_note_path!, (current) => current.replace("learnings_captured: 0", "learnings_captured: 3"));
    await sessionCommand({ action: "complete", sessionId: registered.session_id, project: "test-project", outcome: "Updated result" }, ctx);
    expect(await vaultFs.read(first.session_note_path!)).toContain("learnings_captured: 3");
  });

  it("settles only the graph session linked to the completing coordination session", async () => {
    const registered = await registry.register("codex", "test-project");
    const node = (id: string, ts: number): SessionNode => ({ type: "session", id, coordinationSessionId: id, intent: "task", skills: [], files: [], outcome: null, insights: [], ts });
    let graph: Graph = { nodes: [node(registered.session_id, 1), node("other-agent", 2)], edges: [] };
    vi.mocked(graphStore.mutateGraph).mockImplementation(async (_root, update) => {
      graph = await update(graph);
      return graph;
    });
    await sessionCommand({ action: "complete", sessionId: registered.session_id, outcome: "done" }, ctx);
    expect((graph.nodes.find((node) => node.id === registered.session_id) as SessionNode).outcome).toBe("success");
    expect((graph.nodes.find((node) => node.id === "other-agent") as SessionNode).outcome).toBeNull();
  });

  it("leaves unrelated legacy graph sessions open", async () => {
    const registered = await registry.register("codex", "test-project");
    let graph: Graph = { nodes: [{ type: "session", id: "s_legacy", intent: "task", skills: [], files: [], outcome: null, insights: [], ts: Date.now() }], edges: [] };
    vi.mocked(graphStore.mutateGraph).mockImplementation(async (_root, update) => {
      graph = await update(graph);
      return graph;
    });
    await sessionCommand({ action: "complete", sessionId: registered.session_id, outcome: "done" }, ctx);
    expect((graph.nodes[0] as SessionNode).outcome).toBeNull();
  });

  it("preserves explicit blockers when the outcome prose contains completed", async () => {
    const registered = await registry.register("codex", "test-project");
    let graph: Graph = { nodes: [{ type: "session", id: registered.session_id, coordinationSessionId: registered.session_id, intent: "task", skills: [], files: [], outcome: null, insights: [], ts: Date.now() }], edges: [] };
    vi.mocked(graphStore.mutateGraph).mockImplementation(async (_root, update) => {
      graph = await update(graph);
      return graph;
    });
    await sessionCommand({ action: "complete", sessionId: registered.session_id, outcome: "Completed implementation", blocked: ["Verification failing"] }, ctx);
    expect((graph.nodes[0] as SessionNode).outcome).toBe("partial");
  });

  describe("register", () => {
    it("registers a new session", async () => {
      const result = await sessionCommand({
        action: "register",
        tool: "claude",
        project: "test-project",
        taskSummary: "Implement feature X",
        filesTouched: ["src/index.ts"],
      }, ctx);

      expect(result.session_id).toBeDefined();
      expect(result.session_id).toMatch(/^claude-/);
      expect(result.conflicts).toEqual([]);
    });

    it("detects conflicts when touching same files", async () => {
      await sessionCommand({
        action: "register",
        tool: "cursor",
        project: "test-project",
        taskSummary: "Working on Y",
        filesTouched: ["src/shared.ts"],
      }, ctx);

      const result = await sessionCommand({
        action: "register",
        tool: "claude",
        project: "test-project",
        taskSummary: "Working on X",
        filesTouched: ["src/shared.ts", "src/other.ts"],
      }, ctx);

      expect(result.conflicts).toBeDefined();
      expect(result.conflicts!.length).toBeGreaterThan(0);
      expect(result.conflicts![0].overlapping_files).toContain("src/shared.ts");
    });

    it("requires tool name for register", async () => {
      await expect(
        sessionCommand({
          action: "register",
        }, ctx)
      ).rejects.toThrow("Tool name required for register");
    });

    it("returns the claim holder when the workspace is already claimed", async () => {
      const first = await sessionCommand({
        action: "register",
        tool: "claude",
        project: "test-project",
        taskSummary: "First",
        workspacePath: vaultRoot,
      }, ctx);

      const second = await sessionCommand({
        action: "register",
        tool: "cursor",
        project: "test-project",
        taskSummary: "Second",
        workspacePath: vaultRoot,
      }, ctx);

      expect(second.claim).toEqual({
        granted: false,
        holder: { session_id: first.session_id, tool: "claude", task_summary: "First" },
      });
      expect(second.session_id).not.toBe(first.session_id);
      expect((await registry.listActive()).map((s) => s.id)).toEqual([first.session_id]);
    });

    it("registers the explicit workspace path instead of the context workspace", async () => {
      const explicit = join(vaultRoot, "explicit-workspace");
      await mkdir(explicit);
      ctx.workspacePath = vaultRoot;

      const result = await sessionCommand({
        action: "register",
        tool: "codex",
        project: "test-project",
        workspacePath: explicit,
      }, ctx);

      expect((await registry.get(result.session_id!))?.workspace_path).toBe(await realpath(explicit));
    });

    it("passes the registered session id to worktree cleanup outside the registry lock", async () => {
      const workspace = join(vaultRoot, "cleanup-workspace");
      await mkdir(workspace);
      vi.mocked(lifecycle.assessWorktreeLifecycle).mockResolvedValue({
        status: "available",
        worktreeCount: 2,
        currentLinked: false,
        policyInstalled: true,
        safety: "not_assessed",
        nextActions: [],
      });
      let lockFreeDuringCleanup = false;
      const cleanup = vi.spyOn(cleanupModule, "cleanupCompletedWorktrees").mockImplementation(async () => {
        await registry.listForMaintenance();
        lockFreeDuringCleanup = true;
        return { removed: [], kept: [], errors: [] };
      });

      const result = await sessionCommand({
        action: "register",
        tool: "codex",
        project: "test-project",
        workspacePath: workspace,
      }, ctx);

      expect(lockFreeDuringCleanup).toBe(true);
      expect(cleanup).toHaveBeenCalledWith(workspace, expect.any(Array), { currentSessionId: result.session_id });
    });
  });

  describe("heartbeat", () => {
    it("updates session timestamp", async () => {
      const { session_id } = await sessionCommand({
        action: "register",
        tool: "claude",
        project: "test-project",
      }, ctx);

      const result = await sessionCommand({
        action: "heartbeat",
        sessionId: session_id!,
      }, ctx);

      expect(result).toEqual({ conflicts: [] });
    });

    it("throws for a missing session", async () => {
      await expect(
        sessionCommand({
          action: "heartbeat",
          sessionId: "missing-session",
        }, ctx)
      ).rejects.toThrow("Session not found: missing-session");
    });

    it("requires session ID for heartbeat", async () => {
      await expect(
        sessionCommand({
          action: "heartbeat",
        }, ctx)
      ).rejects.toThrow("Session ID required for heartbeat");
    });
  });

  describe("complete", () => {
    it("marks session as completed", async () => {
      const { session_id } = await sessionCommand({
        action: "register",
        tool: "claude",
        project: "test-project",
        taskSummary: "Task summary",
      }, ctx);

      const result = await sessionCommand({
        action: "complete",
        sessionId: session_id!,
        taskSummary: "Completed task",
      }, ctx);

      expect(result.worktree?.status).toBe("not_repo");
    });

    it("persists session note when vault and project provided", async () => {
      const { session_id } = await sessionCommand({
        action: "register",
        tool: "claude",
        project: "test-project",
      }, ctx);

      await mkdir(join(vaultRoot, "projects/test-project/sessions"), { recursive: true });

      const result = await sessionCommand(
        {
          action: "complete",
          sessionId: session_id!,
          project: "test-project",
          tool: "claude",
          outcome: "Feature implemented",
          filesTouched: ["src/index.ts"],
          tasksCompleted: ["task-001"],
        },
        ctx
      );

      expect(result.session_note_path).toBeDefined();
      expect(result.session_note_path).toMatch(/projects\/test-project\/sessions\/\d{4}-\d{2}-\d{2}-claude-/);

      const content = await vaultFs.read(result.session_note_path!);
      expect(content).toContain("type: session");
      expect(content).toContain("tool: claude");
      expect(content).toContain("Feature implemented");
    });

    it("requires session ID for complete", async () => {
      await expect(
        sessionCommand({
          action: "complete",
        }, ctx)
      ).rejects.toThrow("Session ID required for complete");
    });

    it("throws for an unknown session", async () => {
      await expect(
        sessionCommand({
          action: "complete",
          sessionId: "missing-session",
        }, ctx)
      ).rejects.toThrow("Session not found: missing-session");
    });

    it("persists the session note using the context project when args omit it", async () => {
      const scoped = { ...ctx, projectSlug: "ctx-project" };
      await mkdir(join(vaultRoot, "projects/ctx-project/sessions"), { recursive: true });
      const { session_id } = await registry.register("codex", "ctx-project");

      const result = await sessionCommand({
        action: "complete",
        sessionId: session_id,
        outcome: "Done via MCP",
      }, scoped);

      expect(result.session_note_path).toBeDefined();
      expect(result.session_note_path).toMatch(/projects\/ctx-project\/sessions\/\d{4}-\d{2}-\d{2}-codex-/);
      expect(await vaultFs.read(result.session_note_path!)).toContain("Done via MCP");
    });

    it("backfills the context project when register omits it", async () => {
      const scoped = { ...ctx, projectSlug: "ctx-project" };
      const registered = await sessionCommand({ action: "register", tool: "codex" }, scoped);
      expect((await registry.get(registered.session_id!))?.project).toBe("ctx-project");
    });

    it("completes legacy unscoped sessions but still refuses cross-project completion", async () => {
      const scoped = { ...ctx, projectSlug: "ctx-project" };
      await mkdir(join(vaultRoot, "projects/ctx-project/sessions"), { recursive: true });
      const legacy = await registry.register("codex", null);
      const result = await sessionCommand({ action: "complete", sessionId: legacy.session_id, outcome: "legacy done" }, scoped);
      expect(result.session_note_path).toMatch(/projects\/ctx-project\/sessions\//);

      const other = await registry.register("codex", "other-project");
      await expect(
        sessionCommand({ action: "complete", sessionId: other.session_id }, scoped)
      ).rejects.toThrow("Session belongs to a different project");
    });
  });

  describe("list_active", () => {
    it("lists active sessions", async () => {
      await sessionCommand({
        action: "register",
        tool: "claude",
        project: "test-project",
        taskSummary: "Task 1",
        allowShared: true,
      }, ctx);

      await sessionCommand({
        action: "register",
        tool: "cursor",
        project: "other-project",
        taskSummary: "Task 2",
        allowShared: true,
      }, ctx);

      const result = await sessionCommand({
        action: "list_active",
      }, ctx);

      expect(result.active_sessions).toBeDefined();
      expect(result.active_sessions!.length).toBeGreaterThanOrEqual(2);
    });

    it("excludes completed sessions", async () => {
      const { session_id } = await sessionCommand({
        action: "register",
        tool: "claude",
        project: "test-project",
        allowShared: true,
      }, ctx);

      await sessionCommand({
        action: "register",
        tool: "cursor",
        project: "test-project",
        allowShared: true,
      }, ctx);

      await sessionCommand({
        action: "complete",
        sessionId: session_id!,
      }, ctx);

      const result = await sessionCommand({
        action: "list_active",
      }, ctx);

      const activeIds = result.active_sessions!.map((s) => s.id);
      expect(activeIds).not.toContain(session_id);
    });
  });

  describe("persist session note", () => {
    it("creates session note when completing with project and vaultFs", async () => {
      await mkdir(join(vaultRoot, "projects/test-project/sessions"), { recursive: true });

      const { session_id } = await sessionCommand({
        action: "register",
        tool: "claude-code",
        project: "test-project",
        taskSummary: "Build feature X",
        filesTouched: ["src/index.ts"],
      }, ctx);

      await sessionCommand({
        action: "complete",
        sessionId: session_id!,
        project: "test-project",
        outcome: "Completed successfully",
        filesTouched: ["src/index.ts"],
        tasksCompleted: ["task-001"],
      }, ctx);

      const files = await vaultFs.list("projects/test-project/sessions");
      expect(files.length).toBeGreaterThanOrEqual(1);
      const notePath = files.find((f) => f.endsWith(".md"));
      expect(notePath).toBeDefined();

      const content = await vaultFs.read(notePath!);
      expect(content).toContain("claude-code");
      expect(content).toContain("Completed successfully");
      expect(content).toContain("src/index.ts");
    });

    it("extracts tool name from session ID for note heading", async () => {
      await mkdir(join(vaultRoot, "projects/test-project/sessions"), { recursive: true });

      const { session_id } = await sessionCommand({
        action: "register",
        tool: "my-custom-tool",
        project: "test-project",
      }, ctx);

      await sessionCommand({
        action: "complete",
        sessionId: session_id!,
        project: "test-project",
        outcome: "Done",
      }, ctx);

      const files = await vaultFs.list("projects/test-project/sessions");
      const notePath = files.find((f) => f.endsWith(".md"));
      const content = await vaultFs.read(notePath!);
      expect(content).toContain("my-custom-tool");
    });

    it("links the context note and matching code note in a Related section", async () => {
      await mkdir(join(vaultRoot, "projects/test-project/sessions"), { recursive: true });
      await vaultFs.write("projects/test-project/context.md", "# Context\n");
      await vaultFs.write("projects/test-project/code/src/lib/foo.ts.md", "# foo\n");

      const { session_id } = await sessionCommand({
        action: "register",
        tool: "claude",
        project: "test-project",
      }, ctx);

      const result = await sessionCommand({
        action: "complete",
        sessionId: session_id!,
        project: "test-project",
        outcome: "Done",
        filesTouched: ["src/lib/foo.ts"],
      }, ctx);

      const content = await vaultFs.read(result.session_note_path!);
      expect(content).toContain("## Related");
      expect(content).toContain("- [[projects/test-project/code/src/lib/foo.ts]]");
      expect(content).toContain("- [[projects/test-project/context.md]]");
      expect(content).not.toContain("[[projects/test-project/code/src/lib/foo.ts.md]]");
      expect(content.indexOf("## Files Changed")).toBeLessThan(content.indexOf("## Related"));
    });

    it("omits the context link when context.md does not exist", async () => {
      await mkdir(join(vaultRoot, "projects/test-project/sessions"), { recursive: true });
      await vaultFs.write("projects/test-project/code/src/index.ts.md", "# index\n");

      const { session_id } = await sessionCommand({
        action: "register",
        tool: "claude",
        project: "test-project",
      }, ctx);

      const result = await sessionCommand({
        action: "complete",
        sessionId: session_id!,
        project: "test-project",
        outcome: "Done",
        filesTouched: ["src/index.ts"],
      }, ctx);

      const content = await vaultFs.read(result.session_note_path!);
      expect(content).toContain("## Related");
      expect(content).toContain("- [[projects/test-project/code/src/index.ts]]");
      expect(content).not.toContain("context.md]]");
    });

    it("links context.md when it exists even when no code note matches", async () => {
      await mkdir(join(vaultRoot, "projects/test-project/sessions"), { recursive: true });
      await vaultFs.write("projects/test-project/context.md", "# Context\n");

      const { session_id } = await sessionCommand({
        action: "register",
        tool: "claude",
        project: "test-project",
      }, ctx);

      const result = await sessionCommand({
        action: "complete",
        sessionId: session_id!,
        project: "test-project",
        outcome: "Done",
        filesTouched: ["src/missing.ts"],
      }, ctx);

      const content = await vaultFs.read(result.session_note_path!);
      expect(content).toContain("- [[projects/test-project/context.md]]");
      expect(content).not.toContain("code/src/missing.ts");
    });

    it("omits the Related section entirely when nothing can be linked", async () => {
      await mkdir(join(vaultRoot, "projects/test-project/sessions"), { recursive: true });

      const { session_id } = await sessionCommand({
        action: "register",
        tool: "claude",
        project: "test-project",
      }, ctx);

      const result = await sessionCommand({
        action: "complete",
        sessionId: session_id!,
        project: "test-project",
        outcome: "Done",
        filesTouched: ["src/index.ts"],
      }, ctx);

      const content = await vaultFs.read(result.session_note_path!);
      expect(content).not.toContain("## Related");
      expect(content).not.toContain("[[");
      expect(content).toContain("## Files Changed\n- src/index.ts");
    });

    it("dedupes and sorts Related links deterministically", async () => {
      await mkdir(join(vaultRoot, "projects/test-project/sessions"), { recursive: true });
      await vaultFs.write("projects/test-project/context.md", "# Context\n");
      await vaultFs.write("projects/test-project/code/src/b.ts.md", "# b\n");
      await vaultFs.write("projects/test-project/code/src/a.ts.md", "# a\n");

      const { session_id } = await sessionCommand({
        action: "register",
        tool: "claude",
        project: "test-project",
      }, ctx);

      const result = await sessionCommand({
        action: "complete",
        sessionId: session_id!,
        project: "test-project",
        outcome: "Done",
        filesTouched: ["src/b.ts", "src/a.ts", "src/b.ts"],
      }, ctx);

      const content = await vaultFs.read(result.session_note_path!);
      const related = content.slice(content.indexOf("## Related")).trim().split("\n");
      expect(related).toEqual([
        "## Related",
        "- [[projects/test-project/code/src/a.ts]]",
        "- [[projects/test-project/code/src/b.ts]]",
        "- [[projects/test-project/context.md]]",
      ]);
    });

    it("caps Related links at 50", async () => {
      await mkdir(join(vaultRoot, "projects/test-project/sessions"), { recursive: true });
      const files = Array.from({ length: 51 }, (_, index) => `notes/note-${String(index).padStart(3, "0")}.ts`);
      for (const file of files) {
        await vaultFs.write(`projects/test-project/code/${file}.md`, "# note\n");
      }

      const { session_id } = await sessionCommand({
        action: "register",
        tool: "claude",
        project: "test-project",
      }, ctx);

      const result = await sessionCommand({
        action: "complete",
        sessionId: session_id!,
        project: "test-project",
        outcome: "Done",
        filesTouched: files,
      }, ctx);

      const content = await vaultFs.read(result.session_note_path!);
      const related = content.slice(content.indexOf("## Related")).trim().split("\n").filter((line) => line.startsWith("- "));
      expect(related).toHaveLength(50);
      expect(related).toContain("- [[projects/test-project/code/notes/note-000.ts]]");
      expect(related).toContain("- [[projects/test-project/code/notes/note-049.ts]]");
      expect(related).not.toContain("- [[projects/test-project/code/notes/note-050.ts]]");
    });
  });

  describe("unknown action", () => {
    it("throws error for unknown action", async () => {
      await expect(
        sessionCommand({
          action: "unknown" as any,
        }, ctx)
      ).rejects.toThrow("Unknown action: unknown");
    });
  });
});
