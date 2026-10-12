import { realpath } from "node:fs/promises";
import { assessWorktreeLifecycle, type WorktreeLifecycleAssessment } from "../lib/worktree/lifecycle.js";
import { cleanupCompletedWorktrees, type CleanupResult } from "../lib/worktree/cleanup.js";
// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import type { ClaimResult, Session } from "../lib/session-registry.js";
import { serializeFrontmatter, createFrontmatter, parseFrontmatter } from "../lib/frontmatter.js";
import { mutateGraph, findNode } from "../lib/graph/store.js";
import { endSession } from "../lib/graph/learner.js";
import type { SessionNode, SessionOutcome } from "../lib/graph/schema.js";

export async function sessionCommand(
  args: {
    action: "register" | "heartbeat" | "complete" | "list_active";
    tool?: string;
    project?: string;
    taskSummary?: string;
    filesTouched?: string[];
    sessionId?: string;
    outcome?: string;
    tasksCompleted?: string[];
    completed?: string[];
    partiallyCompleted?: string[];
    blocked?: string[];
    verificationRun?: string;
    commandsToResume?: string[];
    workspacePath?: string;
    allowShared?: boolean;
  },
  ctx: CommandContext,
): Promise<{
  worktree?: WorktreeLifecycleAssessment & { workspacePath: string; cleanup?: CleanupResult };
  session_id?: string;
  active_sessions?: Session[];
  conflicts?: Array<{
    session_id: string;
    tool: string;
    overlapping_files: string[];
    task_summary: string | null;
  }>;
  claim?: ClaimResult;
  session_note_path?: string;
}> {
  const registry = ctx.sessionRegistry;
  const vaultFs = ctx.vaultFs;
  const contextWorkspace = ctx.workspacePath ?? process.cwd();

  switch (args.action) {
    case "register": {
      if (!args.tool) throw new Error("Tool name required for register");
      const workspace = args.workspacePath ?? contextWorkspace;
      const result = await registry.register(
        args.tool,
        args.project ?? ctx.projectSlug ?? null,
        args.taskSummary ?? null,
        args.filesTouched ?? [],
        await realpath(workspace),
        args.allowShared ?? false,
      );
      return {
        session_id: result.session_id,
        conflicts: result.conflicts,
        claim: result.claim,
        worktree: await maintainWorkspace(workspace, "register", ctx, result.session_id),
      };
    }

    case "heartbeat": {
      if (!args.sessionId) throw new Error("Session ID required for heartbeat");
      const result = await registry.heartbeat(args.sessionId, args.filesTouched);
      if (!result.found) throw new Error(`Session not found: ${args.sessionId}`);
      return { conflicts: result.conflicts };
    }

    case "complete": {
      if (!args.sessionId) throw new Error("Session ID required for complete");
      const existing = await registry.get(args.sessionId);
      if (existing && existing.project != null && ctx.projectSlug != null && existing.project !== ctx.projectSlug) throw new Error("Session belongs to a different project");
      const completion = await registry.complete(args.sessionId, args.taskSummary);
      if (!completion.found) throw new Error(`Session not found: ${args.sessionId}`);

      let sessionNotePath: string | undefined;
      const noteProject = args.project ?? ctx.projectSlug;
      if (noteProject) {
        sessionNotePath = await persistSessionNote(vaultFs, {
          sessionId: args.sessionId,
          project: noteProject,
          tool: args.tool ?? existing?.tool ?? extractToolFromId(args.sessionId),
          outcome: args.outcome ?? args.taskSummary ?? "",
          filesTouched: args.filesTouched ?? [],
          tasksCompleted: args.tasksCompleted ?? [],
          completed: args.completed ?? [],
          partiallyCompleted: args.partiallyCompleted ?? [],
          blocked: args.blocked ?? [],
          verificationRun: args.verificationRun,
          commandsToResume: args.commandsToResume ?? [],
          startedAt: existing?.started_at ?? new Date().toISOString(),
        });
      }

      if (existing) await settleGraphSession(args, existing.workspace_path ?? contextWorkspace);

      return { session_note_path: sessionNotePath, worktree: await maintainWorkspace(contextWorkspace, "complete", ctx, args.sessionId) };
    }

    case "list_active": {
      const sessions = await registry.listActive(ctx.projectSlug ?? undefined);
      return { active_sessions: sessions };
    }

    default:
      throw new Error(`Unknown action: ${args.action}`);
  }
}

async function maintainWorkspace(workspace: string, phase: "register" | "complete", ctx: CommandContext, currentSessionId?: string) {
  const assessment = await assessWorktreeLifecycle(workspace, { phase });
  if (assessment.status !== "available") return { ...assessment, workspacePath: workspace };
  let cleanup: CleanupResult;
  try {
    const sessions = await ctx.sessionRegistry.listForMaintenance();
    cleanup = await cleanupCompletedWorktrees(workspace, sessions, { currentSessionId });
    for (const path of cleanup.removed) await ctx.sessionRegistry.acknowledgeWorkspaceRemoval(path);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    ctx.log.error(`[session] worktree maintenance failed: ${reason}`);
    cleanup = { removed: [], kept: [], errors: [{ path: workspace, reason }] };
  }
  return { ...assessment, workspacePath: workspace, cleanup };
}

function extractToolFromId(sessionId: string): string {
  const parts = sessionId.split("-");
  if (parts.length >= 2) {
    return parts.slice(0, -1).join("-");
  }
  return "unknown";
}

