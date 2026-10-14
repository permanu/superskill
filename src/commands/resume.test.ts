import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, rm } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { resumeCommand, formatResumeContext } from "./resume.js";
import { SessionRegistryManager } from "../lib/session-registry.js";
import { VaultFS } from "../lib/vault-fs.js";
import type { CommandContext } from "../core/types.js";

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

describe("resumeCommand", () => {
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
  });

  afterEach(async () => {
    await rm(vaultRoot, { recursive: true, force: true });
  });

  describe("resume context", () => {
    it("uses the context project instead of the server cwd", async () => {
      const result = await resumeCommand({}, { ...ctx, projectSlug: "context-project" });
      expect(result.project).toBe("context-project");
    });

    it("rejects mismatched scoped projects and invalid limits", async () => {
      await expect(resumeCommand({ project: "other" }, { ...ctx, projectSlug: "current" })).rejects.toThrow(/different project/i);
      for (const limit of [-1, 0, 1.5, NaN, Infinity, 101]) {
        await expect(resumeCommand({ project: "test-project", limit }, ctx)).rejects.toThrow(/limit/i);
      }
    });

    it("filters malformed frontmatter values instead of exposing typed nonstrings", async () => {
      await vaultFs.write("projects/test-project/sessions/2024-01-15-session.md", "---\ntype: session\ntool: 42\noutcome: [bad]\nfiles_touched: [valid.ts, 42, null]\ncompleted: [done, false]\n---\n# Session");
      const result = await resumeCommand({ project: "test-project" }, ctx);
      expect(result.last_sessions[0]).toMatchObject({ tool: "unknown", outcome: "", files_touched: ["valid.ts"], completed: ["done"] });
    });

    it("returns project slug", async () => {
      await vaultFs.write("project-map.json", JSON.stringify({ projects: { "test-project": "/tmp/test" } }));

      const result = await resumeCommand({
        project: "test-project",
      }, ctx);

      expect(result.project).toBe("test-project");
    });

    it("returns empty arrays when no sessions or tasks", async () => {
      await vaultFs.write("project-map.json", JSON.stringify({ projects: { "test-project": "/tmp/test" } }));

      const result = await resumeCommand({
        project: "test-project",
      }, ctx);

      expect(result.last_sessions).toEqual([]);
      expect(result.active_sessions).toEqual([]);
      expect(result.interrupted_sessions).toEqual([]);
    });

    it("returns recent completed sessions", async () => {
      await vaultFs.write("project-map.json", JSON.stringify({ projects: { "test-project": "/tmp/test" } }));
      await mkdir(join(vaultRoot, "projects/test-project/sessions"), { recursive: true });

      await vaultFs.write(
        `projects/test-project/sessions/2024-01-15-session.md`,
        `---
type: session
tool: claude
outcome: Feature implemented
completed_at: "2024-01-15T10:00:00Z"
files_touched:
  - src/index.ts
tasks_completed:
  - task-001
---

# Session
`
      );

      const result = await resumeCommand({
        project: "test-project",
      }, ctx);

      expect(result.last_sessions).toHaveLength(1);
      expect(result.last_sessions[0].tool).toBe("claude");
      expect(result.last_sessions[0].outcome).toBe("Feature implemented");
      expect(result.last_sessions[0].files_touched).toContain("src/index.ts");
    });

    it("limits sessions to specified limit", async () => {
      await vaultFs.write("project-map.json", JSON.stringify({ projects: { "test-project": "/tmp/test" } }));
      await mkdir(join(vaultRoot, "projects/test-project/sessions"), { recursive: true });

      for (let i = 1; i <= 10; i++) {
        await vaultFs.write(
          `projects/test-project/sessions/2024-01-${String(i).padStart(2, "0")}-session.md`,
          `---
type: session
tool: tool-${i}
outcome: Outcome ${i}
created: "2024-01-${String(i).padStart(2, "0")}"
---

# Session
`
        );
      }

      const result = await resumeCommand({
        project: "test-project",
        limit: 3,
      }, ctx);

      expect(result.last_sessions.length).toBeLessThanOrEqual(3);
    });

    it("returns active sessions for the project", async () => {
      await vaultFs.write("project-map.json", JSON.stringify({ projects: { "test-project": "/tmp/test" } }));

      await registry.register("claude", "test-project", "Active task", []);

      const result = await resumeCommand({
        project: "test-project",
      }, ctx);

      expect(result.active_sessions.length).toBeGreaterThanOrEqual(1);
      expect(result.active_sessions.some(s => s.project === "test-project")).toBe(true);
    });

    it("returns empty interrupted_sessions when the registry reports none", async () => {
      await vaultFs.write("project-map.json", JSON.stringify({ projects: { "test-project": "/tmp/test" } }));

      const result = await resumeCommand({
        project: "test-project",
      }, ctx);

      expect(result.interrupted_sessions).toEqual([]);
    });

    it("populates interrupted_sessions from the registry, filtered to this project", async () => {
      await vaultFs.write("project-map.json", JSON.stringify({ projects: { "test-project": "/tmp/test" } }));

      const makeSession = (id: string, project: string) => ({
        id,
        tool: "cursor",
        project,
        task_summary: `Interrupted ${id}`,
        files_touched: ["src/file.ts"],
        started_at: "2024-01-15T10:00:00Z",
        last_heartbeat: "2024-01-15T11:00:00Z",
        completed_at: null,
        status: "active" as const,
      });
      const registryStub = {
        listActive: vi.fn(async () => []),
        listInterrupted: vi.fn(async () => [makeSession("int-1", "test-project"), makeSession("int-2", "other-project")]),
      };

      const result = await resumeCommand(
        { project: "test-project" },
        createCommandContext(vaultFs, { sessionRegistry: registryStub as any }),
      );

      expect(result.interrupted_sessions.map((s) => s.id)).toEqual(["int-1"]);
      expect(result.interrupted_sessions[0].task_summary).toBe("Interrupted int-1");
    });

    it("suggests next steps from in-progress tasks", async () => {
      await vaultFs.write("project-map.json", JSON.stringify({ projects: { "test-project": "/tmp/test" } }));
      await mkdir(join(vaultRoot, "projects/test-project/tasks"), { recursive: true });

      await vaultFs.write(
        "projects/test-project/tasks/task-001-in-progress.md",
        `---
type: task
status: in-progress
---

# In Progress Task
`
      );

      const result = await resumeCommand({
        project: "test-project",
      }, ctx);

      expect(result.suggested_next_steps.some(s => s.includes("In-progress task"))).toBe(true);
    });

    it("handles missing sessions directory gracefully", async () => {
      await vaultFs.write("project-map.json", JSON.stringify({ projects: { "test-project": "/tmp/test" } }));

      const result = await resumeCommand({
        project: "test-project",
      }, ctx);

      expect(result.last_sessions).toEqual([]);
    });
  });

  describe("formatResumeContext", () => {
    it("formats context as markdown", () => {
      const ctx = {
        project: "test-project",
        last_sessions: [
          { tool: "claude", outcome: "Done", completed_at: "2024-01-15", files_touched: [], tasks_completed: [], completed: [], partially_completed: [], blocked: [], verification_run: null, commands_to_resume: [] },
        ],
        active_sessions: [],
        interrupted_sessions: [],
        suggested_next_steps: ["Review PR", "Fix tests"],
      };

      const result = formatResumeContext(ctx);

      expect(result).toContain("## Session Resume: test-project");
      expect(result).toContain("### Recent Sessions");
      expect(result).toContain("claude");
      expect(result).toContain("### Suggested Next Steps");
      expect(result).toContain("Review PR");
    });

    it("includes interrupted sessions section", () => {
      const ctx = {
        project: "test-project",
        last_sessions: [],
        active_sessions: [],
        interrupted_sessions: [
          {
            id: "stale-1",
            tool: "cursor",
            project: "test-project",
            status: "active" as const,
            task_summary: "Interrupted work",
            files_touched: ["src/file.ts"],
            started_at: "2024-01-15T10:00:00Z",
            last_heartbeat: "2024-01-15T11:00:00Z",
            completed_at: null,
          },
        ],
        suggested_next_steps: [],
      };

      const result = formatResumeContext(ctx);

      expect(result).toContain("### Interrupted Sessions (stale)");
      expect(result).toContain("cursor");
      expect(result).toContain("Interrupted work");
    });

    it("includes active sessions section", () => {
      const ctx = {
        project: "test-project",
        last_sessions: [],
        active_sessions: [
          {
            id: "active-1",
            tool: "copilot",
            project: "test-project",
            status: "active" as const,
            task_summary: "Active work",
            files_touched: [],
            started_at: "2024-01-15T10:00:00Z",
            last_heartbeat: "2024-01-15T11:00:00Z",
            completed_at: null,
          },
        ],
        interrupted_sessions: [],
        suggested_next_steps: [],
      };

      const result = formatResumeContext(ctx);

      expect(result).toContain("### Active Sessions (other agents)");
      expect(result).toContain("copilot");
    });
  });
});
