// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CommandContext } from "../core/types.js";
import { SessionRegistryManager, type Session } from "../lib/session-registry.js";
import { serializeFrontmatter, createFrontmatter } from "../lib/frontmatter.js";

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
  },
  ctx: CommandContext,
): Promise<{
  session_id?: string;
  active_sessions?: Session[];
  conflicts?: Array<{
    session_id: string;
    tool: string;
    overlapping_files: string[];
    task_summary: string | null;
  }>;
  session_note_path?: string;
}> {
  const registry = ctx.sessionRegistry;
  const vaultFs = ctx.vaultFs;

  switch (args.action) {
    case "register": {
      if (!args.tool) throw new Error("Tool name required for register");
      const result = await registry.register(
        args.tool,
        args.project ?? null,
        args.taskSummary ?? null,
        args.filesTouched ?? []
      );
      return {
        session_id: result.session_id,
        conflicts: result.conflicts,
      };
    }

    case "heartbeat": {
      if (!args.sessionId) throw new Error("Session ID required for heartbeat");
      const found = await registry.heartbeat(args.sessionId);
      if (!found) throw new Error(`Session not found: ${args.sessionId}`);
      return {};
    }

    case "complete": {
      if (!args.sessionId) throw new Error("Session ID required for complete");
      await registry.complete(args.sessionId, args.taskSummary);

      let sessionNotePath: string | undefined;
      if (args.project) {
        sessionNotePath = await persistSessionNote(vaultFs, {
          sessionId: args.sessionId,
          project: args.project,
          tool: args.tool ?? extractToolFromId(args.sessionId),
          outcome: args.outcome ?? args.taskSummary ?? "",
          filesTouched: args.filesTouched ?? [],
          tasksCompleted: args.tasksCompleted ?? [],
          completed: args.completed ?? [],
          partiallyCompleted: args.partiallyCompleted ?? [],
          blocked: args.blocked ?? [],
          verificationRun: args.verificationRun,
          commandsToResume: args.commandsToResume ?? [],
          startedAt: new Date().toISOString(),
        });
      }

      return { session_note_path: sessionNotePath };
    }

    case "list_active": {
      const sessions = await registry.listActive();
      return { active_sessions: sessions };
    }

    default:
      throw new Error(`Unknown action: ${args.action}`);
  }
}

function extractToolFromId(sessionId: string): string {
  const parts = sessionId.split("-");
  if (parts.length >= 2) {
    return parts.slice(0, -1).join("-");
  }
  return "unknown";
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

  await vaultFs.write(filePath, serializeFrontmatter(fm, sections.join("\n")));
  return filePath;
}