function mapOutcome(args: { outcome?: string; blocked?: string[]; partiallyCompleted?: string[] }): SessionOutcome {
  const explicit = (args.outcome ?? "").toLowerCase();
  if (explicit.includes("abandon")) return "abandoned";
  if ((args.blocked ?? []).length > 0 || (args.partiallyCompleted ?? []).length > 0) return "partial";
  if (explicit.includes("partial")) return "partial";
  if (/(success|complete|done|shipped)/.test(explicit)) return "success";
  return "success";
}

async function settleGraphSession(
  args: { sessionId?: string; outcome?: string; blocked?: string[]; partiallyCompleted?: string[]; completed?: string[] },
  workspace: string,
): Promise<void> {
  try {
    if (!args.sessionId) return;
    await mutateGraph(workspace, (graph) => {
      const session = findNode<SessionNode>(graph, "session", args.sessionId!);
      if (!session || session.coordinationSessionId !== args.sessionId || session.outcome !== null) return graph;
      const insights = [
        ...(args.completed ?? []),
        ...(args.blocked ?? []).map((item) => `blocked: ${item}`),
      ].slice(0, 10);
      return endSession(graph, session.id, mapOutcome(args), insights);
    });
  } catch (err: unknown) {
    console.error(`[session] graph outcome update failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function persistSessionNote(
  vaultFs: import("../lib/vault-fs.js").VaultFS,
  opts: {
    sessionId: string;
    project: string;
    tool: string;
    outcome: string;
    filesTouched: string[];
    tasksCompleted: string[];
    completed: string[];
    partiallyCompleted: string[];
    blocked: string[];
    verificationRun?: string;
    commandsToResume: string[];
    startedAt: string;
  }
): Promise<string> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const completedAt = now.toISOString();
  const shortId = opts.sessionId.slice(-8);
  const toolSlug = opts.tool.replace(/[^a-z0-9-]/gi, "-").toLowerCase();

  const filename = `${today}-${toolSlug}-${shortId}.md`;
  const filePath = `projects/${opts.project}/sessions/${filename}`;

  const fm = createFrontmatter({
    type: "session",
    project: opts.project,
    tool: opts.tool,
    session_id: opts.sessionId,
    status: "completed",
    started_at: opts.startedAt,
    completed_at: completedAt,
    outcome: opts.outcome,
    files_touched: opts.filesTouched,
    tasks_completed: opts.tasksCompleted,
    completed: opts.completed,
    partially_completed: opts.partiallyCompleted,
    blocked: opts.blocked,
    verification_run: opts.verificationRun ?? null,
    commands_to_resume: opts.commandsToResume,
    learnings_captured: 0,
  });

  const sections: string[] = [];
  sections.push(`# Session: ${opts.outcome || "No outcome recorded"}`);
  sections.push(`
**Tool**: ${opts.tool}  
**Session ID**: ${opts.sessionId}  
**Completed**: ${completedAt}`);

  if (opts.completed.length > 0) {
    sections.push(`\n## Completed\n${opts.completed.map((c) => `- ${c}`).join("\n")}`);
  }

  if (opts.partiallyCompleted.length > 0) {
    sections.push(`\n## Partially Completed\n${opts.partiallyCompleted.map((c) => `- ${c}`).join("\n")}`);
  }

  if (opts.blocked.length > 0) {
    sections.push(`\n## Blocked\n${opts.blocked.map((b) => `- ${b}`).join("\n")}`);
  }

  if (opts.verificationRun) {
    sections.push(`\n## Verification\n${opts.verificationRun}`);
  }

  if (opts.commandsToResume.length > 0) {
    sections.push(`\n## Commands to Resume\n${opts.commandsToResume.map((c) => `- \`${c}\``).join("\n")}`);
  }

  if (opts.filesTouched.length > 0) {
    sections.push(`\n## Files Changed\n${opts.filesTouched.map((f) => `- ${f}`).join("\n")}`);
  }

  const relatedLinks = await collectRelatedLinks(vaultFs, opts.project, opts.filesTouched);
  if (relatedLinks.length > 0) {
    sections.push(`\n## Related\n${relatedLinks.map((link) => `- ${link}`).join("\n")}`);
  }

  await vaultFs.update(filePath, (current) => {
    const { data } = parseFrontmatter(current);
    const count = data.session_id === opts.sessionId ? Number(data.learnings_captured ?? 0) : 0;
    return serializeFrontmatter({ ...fm, learnings_captured: count }, sections.join("\n"));
  }, { create: true });
  return filePath;
}

async function collectRelatedLinks(
  vaultFs: import("../lib/vault-fs.js").VaultFS,
  project: string,
  filesTouched: string[],
): Promise<string[]> {
  const links = new Set<string>();
  const contextNote = `projects/${project}/context.md`;
  if (await relatedTargetExists(vaultFs, contextNote)) links.add(`[[${contextNote}]]`);

  for (const file of [...new Set(filesTouched)].sort()) {
    const notePath = `projects/${project}/code/${file}.md`;
    if (await relatedTargetExists(vaultFs, notePath)) links.add(`[[projects/${project}/code/${file}]]`);
  }

  return [...links].sort().slice(0, 50);
}

async function relatedTargetExists(vaultFs: import("../lib/vault-fs.js").VaultFS, path: string): Promise<boolean> {
  try {
    return await vaultFs.exists(path);
  } catch (error) {
    console.error(`[session] related link check failed for ${path}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}
