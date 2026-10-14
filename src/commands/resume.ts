// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { parseFrontmatter } from "../lib/frontmatter.js";
import { resolveProject } from "../config.js";
import type { Session } from "../lib/session-registry.js";

export interface ResumeContext {
  project: string;
  last_sessions: Array<{
    tool: string;
    outcome: string;
    completed_at: string;
    files_touched: string[];
    tasks_completed: string[];
    completed: string[];
    partially_completed: string[];
    blocked: string[];
    verification_run: string | null;
    commands_to_resume: string[];
  }>;
  active_sessions: Session[];
  interrupted_sessions: Session[];
  suggested_next_steps: string[];
}

export async function resumeCommand(
  args: {
    project?: string;
    limit?: number;
  },
  ctx: CommandContext,
): Promise<ResumeContext> {
  const vaultFs = ctx.vaultFs;
  const registry = ctx.sessionRegistry;
  if (ctx.projectSlug === null) throw new Error("Resume requires a resolved project context");
  if (ctx.projectSlug && args.project !== undefined && args.project !== ctx.projectSlug) throw new Error("Resume belongs to a different project");
  const projectSlug = await resolveProject(ctx.vaultPath, args.project ?? ctx.projectSlug);

  const limit = args.limit ?? 5;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Resume limit must be an integer between 1 and 100");

  const lastSessions: ResumeContext["last_sessions"] = [];
  try {
    const sessionFiles = await vaultFs.list(`projects/${projectSlug}/sessions`, 1);
    const mdFiles = sessionFiles.filter((f) => f.endsWith(".md")).sort().reverse().slice(0, limit);

    for (const file of mdFiles) {
      try {
        const content = await vaultFs.read(file);
        const { data } = parseFrontmatter(content);
        lastSessions.push({
          tool: typeof data.tool === "string" ? data.tool : "unknown",
          outcome: typeof data.outcome === "string" ? data.outcome : "",
          completed_at: typeof data.completed_at === "string" ? data.completed_at : typeof data.created === "string" ? data.created : "",
          files_touched: stringArray(data.files_touched),
          tasks_completed: stringArray(data.tasks_completed),
          completed: stringArray(data.completed),
          partially_completed: stringArray(data.partially_completed),
          blocked: stringArray(data.blocked),
          verification_run: typeof data.verification_run === "string" ? data.verification_run : null,
          commands_to_resume: stringArray(data.commands_to_resume),
        });
      } catch (e: unknown) {
        if (e instanceof Error && "code" in e && (e as any).code !== "ENOENT") {
          console.error("[resume] Skipping unreadable session file:", e instanceof Error ? e.message : e);
        }
      }
    }
  } catch (e: unknown) {
    if (e instanceof Error && "code" in e && (e as any).code !== "ENOENT") {
      console.error("[resume] Error listing session files:", e instanceof Error ? e.message : e);
    }
  }

  const allSessions = await registry.listActive(projectSlug);
  const activeSessions = allSessions.filter((s) => s.status === "active");

  const interruptedSessions = (await registry.listInterrupted(projectSlug)).filter((s) => s.project === projectSlug);

  const suggestedNextSteps: string[] = [];

  if (lastSessions.length > 0) {
    const latest = lastSessions[0];
    if (latest.outcome) {
      suggestedNextSteps.push(`Last session (${latest.tool}): ${latest.outcome}`);
    }
  }

  try {
    const taskFiles = await vaultFs.list(`projects/${projectSlug}/tasks`, 1);
    for (const file of taskFiles) {
      if (!file.endsWith(".md")) continue;
      try {
        const content = await vaultFs.read(file);
        const { data, content: body } = parseFrontmatter(content);
        if (data.status === "in-progress") {
          const titleMatch = body.match(/^# (.+)$/m);
          const title = titleMatch ? titleMatch[1].trim() : file;
          suggestedNextSteps.push(`In-progress task: ${title}`);
        }
      } catch (e: unknown) {
        if (e instanceof Error && "code" in e && (e as any).code !== "ENOENT") {
          console.error("[resume] Skipping unreadable task file:", e instanceof Error ? e.message : e);
        }
      }
    }
  } catch (e: unknown) {
    if (e instanceof Error && "code" in e && (e as any).code !== "ENOENT") {
      console.error("[resume] Error listing task files:", e instanceof Error ? e.message : e);
    }
  }

  return {
    project: projectSlug,
    last_sessions: lastSessions,
    active_sessions: activeSessions,
    interrupted_sessions: interruptedSessions,
    suggested_next_steps: suggestedNextSteps,
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function formatResumeContext(ctx: ResumeContext): string {
  const lines: string[] = [];

  lines.push(`## Session Resume: ${ctx.project}`);
  lines.push("");

  if (ctx.interrupted_sessions.length > 0) {
    lines.push("### Interrupted Sessions (stale)");
    for (const s of ctx.interrupted_sessions) {
      lines.push(`- **${s.tool}**: ${s.task_summary ?? "unknown"} (started ${s.started_at})`);
      if (s.files_touched.length > 0) {
        lines.push(`  Files: ${s.files_touched.join(", ")}`);
      }
    }
    lines.push("");
  }

  if (ctx.last_sessions.length > 0) {
    lines.push("### Recent Sessions");
    for (const s of ctx.last_sessions) {
      lines.push(`- **${s.tool}** (${s.completed_at}): ${s.outcome || "no outcome recorded"}`);
      if (s.blocked.length > 0) {
        lines.push(`  Blocked: ${s.blocked.join("; ")}`);
      }
      if (s.commands_to_resume.length > 0) {
        lines.push(`  Resume: ${s.commands_to_resume.slice(0, 3).join(", ")}`);
      }
    }
    lines.push("");
  }

  if (ctx.suggested_next_steps.length > 0) {
    lines.push("### Suggested Next Steps");
    for (const step of ctx.suggested_next_steps) {
      lines.push(`- ${step}`);
    }
    lines.push("");
  }

  if (ctx.active_sessions.length > 0) {
    lines.push("### Active Sessions (other agents)");
    for (const s of ctx.active_sessions) {
      lines.push(`- **${s.tool}**: ${s.task_summary ?? "unknown"}`);
    }
    lines.push("");
  }

  lines.push("Use `superskill` tool for skill routing on specialized tasks.");

  return lines.join("\n");
}
