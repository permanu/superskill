#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import { Command } from "commander";
import { existsSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readCommand, listCommand } from "./commands/read.js";
import { writeCommand } from "./commands/write.js";
import { searchCommand } from "./commands/search.js";
import { contextCommand } from "./commands/context.js";
import { decideCommand } from "./commands/decide.js";
import { todoCommand } from "./commands/todo.js";
import { brainstormCommand } from "./commands/brainstorm.js";
import { sessionCommand } from "./commands/session.js";
import { graphRelatedCommand, graphCrossProjectCommand } from "./commands/graph.js";
import { initCommand } from "./commands/init.js";
import { onboard } from "./commands/onboard.js";
import { taskCommand, type TaskStatus, type TaskPriority } from "./commands/task.js";
import { learnCommand, type Confidence } from "./commands/learn.js";
import { pruneCommand, statsCommand, deprecateCommand, type RetentionPolicy } from "./commands/prune.js";
import { resumeCommand, formatResumeContext } from "./commands/resume.js";
import { specCommand, type SpecAction } from "./commands/spec.js";
import { ticketsCommand, type TicketInput } from "./commands/tickets.js";
import { evidenceCommand } from "./commands/evidence.js";
import { gateCommand } from "./commands/gate.js";
import { impactCommand } from "./commands/impact.js";
import { claimsCommand } from "./commands/claims.js";
import { telemetryCommand, type TelemetryAction } from "./commands/telemetry.js";
import { registerCommand } from "./commands/register.js";
import { doctorCommand, renderDoctor } from "./commands/doctor.js";
import { worktreeEnvCommand, renderWorktreeEnv } from "./commands/worktree/env.js";
import { worktreeAuditCommand, renderWorktreeAudit } from "./commands/worktree/audit.js";
import { worktreeStatusCommand, renderWorktreeStatus } from "./commands/worktree/status.js";
import { worktreeGcCommand, renderWorktreeGc } from "./commands/worktree/gc.js";
import { worktreeActivateCommand, renderWorktreeActivate } from "./commands/worktree/activate.js";
import { worktreeApplyCommand, renderWorktreeApply } from "./commands/worktree/apply.js";
import { worktreeUninstallCommand, renderWorktreeUninstall } from "./commands/worktree/uninstall.js";
import { worktreeBootstrapCommand } from "./commands/worktree/bootstrap.js";
import { parseAcceptanceItem } from "./lib/gates/spec.js";
import type { TicketStatus } from "./lib/gates/tickets.js";
import { createScopedCtx, createCtx } from "./app-context.js";
import { registerSetupCommands } from "./setup/index.js";
import { initProject } from "./commands/skill/init.js";
import { activateSkills } from "./commands/skill/activate.js";
import { statusCommand } from "./commands/skill/status.js";
import { installSkills, listInstalledSkills, removeSkill, parseSource } from "./lib/skill-installer.js";
import { getTimeAgo } from "./lib/time-utils.js";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version } = require("../package.json");

export function createProgram(): Command {
  const program = new Command();

  program
    .name("superskill")
    .description("Universal agentic knowledge base + context optimizer + skill marketplace for AI tools")
    .version(version);

  // ── read ──────────────────────────────────────────────
  program
    .command("read <path>")
    .description("Read a vault note")
    .action(async (path: string) => {
      try {
        const content = await readCommand({ path }, await createScopedCtx());
        process.stdout.write(content);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── list ──────────────────────────────────────────────
  program
    .command("list <path>")
    .description("List vault directory")
    .option("-d, --depth <number>", "Listing depth", "1")
    .action(async (path: string, opts: { depth: string }) => {
      try {
        const depth = parseInt(opts.depth, 10);
        if (Number.isNaN(depth) || depth < 1) {
          throw new Error("--depth must be a positive integer");
        }
        const entries = await listCommand({ path, depth }, await createScopedCtx());
        for (const entry of entries) {
          console.log(entry);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── write ─────────────────────────────────────────────
  program
    .command("write <path>")
    .description("Write/create a vault note")
    .requiredOption("-c, --content <text>", "Note content")
    .option("-m, --mode <mode>", "Write mode: overwrite|append|prepend", "append")
    .option("-f, --frontmatter <json>", "Frontmatter as JSON")
    .action(async (path: string, opts: { content: string; mode: string; frontmatter?: string }) => {
      try {
        const validModes = ["overwrite", "append", "prepend"] as const;
        if (!validModes.includes(opts.mode as any)) {
          throw new Error(`--mode must be one of: ${validModes.join(", ")}`);
        }
        let fm: Record<string, unknown> | undefined;
        if (opts.frontmatter) {
          try {
            fm = JSON.parse(opts.frontmatter);
          } catch {
            throw new Error(`Invalid JSON in --frontmatter: ${opts.frontmatter}`);
          }
        }
        const result = await writeCommand({
          path,
          content: opts.content,
          mode: opts.mode as "overwrite" | "append" | "prepend",
          frontmatter: fm,
        }, await createScopedCtx());
        console.log(JSON.stringify(result));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── append ────────────────────────────────────────────
  program
    .command("append <path>")
    .description("Append to an existing vault note")
    .requiredOption("-c, --content <text>", "Content to append")
    .action(async (path: string, opts: { content: string }) => {
      try {
        const result = await writeCommand({ path, content: opts.content, mode: "append" }, await createScopedCtx());
        console.log(JSON.stringify(result));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── search ────────────────────────────────────────────
  program
    .command("search <query>")
    .description("Search the vault")
    .option("-p, --project <slug>", "Restrict to project")
    .option("-l, --limit <number>", "Max results", "10")
    .option("-s, --structured", "Structured frontmatter search")
    .action(async (query: string, opts: { project?: string; limit: string; structured?: boolean }) => {
      try {
        const limit = parseInt(opts.limit, 10);
        if (Number.isNaN(limit) || limit < 1) {
          throw new Error("--limit must be a positive integer");
        }
        const results = await searchCommand({
          query,
          project: opts.project,
          limit,
          structured: opts.structured,
        }, await createScopedCtx());
        console.log(JSON.stringify(results, null, 2));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── context ───────────────────────────────────────────
  program
    .command("context")
    .description("Get project context (auto-detects from cwd)")
    .option("-p, --project <slug>", "Project slug")
    .option("-d, --detail <level>", "Detail level: summary|full", "summary")
    .action(async (opts: { project?: string; detail: string }) => {
      try {
        const validDetails = ["summary", "full"] as const;
        if (!validDetails.includes(opts.detail as any)) {
          throw new Error(`--detail must be one of: ${validDetails.join(", ")}`);
        }
        const result = await contextCommand({
          project: opts.project,
          detailLevel: opts.detail as "summary" | "full",
        }, await createScopedCtx());
        console.log(result.context_md);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── init ──────────────────────────────────────────────
  program
    .command("init <project-path>")
    .description("Draft a vault context.md from a repo scan (does not set up skill routing — use `skill init`)")
    .option("-s, --slug <name>", "Project slug (default: directory name)")
    .action(async (projectPath: string, opts: { slug?: string }) => {
      try {
        const result = await initCommand(projectPath, opts.slug);
        process.stdout.write(result.draft_context_md);
        const graphPath = join(resolve(projectPath), ".superskill", "graph.json");
        if (!existsSync(graphPath)) {
          process.stderr.write(
            "\nTip: run `superskill skill init` to enable stack detection, skill routing, and verified rules for this repo.\n"
          );
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── onboard ───────────────────────────────────────────
  program
    .command("onboard")
    .description("Set up SuperSkill for all detected AI tools")
    .option("--vault-path <path>", "vault directory path")
    .action(async (opts) => {
      const result = await onboard({ vaultPath: opts.vaultPath });

      console.log("\n  SuperSkill Setup Complete\n");
      console.log(`  Vault: ${result.vaultPath}`);
      console.log(`  Detected: ${result.detectedClients.length} AI tool(s) — ${result.detectedClients.join(", ") || "none"}`);
      console.log(`  Configured: ${result.configuredClients.length} tool(s) — ${result.configuredClients.join(", ") || "none"}`);
      console.log(`  Installed skills: ${result.installedSkills}`);

      if (result.errors.length > 0) {
        console.log(`\n  Warnings:`);
        for (const err of result.errors) {
          console.log(`    - ${err}`);
        }
      }

      console.log("\n  Next steps:");
      console.log("    superskill skill init              Initialize knowledge graph for this project");
      console.log("    superskill skill activate [task]   Activate skills for a task");
      console.log("    superskill skill status            Show graph state\n");
    });

  // ── decide ────────────────────────────────────────────
  program
    .command("decide")
    .description("Log an architecture decision record")
    .requiredOption("-t, --title <text>", "Decision title")
    .requiredOption("--decision <text>", "What was decided")
    .option("--context <text>", "Why this decision was needed", "")
    .option("--alternatives <text>", "Alternatives considered")
    .option("--consequences <text>", "Known trade-offs")
    .option("-p, --project <slug>", "Project slug")
    .action(async (opts) => {
      try {
        const result = await decideCommand({
          title: opts.title,
          context: opts.context,
          decision: opts.decision,
          alternatives: opts.alternatives,
          consequences: opts.consequences,
          project: opts.project,
        }, await createScopedCtx());
        console.log(JSON.stringify(result));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── todo (deprecated — use task) ─────────────────────
  const todoCmd = program
    .command("todo")
    .description("[Deprecated — use 'task' instead] Manage project todos");

  todoCmd
    .command("list")
    .description("List active todos")
    .option("-p, --project <slug>", "Project slug")
    .option("-b, --blockers-only", "Only show high-priority blockers")
    .action(async (opts: { project?: string; blockersOnly?: boolean }) => {
      try {
        const result = await todoCommand({
          action: "list",
          project: opts.project,
          blockersOnly: opts.blockersOnly,
        }, await createScopedCtx());
        for (const todo of result.todos) {
          const marker = todo.completed ? "[x]" : "[ ]";
          const priority = todo.priority === "high" ? "P0" : todo.priority === "low" ? "P2" : "P1";
          console.log(`${marker} [${priority}] ${todo.text}`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  todoCmd
    .command("add <text>")
    .description("Add a todo")
    .option("-p, --project <slug>", "Project slug")
    .option("--priority <level>", "Priority: high|medium|low", "medium")
    .action(async (text: string, opts: { project?: string; priority: string }) => {
      try {
        const validTodoPriorities = ["high", "medium", "low"] as const;
        if (!validTodoPriorities.includes(opts.priority as any)) {
          throw new Error(`--priority must be one of: ${validTodoPriorities.join(", ")}`);
        }
        await todoCommand({
          action: "add",
          item: text,
          priority: opts.priority as "high" | "medium" | "low",
          project: opts.project,
        }, await createScopedCtx());
        console.log(`Added: ${text}`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  todoCmd
    .command("complete <text>")
    .description("Complete a todo")
    .option("-p, --project <slug>", "Project slug")
    .action(async (text: string, opts: { project?: string }) => {
      try {
        await todoCommand({
          action: "complete",
          item: text,
          project: opts.project,
        }, await createScopedCtx());
        console.log(`Completed: ${text}`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── task ──────────────────────────────────────────────
  const taskCmd = program
    .command("task")
    .description("Manage project tasks (kanban board)");

  taskCmd
    .command("list")
    .description("List tasks")
    .option("-p, --project <slug>", "Project slug")
    .option("-s, --status <status>", "Filter by status")
    .option("--priority <level>", "Filter by priority")
    .option("--assigned-to <tool>", "Filter by assignee")
    .action(async (opts: { project?: string; status?: string; priority?: string; assignedTo?: string }) => {
      try {
        const validPriorities = ["p0", "p1", "p2"] as const;
        const validStatuses = ["backlog", "in-progress", "blocked", "done", "cancelled"] as const;
        if (opts.priority && !validPriorities.includes(opts.priority as any)) {
          throw new Error(`--priority must be one of: ${validPriorities.join(", ")}`);
        }
        if (opts.status && !validStatuses.includes(opts.status as any)) {
          throw new Error(`--status must be one of: ${validStatuses.join(", ")}`);
        }
        const result = await taskCommand({
          action: "list",
          project: opts.project,
          status: opts.status as TaskStatus | undefined,
          priority: opts.priority as TaskPriority | undefined,
          assignedTo: opts.assignedTo,
        }, await createScopedCtx());
        if (!result.tasks?.length) {
          console.log("No tasks found.");
          return;
        }
        for (const t of result.tasks) {
          const blocked = t.blocked_by.length > 0 ? " [BLOCKED]" : "";
          console.log(`[${t.id}] [${t.priority}] [${t.status}]${blocked} ${t.title}`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  taskCmd
    .command("add <title>")
    .description("Add a task")
    .option("-p, --project <slug>", "Project slug")
    .option("--priority <level>", "Priority: p0|p1|p2", "p1")
    .option("--blocked-by <ids...>", "Task IDs that block this task")
    .option("--assigned-to <tool>", "Assignee: claude-code|opencode|codex|human")
    .option("--tags <tags>", "Comma-separated tags")
    .action(async (title: string, opts: { project?: string; priority: string; blockedBy?: string[]; assignedTo?: string; tags?: string }) => {
      try {
        const validPriorities = ["p0", "p1", "p2"] as const;
        if (!validPriorities.includes(opts.priority as any)) {
          throw new Error(`--priority must be one of: ${validPriorities.join(", ")}`);
        }
        const tags = opts.tags ? opts.tags.split(",").map((t) => t.trim()) : undefined;
        const result = await taskCommand({
          action: "add",
          title,
          project: opts.project,
          priority: opts.priority as TaskPriority,
          blockedBy: opts.blockedBy,
          assignedTo: opts.assignedTo,
          tags,
        }, await createScopedCtx());
        console.log(JSON.stringify({ task_id: result.task_id, path: result.path }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  taskCmd
    .command("update <task-id>")
    .description("Update a task")
    .option("-p, --project <slug>", "Project slug")
    .option("-s, --status <status>", "New status")
    .option("--priority <level>", "New priority")
    .option("--blocked-by <ids...>", "New blocked-by list")
    .option("--assigned-to <tool>", "New assignee")
    .option("-t, --title <text>", "New title")
    .action(async (taskId: string, opts: { project?: string; status?: string; priority?: string; blockedBy?: string[]; assignedTo?: string; title?: string }) => {
      try {
        const validPriorities = ["p0", "p1", "p2"] as const;
        const validStatuses = ["backlog", "in-progress", "blocked", "done", "cancelled"] as const;
        if (opts.priority && !validPriorities.includes(opts.priority as any)) {
          throw new Error(`--priority must be one of: ${validPriorities.join(", ")}`);
        }
        if (opts.status && !validStatuses.includes(opts.status as any)) {
          throw new Error(`--status must be one of: ${validStatuses.join(", ")}`);
        }
        const result = await taskCommand({
          action: "update",
          taskId,
          project: opts.project,
          status: opts.status as TaskStatus | undefined,
          priority: opts.priority as TaskPriority | undefined,
          blockedBy: opts.blockedBy,
          assignedTo: opts.assignedTo,
          title: opts.title,
        }, await createScopedCtx());
        console.log(JSON.stringify({ task_id: result.task_id, updated_fields: result.updated_fields }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  taskCmd
    .command("board")
    .description("Show task board (kanban view)")
    .option("-p, --project <slug>", "Project slug")
    .action(async (opts: { project?: string }) => {
      try {
        const result = await taskCommand({
          action: "board",
          project: opts.project,
        }, await createScopedCtx());
        if (!result.board) return;

        for (const [status, tasks] of Object.entries(result.board)) {
          if (tasks.length === 0) continue;
          console.log(`\n=== ${status.toUpperCase()} (${tasks.length}) ===`);
          for (const t of tasks) {
            const blocked = t.blocked_by.length > 0 ? " [BLOCKED]" : "";
            const assignee = t.assigned_to ? ` @${t.assigned_to}` : "";
            console.log(`  [${t.id}] [${t.priority}]${blocked}${assignee} ${t.title}`);
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── learn ─────────────────────────────────────────────
  const learnCmd = program
    .command("learn")
    .description("Capture and query learnings");

  learnCmd
    .command("add")
    .description("Capture a learning")
    .requiredOption("-t, --title <text>", "Learning title")
    .requiredOption("-d, --discovery <text>", "What was discovered")
    .option("-p, --project <slug>", "Project slug")
    .option("--tags <tags>", "Comma-separated tags")
    .option("--confidence <level>", "Confidence: high|medium|low", "medium")
    .option("--source <tool>", "Source tool")
    .action(async (opts: { title: string; discovery: string; project?: string; tags?: string; confidence: string; source?: string }) => {
      try {
        const validConfidences = ["high", "medium", "low"] as const;
        if (!validConfidences.includes(opts.confidence as any)) {
          throw new Error(`--confidence must be one of: ${validConfidences.join(", ")}`);
        }
        const tags = opts.tags ? opts.tags.split(",").map((t) => t.trim()) : undefined;
        const result = await learnCommand({
          action: "add",
          title: opts.title,
          discovery: opts.discovery,
          project: opts.project,
          tags,
          confidence: opts.confidence as Confidence,
          source: opts.source,
        }, await createScopedCtx());
        console.log(JSON.stringify({ learning_id: result.learning_id, path: result.path }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  learnCmd
    .command("list")
    .description("List learnings")
    .option("-p, --project <slug>", "Project slug")
    .option("--tag <tag>", "Filter by tag")
    .action(async (opts: { project?: string; tag?: string }) => {
      try {
        const result = await learnCommand({
          action: "list",
          project: opts.project,
          tag: opts.tag,
        }, await createScopedCtx());
        if (!result.learnings?.length) {
          console.log(JSON.stringify({ learnings: [] }));
          return;
        }
        if (process.stdout.isTTY) {
          for (const l of result.learnings) {
            const tagStr = l.tags.length > 0 ? ` (${l.tags.join(", ")})` : "";
            console.log(`[${l.id}] [${l.confidence}] ${l.title}${tagStr} — ${l.created}`);
          }
        } else {
          console.log(JSON.stringify({ learnings: result.learnings }));
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── brainstorm ────────────────────────────────────────
  program
    .command("brainstorm <topic>")
    .description("Start or continue a brainstorm")
    .requiredOption("-c, --content <text>", "Brainstorm content to add")
    .option("-p, --project <slug>", "Project slug")
    .action(async (topic: string, opts: { content: string; project?: string }) => {
      try {
        const result = await brainstormCommand({
          topic,
          content: opts.content,
          project: opts.project,
        }, await createScopedCtx());
        console.log(JSON.stringify(result));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── session ───────────────────────────────────────────
  const sessionCmd = program
    .command("session")
    .description("Manage agent sessions (swarming coordination)");

  sessionCmd
    .command("register")
    .description("Register a new agent session")
    .requiredOption("--tool <name>", "Tool name: claude-code|opencode|codex")
    .option("-p, --project <slug>", "Project being worked on")
    .option("--task <summary>", "Task summary")
    .option("--files <paths...>", "Files being touched")
    .action(async (opts: { tool: string; project?: string; task?: string; files?: string[] }) => {
      try {
        const result = await sessionCommand({
          action: "register",
          tool: opts.tool,
          project: opts.project,
          taskSummary: opts.task,
          filesTouched: opts.files,
        }, await createScopedCtx());
        console.log(JSON.stringify(result, null, 2));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  sessionCmd
    .command("heartbeat <session-id>")
    .description("Update session heartbeat")
    .action(async (sessionId: string) => {
      try {
        await sessionCommand({ action: "heartbeat", sessionId }, await createScopedCtx());
        console.log("Heartbeat updated");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  sessionCmd
    .command("complete <session-id>")
    .description("Mark session as completed")
    .option("--summary <text>", "Session summary")
    .option("--outcome <text>", "Session outcome")
    .option("--files <paths...>", "Files touched during session")
    .option("--tasks <ids...>", "Task IDs completed")
    .option("-p, --project <slug>", "Project slug")
    .action(async (sessionId: string, opts: { summary?: string; outcome?: string; files?: string[]; tasks?: string[]; project?: string }) => {
      try {
        const result = await sessionCommand({
          action: "complete",
          sessionId,
          taskSummary: opts.summary,
          outcome: opts.outcome,
          filesTouched: opts.files,
          tasksCompleted: opts.tasks,
          project: opts.project,
        }, await createScopedCtx());
        console.log("Session completed");
        if (result.session_note_path) {
          console.log(`Session note: ${result.session_note_path}`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  sessionCmd
    .command("list")
    .description("List active sessions")
    .action(async () => {
      try {
        const result = await sessionCommand({ action: "list_active" }, await createScopedCtx());
        if (!result.active_sessions?.length) {
          console.log("No active sessions");
          return;
        }
        for (const s of result.active_sessions) {
          console.log(`[${s.tool}] ${s.project ?? "unknown"}: ${s.task_summary ?? "no task"} (${s.id})`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── graph ─────────────────────────────────────────────
  const graphCmd = program
    .command("graph")
    .description("Knowledge graph traversal");

  graphCmd
    .command("rebuild")
    .description("Rebuild SQLite FTS5 + edges index from markdown")
    .option("-p, --project <slug>", "Project slug")
    .action(async (opts: { project?: string }) => {
      try {
        const { knowledgeRebuildCommand } = await import("./commands/knowledge.js");
        const result = await knowledgeRebuildCommand({ project: opts.project }, await createScopedCtx());
        console.log(JSON.stringify(result, null, 2));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  graphCmd
    .command("viz")
    .description("Write knowledge-graph.html (browser) and knowledge-graph.canvas (Obsidian)")
    .option("-p, --project <slug>", "Project slug")
    .action(async (opts: { project?: string }) => {
      try {
        const { knowledgeVizCommand } = await import("./commands/knowledge.js");
        const ctx = await createScopedCtx();
        const result = await knowledgeVizCommand({ project: opts.project }, ctx);
        console.log(JSON.stringify(result, null, 2));
        const htmlAbs = `${ctx.vaultPath}/${result.html}`;
        const diagAbs = `${ctx.vaultPath}/${result.diagrams}`;
        console.log(`\nDiagrams (HLA / LLA / ERD):\n  open "${diagAbs}"`);
        console.log(`Interactive graph:\n  open "${htmlAbs}"`);
        console.log(`Obsidian: vault root = ${ctx.vaultPath}, then open ${result.canvas}`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  program
    .command("qa")
    .description("In-harness browser QA")
    .command("viz")
    .description("Generate graph HTML and click through it in system Chrome")
    .option("-p, --project <slug>", "Project slug")
    .action(async (opts: { project?: string }) => {
      try {
        const { qaVizCommand } = await import("./commands/qa.js");
        const ctx = await createScopedCtx();
        const result = await qaVizCommand({ project: opts.project }, ctx);
        console.log(JSON.stringify(result, null, 2));
        if (!result.qa.ok) process.exitCode = 1;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  graphCmd
    .command("related <path>")
    .description("Get backlinks and outgoing links for a note")
    .option("--hops <number>", "Traversal depth", "1")
    .action(async (path: string, opts: { hops: string }) => {
      try {
        const hops = parseInt(opts.hops, 10);
        if (Number.isNaN(hops) || hops < 1) {
          throw new Error("--hops must be a positive integer");
        }
        const result = await graphRelatedCommand({ path, hops }, await createScopedCtx());
        console.log(JSON.stringify(result, null, 2));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  graphCmd
    .command("cross-project <query>")
    .description("Search across all projects")
    .option("-l, --limit <number>", "Max results", "20")
    .action(async (query: string, opts: { limit: string }) => {
      try {
        const limit = parseInt(opts.limit, 10);
        if (Number.isNaN(limit) || limit < 1) {
          throw new Error("--limit must be a positive integer");
        }
        const grouped = await graphCrossProjectCommand({ query, limit }, await createScopedCtx());
        for (const [project, results] of Object.entries(grouped)) {
          console.log(`\n${project} (${results.length} matches):`);
          for (const r of results) {
            console.log(`  ${r.path}: ${r.snippet.slice(0, 100)}`);
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── prune ─────────────────────────────────────────────
  program
    .command("prune")
    .description("Archive or delete stale vault content")
    .option("-p, --project <slug>", "Project slug")
    .option("-a, --all", "Prune all projects")
    .option("-m, --mode <mode>", "Mode: dry-run|archive|delete", "dry-run")
    .option("--sessions <days>", "Session retention in days", "30")
    .option("--done-tasks <days>", "Done task retention in days", "30")
    .option("--todos <days>", "Completed todo retention in days (0=keep)", "0")
    .action(async (opts: { project?: string; all?: boolean; mode: string; sessions: string; doneTasks: string; todos: string }) => {
      try {
        const validModes = ["dry-run", "archive", "delete"] as const;
        if (!validModes.includes(opts.mode as any)) {
          throw new Error(`--mode must be one of: ${validModes.join(", ")}`);
        }
        const policy: Partial<RetentionPolicy> = {
          sessions: parseInt(opts.sessions, 10) || 30,
          doneTasks: parseInt(opts.doneTasks, 10) || 30,
          todos: parseInt(opts.todos, 10) || 0,
        };
        const results = await pruneCommand({
          project: opts.project,
          mode: opts.mode as "dry-run" | "archive" | "delete",
          policy,
          all: opts.all,
        }, await createScopedCtx());
        for (const r of results) {
          console.log(`\n=== ${r.project} ===`);
          console.log(`  Scanned: ${r.stats.sessions_scanned} sessions, ${r.stats.tasks_scanned} tasks`);
          if (r.archived.length > 0) {
            console.log(`  ${opts.mode === "dry-run" ? "Would archive" : "Archived"}: ${r.archived.length} items`);
            for (const a of r.archived) console.log(`    ${a.from} → ${a.to}`);
          }
          if (r.deleted.length > 0) {
            console.log(`  ${opts.mode === "dry-run" ? "Would delete" : "Deleted"}: ${r.deleted.length} items`);
            for (const d of r.deleted) console.log(`    ${d}`);
          }
          if (r.archived.length === 0 && r.deleted.length === 0) {
            console.log("  Nothing to prune.");
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── stats ─────────────────────────────────────────────
  program
    .command("stats")
    .description("Show vault content statistics for a project")
    .option("-p, --project <slug>", "Project slug")
    .action(async (opts: { project?: string }) => {
      try {
        const result = await statsCommand({ project: opts.project }, await createScopedCtx());
        console.log(`\n=== ${result.project} ===`);
        console.log(`  Sessions:    ${result.sessions}`);
        console.log(`  Tasks:       ${result.tasks.total} (backlog: ${result.tasks.backlog}, in-progress: ${result.tasks.inProgress}, done: ${result.tasks.done}, cancelled: ${result.tasks.cancelled})`);
        console.log(`  Learnings:   ${result.learnings}`);
        console.log(`  ADRs:        ${result.adrs}`);
        console.log(`  Brainstorms: ${result.brainstorms}`);
        console.log(`  Total files: ${result.totalFiles}`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── deprecate ─────────────────────────────────────────
  program
    .command("deprecate <path>")
    .description("Mark a vault item as deprecated")
    .option("-r, --reason <text>", "Reason for deprecation")
    .action(async (path: string, opts: { reason?: string }) => {
      try {
        const result = await deprecateCommand({ path, reason: opts.reason }, await createScopedCtx());
        console.log(`Deprecated: ${result.path} (status: ${result.status})`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── resume ────────────────────────────────────────────
  program
    .command("resume")
    .description("Get resume context for continuing work — shows recent sessions, interrupted work, next steps")
    .option("-p, --project <slug>", "Project slug")
    .option("-l, --limit <number>", "Number of recent sessions to show", "5")
    .option("--json", "Output as JSON instead of markdown")
    .action(async (opts: { project?: string; limit: string; json?: boolean }) => {
      try {
        const limit = parseInt(opts.limit, 10);
        if (Number.isNaN(limit) || limit < 1) {
          throw new Error("--limit must be a positive integer");
        }
        const result = await resumeCommand({ project: opts.project, limit }, await createScopedCtx());
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(formatResumeContext(result));
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── skill ────────────────────────────────────────────
  const skillCmd = program
    .command("skill")
    .description("Initialize and activate skills via knowledge graph");

  skillCmd
    .command("init")
    .description("Initialize superskill for the current project")
    .option("--bridge", "Enable native skill bridge (replaces native skill files with superskill redirects)")
    .option("--slug <name>", "Vault project slug for auto-detection (default: repo directory name)")
    .action(async (opts: { bridge?: boolean; slug?: string }) => {
      try {
        const result = await initProject({ bridge: opts.bridge, slug: opts.slug }, await createScopedCtx());
        if (result.success) {
          console.log(`Initialized superskill graph:`);
          console.log(`  Stack: ${result.project_stack.join(", ") || "(none detected)"}`);
          console.log(`  Tools: ${result.project_tools.join(", ") || "(none detected)"}`);
          console.log(`  Native skills: ${result.native_skills_found}`);
          console.log(`  Discovered: ${result.skills_discovered}`);
          console.log(`  Blocked: ${result.skills_blocked}`);
          console.log(`  Graph: ${result.graph_path}`);
          if (result.vault_slug !== undefined) {
            console.log(`  Vault mapping: ${result.vault_slug} (${result.vault_mapping})`);
          } else if (result.vault_mapping_error !== undefined) {
            console.log(`  Vault mapping skipped: ${result.vault_mapping_error}`);
          }
        } else {
          console.error(`Init failed: ${result.error}`);
          process.exit(1);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  skillCmd
    .command("activate [task]")
    .description("Activate the best skill for a task")
    .option("--skill-id <id>", "Load a specific skill by ID")
    .action(async (task: string | undefined, opts: { skillId?: string }) => {
      try {
        const result = await activateSkills({ task, skill_id: opts.skillId }, await createScopedCtx());
        if (!result.success && result.error) {
          process.stderr.write(`Error: ${result.error}\n`);
          process.exit(1);
        }
        if (result.skills_loaded.length === 0) {
          process.stderr.write(result.content ? result.content + "\n" : `No skills matched for: "${task}"\n`);
          return;
        }
        process.stderr.write(`Loaded ${result.skills_loaded.length} skill(s)\n`);
        for (const s of result.skills_loaded) {
          process.stderr.write(`  -> ${s.id} (${s.source})\n`);
        }
        process.stderr.write(`  ~${result.total_tokens} tokens\n`);
        process.stdout.write(result.content);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        process.stderr.write(`Error: ${msg}\n`);
        process.exit(1);
      }
    });

  skillCmd
    .command("install <source>")
    .description("Install skills from a GitHub repo (e.g. owner/repo or full URL)")
    .option("--select <skills>", "Comma-separated list of skill names to install")
    .action(async (source: string, opts: { select?: string }) => {
      try {
        const parsed = parseSource(source);
        if (!parsed) {
          console.error(`Invalid source: "${source}". Use owner/repo or a GitHub URL.`);
          process.exit(1);
        }
        console.log(`Cloning ${parsed.owner}/${parsed.repo}...`);
        const selectSkills = opts.select ? opts.select.split(",").map((s) => s.trim()) : undefined;
        const result = await installSkills(source, { selectSkills });
        if (result.blocked.length > 0) {
          console.error(`\nBlocked skills (failed security audit):`);
          for (const b of result.blocked) {
            console.error(`  ✗ ${b}`);
          }
        }
        if (result.warnings.length > 0) {
          console.error(`\nWarnings:`);
          for (const w of result.warnings) {
            console.error(`  ⚠ ${w}`);
          }
        }
        if (result.success) {
          console.log(`\nInstalled ${result.installed.length} skill(s):`);
          for (const name of result.installed) {
            console.log(`  + ${name}`);
          }
        } else {
          console.error(`\nInstall failed:`);
          for (const err of result.errors) {
            console.error(`  - ${err}`);
          }
          process.exit(1);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  skillCmd
    .command("list")
    .description("List installed skills")
    .action(async () => {
      try {
        const skills = await listInstalledSkills();
        if (skills.length === 0) {
          console.log("No skills installed. Use: superskill skill install <owner/repo>");
          return;
        }
        console.log(`Installed skills (${skills.length}):`);
        for (const s of skills) {
          console.log(`  ${s.name}: ${s.description || "(no description)"}`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  skillCmd
    .command("remove <name>")
    .description("Remove an installed skill by name")
    .action(async (name: string) => {
      try {
        const result = await removeSkill(name);
        if (result.success) {
          console.log(`Removed skill: ${name}`);
        } else {
          console.error(`Error: ${result.error}`);
          process.exit(1);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  skillCmd
    .command("status")
    .description("Show knowledge graph status")
    .action(async () => {
      try {
        const result = await statusCommand({}, await createScopedCtx());
        if (!result.initialized) {
          console.log("Superskill not initialized. Run: superskill skill init");
          return;
        }
        console.log(`Project: stack=[${result.project?.stack.join(", ") ?? ""}] tools=[${result.project?.tools.join(", ") ?? ""}] phase=${result.project?.phase}`);
        console.log(`\nSkills (${result.skills.length}):`);
        for (const s of result.skills) {
          console.log(`  ${s.id} w=${s.w} source=${s.source} audit=${s.audit_summary}`);
        }
        if (result.sessions.length > 0) {
          console.log(`\nRecent sessions (${result.sessions.length}):`);
          for (const s of result.sessions) {
            const ago = getTimeAgo(new Date(s.ts).toISOString());
            console.log(`  ${s.id} [${s.outcome ?? "active"}] ${ago} — ${s.intent.slice(0, 60)}`);
          }
        }
        console.log(`\nTotal activations: ${result.total_activations}`);
        console.log(`Graph: ${result.graph_path}`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── spec ─────────────────────────────────────────────
  const specCmd = program
    .command("spec")
    .description("Deterministic plan specs (skeleton + gates)");

  specCmd
    .command("create")
    .description("Create a draft spec skeleton")
    .requiredOption("-t, --title <text>", "Spec title")
    .option("--goal <text>", "Goal", "")
    .option("--non-goals <items...>", "Explicitly out of scope")
    .option("--constraints <items...>", "Hard constraints")
    .option("--context <text>", "Background context", "")
    .option("--allowed-files <globs...>", "Globs this work may touch")
    .option("--forbidden-files <globs...>", "Globs this work must not touch")
    .option("--acceptance <items...>", "Acceptance: 'text | run: cmd' or 'text | manual: reason'")
    .option("--risks <items...>", "Known risks")
    .option("--rollback <text>", "How to undo this work", "")
    .option("-p, --project <slug>", "Project slug")
    .action(async (opts: {
      title: string;
      goal: string;
      nonGoals?: string[];
      constraints?: string[];
      context: string;
      allowedFiles?: string[];
      forbiddenFiles?: string[];
      acceptance?: string[];
      risks?: string[];
      rollback: string;
      project?: string;
    }) => {
      try {
        const result = await specCommand({
          action: "create",
          title: opts.title,
          goal: opts.goal,
          nonGoals: opts.nonGoals,
          constraints: opts.constraints,
          context: opts.context,
          allowedFiles: opts.allowedFiles,
          forbiddenFiles: opts.forbiddenFiles,
          acceptance: opts.acceptance?.map(parseAcceptanceItem),
          risks: opts.risks,
          rollback: opts.rollback,
          project: opts.project,
        }, await createScopedCtx());
        console.log(JSON.stringify(result, null, 2));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  specCmd
    .command("status <ref>")
    .description("Show spec gaps and hash state")
    .option("-p, --project <slug>", "Project slug")
    .action(async (ref: string, opts: { project?: string }) => {
      try {
        const result = await specCommand({ action: "status", spec: ref, project: opts.project }, await createScopedCtx());
        console.log(JSON.stringify(result, null, 2));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  specCmd
    .command("approve <ref>")
    .description("Approve a gap-free spec")
    .option("-p, --project <slug>", "Project slug")
    .action(async (ref: string, opts: { project?: string }) => {
      try {
        const result = await specCommand({ action: "approve", spec: ref, project: opts.project }, await createScopedCtx());
        console.log(JSON.stringify(result, null, 2));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  specCmd
    .command("freeze <ref>")
    .description("Freeze an approved spec (pins content hash, makes it immutable)")
    .option("-p, --project <slug>", "Project slug")
    .action(async (ref: string, opts: { project?: string }) => {
      try {
        const result = await specCommand({ action: "freeze", spec: ref, project: opts.project }, await createScopedCtx());
        console.log(JSON.stringify(result, null, 2));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  specCmd
    .command("list")
    .description("List project specs")
    .option("-p, --project <slug>", "Project slug")
    .action(async (opts: { project?: string }) => {
      try {
        const result = await specCommand({ action: "list", project: opts.project }, await createScopedCtx());
        if (!result.specs?.length) {
          console.log("No specs found.");
          return;
        }
        for (const spec of result.specs) {
          console.log(`[${spec.spec_id ?? "?"}] [${spec.status}] ${spec.title ?? spec.path}`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── tickets ──────────────────────────────────────────
  function parseTicketInputs(json: string): TicketInput[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error(`Invalid JSON in --tickets: ${json}`);
    }
    if (!Array.isArray(parsed)) throw new Error("--tickets must be a JSON array");

    return parsed.map((raw, index) => {
      if (raw === null || typeof raw !== "object") {
        throw new Error(`--tickets[${index}] must be an object`);
      }
      const obj = raw as Record<string, unknown>;
      const acceptance = Array.isArray(obj.acceptance)
        ? obj.acceptance.map((item) => (typeof item === "string" ? parseAcceptanceItem(item) : item))
        : undefined;
      return {
        title: typeof obj.title === "string" ? obj.title : "",
        acceptance: acceptance as TicketInput["acceptance"],
        blockedBy: Array.isArray(obj.blocked_by)
          ? obj.blocked_by.filter((v): v is string => typeof v === "string")
          : undefined,
        requiresReview: obj.requires_review === true,
      };
    });
  }

  const ticketsCmd = program
    .command("tickets")
    .description("Tickets derived from frozen specs");

  ticketsCmd
    .command("create")
    .description("Create tickets from a frozen spec")
    .requiredOption("--spec <ref>", "Frozen spec reference")
    .requiredOption("--tickets <json>", "JSON array of {title, acceptance, blocked_by, requires_review}")
    .option("-p, --project <slug>", "Project slug")
    .action(async (opts: { spec: string; tickets: string; project?: string }) => {
      try {
        const result = await ticketsCommand({
          action: "create",
          spec: opts.spec,
          tickets: parseTicketInputs(opts.tickets),
          project: opts.project,
        }, await createScopedCtx());
        console.log(JSON.stringify(result, null, 2));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  ticketsCmd
    .command("list")
    .description("List tickets")
    .option("-p, --project <slug>", "Project slug")
    .action(async (opts: { project?: string }) => {
      try {
        const result = await ticketsCommand({ action: "list", project: opts.project }, await createScopedCtx());
        if (!result.tickets?.length) {
          console.log("No tickets found.");
          return;
        }
        for (const t of result.tickets) {
          const blocked = t.blocked_by.length > 0 ? ` blocked_by=${t.blocked_by.join(",")}` : "";
          const review = t.requires_review ? " [review]" : "";
          console.log(`[${t.id}] [${t.status}]${review}${blocked} ${t.title}`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  ticketsCmd
    .command("board")
    .description("Show ticket board")
    .option("-p, --project <slug>", "Project slug")
    .action(async (opts: { project?: string }) => {
      try {
        const result = await ticketsCommand({ action: "board", project: opts.project }, await createScopedCtx());
        if (!result.board) return;
        for (const [status, tickets] of Object.entries(result.board)) {
          if (tickets.length === 0) continue;
          console.log(`\n=== ${status.toUpperCase()} (${tickets.length}) ===`);
          for (const t of tickets) {
            console.log(`  [${t.id}] ${t.title}`);
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  ticketsCmd
    .command("ready")
    .description("List unblocked tickets in deterministic topological order")
    .option("-p, --project <slug>", "Project slug")
    .action(async (opts: { project?: string }) => {
      try {
        const result = await ticketsCommand({ action: "ready", project: opts.project }, await createScopedCtx());
        if (!result.ready?.length) {
          console.log("No ready tickets.");
          return;
        }
        for (const t of result.ready) {
          console.log(`[${t.id}] ${t.title}`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  ticketsCmd
    .command("update <ticket-id>")
    .description("Update a ticket")
    .option("-p, --project <slug>", "Project slug")
    .option("-s, --status <status>", "New status")
    .action(async (ticketId: string, opts: { project?: string; status?: string }) => {
      try {
        const validStatuses = ["backlog", "in-progress", "blocked", "done", "cancelled"] as const;
        if (opts.status && !validStatuses.includes(opts.status as (typeof validStatuses)[number])) {
          throw new Error(`--status must be one of: ${validStatuses.join(", ")}`);
        }
        const result = await ticketsCommand({
          action: "update",
          ticketId,
          status: opts.status as TicketStatus | undefined,
          project: opts.project,
        }, await createScopedCtx());
        console.log(JSON.stringify({ ticket_id: result.ticket_id, updated_fields: result.updated_fields }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── evidence ─────────────────────────────────────────
  const evidenceCmd = program
    .command("evidence")
    .description("Record and read ticket evidence");

  evidenceCmd
    .command("add <ticket>")
    .description("Append an evidence record for a ticket")
    .requiredOption("-c, --command <cmd>", "Command that was run")
    .option("--exit <code>", "Exit code", "0")
    .option("--output <text>", "Command output (truncated when stored)", "")
    .option("--commit <hash>", "Commit the evidence applies to (default: git HEAD)")
    .option("--cwd <path>", "Directory used for the git HEAD lookup")
    .option("-p, --project <slug>", "Project slug")
    .action(async (ticket: string, opts: { command: string; exit: string; output: string; commit?: string; cwd?: string; project?: string }) => {
      try {
        const exitCode = parseInt(opts.exit, 10);
        if (Number.isNaN(exitCode)) throw new Error("--exit must be a number");
        const result = await evidenceCommand({
          action: "add",
          ticket,
          command: opts.command,
          exit: exitCode,
          output: opts.output,
          commit: opts.commit,
          cwd: opts.cwd,
          project: opts.project,
        }, await createScopedCtx());
        console.log(JSON.stringify({ ticket: result.ticket, path: result.path, count: result.count }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  evidenceCmd
    .command("list <ticket>")
    .description("List evidence records for a ticket")
    .option("-p, --project <slug>", "Project slug")
    .action(async (ticket: string, opts: { project?: string }) => {
      try {
        const result = await evidenceCommand({ action: "list", ticket, project: opts.project }, await createScopedCtx());
        console.log(JSON.stringify({ ticket: result.ticket, path: result.path, count: result.count, evidence: result.evidence }, null, 2));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── gate ─────────────────────────────────────────────
  program
    .command("gate")
    .description("Deterministic evidence gates")
    .command("check <target>")
    .description("Check a spec or ticket; exits non-zero on failure")
    .option("--ci", "CI mode: JSON output")
    .option("--head <hash>", "Override HEAD commit for the evidence check")
    .option("--cwd <path>", "Directory used for the git HEAD lookup")
    .option("-p, --project <slug>", "Project slug")
    .action(async (target: string, opts: { ci?: boolean; head?: string; cwd?: string; project?: string }) => {
      try {
        const result = await gateCommand({
          target,
          head: opts.head,
          cwd: opts.cwd,
          project: opts.project,
        }, await createScopedCtx());
        if (opts.ci) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`${result.pass ? "PASS" : "FAIL"} ${result.kind} ${result.target}`);
          for (const item of result.missing) {
            console.log(`  - ${item}`);
          }
        }
        if (!result.pass) process.exitCode = 1;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── impact ───────────────────────────────────────────
  program
    .command("impact <target>")
    .description("Deterministic code-graph impact: definitions, importers, callers, shortest path")
    .option("-t, --to <target>", "Second target; when given, include the shortest graph path")
    .option("-r, --root <path>", "Scan root (default: cwd)")
    .action(async (target: string, opts: { to?: string; root?: string }) => {
      try {
        const result = await impactCommand({ target, to: opts.to, root: opts.root });
        console.log(JSON.stringify(result, null, 2));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── claims ───────────────────────────────────────────
  program
    .command("claims")
    .description("Verify structured claims against a deterministic code-graph scan")
    .requiredOption("-c, --claims <json>", "JSON array of claims")
    .option("-r, --root <path>", "Scan root (default: cwd)")
    .action(async (opts: { claims: string; root?: string }) => {
      try {
        let claims: unknown;
        try {
          claims = JSON.parse(opts.claims);
        } catch {
          throw new Error("--claims must be valid JSON");
        }
        const result = await claimsCommand({ claims, root: opts.root });
        console.log(JSON.stringify(result, null, 2));
        if (result.summary.refuted > 0) process.exitCode = 1;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── telemetry ────────────────────────────────────────
  const telemetryCmd = program
    .command("telemetry")
    .description("Local, opt-in telemetry for rule-selection effectiveness");

  async function runTelemetry(action: TelemetryAction, top?: number): Promise<void> {
    try {
      const result = await telemetryCommand({ action, top }, await createScopedCtx());
      if (result.report) console.log(result.report);
      console.log(result.message);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Error: ${msg}`);
      process.exit(1);
    }
  }

  telemetryCmd
    .command("status")
    .description("Show whether telemetry is enabled and how many events exist")
    .action(async () => {
      await runTelemetry("status");
    });

  telemetryCmd
    .command("enable")
    .description("Opt in: record rule-selection events locally (never uploaded)")
    .action(async () => {
      await runTelemetry("enable");
    });

  telemetryCmd
    .command("disable")
    .description("Opt out: stop recording events; existing events stay on disk")
    .action(async () => {
      await runTelemetry("disable");
    });

  telemetryCmd
    .command("report")
    .description("Aggregate local events: top-selected, most-dropped, never-selected rules")
    .option("--top <n>", "Rows per selection/drop list", "20")
    .action(async (opts: { top: string }) => {
      const top = parseInt(opts.top, 10);
      if (Number.isNaN(top) || top < 0) {
        console.error("Error: --top must be a non-negative integer");
        process.exit(1);
      }
      await runTelemetry("report", top);
    });

  telemetryCmd
    .command("clear")
    .description("Delete all local telemetry events")
    .action(async () => {
      await runTelemetry("clear");
    });

  // ── register ─────────────────────────────────────────
  program
    .command("register [path]")
    .description("Map a repo to a vault project so commands auto-detect without -p (vault project-map.json)")
    .option("-s, --slug <name>", "Project slug (default: keep existing mapping or repo directory name)")
    .action(async (path: string | undefined, opts: { slug?: string }) => {
      try {
        const result = await registerCommand({ path, slug: opts.slug }, await createCtx());
        console.log(`Registered ${result.key} -> ${result.slug}${result.changed ? "" : " (unchanged)"}`);
        if (result.previous !== null && result.previous !== result.slug) {
          console.log(`  previous: ${result.previous}`);
        }
        console.log(`  map: ${result.map_path}`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── doctor ───────────────────────────────────────────
  program
    .command("doctor")
    .description(
      "Health check: install vs running MCP servers, vault + mapping, project graph isolation, catalog, toolchains, telemetry, clients"
    )
    .option("--json", "machine-readable output")
    .action(async (opts: { json?: boolean }) => {
      try {
        const result = await doctorCommand({}, await createCtx());
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(renderDoctor(result));
        }
        if (!result.healthy) process.exitCode = 1;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  // ── worktree ─────────────────────────────────────────
  const worktreeCmd = program
    .command("worktree")
    .description(
      "Worktree cache management: project-wise by default (use --all for every repo), reports by default, and cleanup never deletes — reclaimed dirs are quarantined with an undo journal"
    )
    .addHelpText(
      "after",
      "\nExamples:\n  $ superskill-cli worktree status\n  $ superskill-cli worktree gc --all --older-than 30d\n  $ superskill-cli worktree audit --sizes --json"
    );

  worktreeCmd
    .command("env")
    .description("Print worktree environment variables for the current directory (shell exports by default)")
    .option("--json", "Print the full result as JSON instead of shell exports")
    .option("--shell <shell>", "Shell syntax: sh|fish|powershell (default: sh)")
    .option("--providers <ids...>", "Only emit variables for these providers (space or comma separated)")
    .option("--eval", "Print export statements (default; explicit for shell integration)")
    .addHelpText(
      "after",
      "\nExamples:\n  $ superskill-cli worktree env\n  $ eval \"$(superskill-cli worktree env --eval)\"\n  $ superskill-cli worktree env --shell fish --providers rust,node"
    )
    .action(async (opts: { json?: boolean; shell?: string; providers?: string[]; eval?: boolean }) => {
      try {
        const validShells = ["sh", "fish", "powershell"] as const;
        if (opts.shell !== undefined && !validShells.includes(opts.shell as (typeof validShells)[number])) {
          throw new Error(`--shell must be one of: ${validShells.join(", ")}`);
        }
        const providers = opts.providers
          ?.flatMap((id) => id.split(","))
          .map((id) => id.trim())
          .filter((id) => id.length > 0);
        const result = await worktreeEnvCommand({
          json: opts.json,
          shell: opts.shell as "sh" | "fish" | "powershell" | undefined,
          providers: providers && providers.length > 0 ? providers : undefined,
        }, await createScopedCtx());
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          process.stdout.write(renderWorktreeEnv(result));
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  worktreeCmd
    .command("audit")
    .description("Audit repo items and worktree cache dirs (report only; changes nothing)")
    .option("--json", "Print the audit as JSON")
    .option("--sizes", "Include cache directory sizes (slower)")
    .option("--worktree <name>", "Audit only this worktree path or name")
    .addHelpText(
      "after",
      "\nExamples:\n  $ superskill-cli worktree audit\n  $ superskill-cli worktree audit --sizes\n  $ superskill-cli worktree audit --json --worktree feat-login"
    )
    .action(async (opts: { json?: boolean; sizes?: boolean; worktree?: string }) => {
      try {
        const result = await worktreeAuditCommand({
          json: opts.json,
          sizes: opts.sizes,
          worktree: opts.worktree,
        }, await createScopedCtx());
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(renderWorktreeAudit(result));
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  worktreeCmd
    .command("status")
    .description("Show worktree status: cache usage, policy, hook and size budget (report only)")
    .option("--json", "Print the status as JSON")
    .option("--budget <size>", "Compare cache usage against a size budget, e.g. 2G or 500M")
    .addHelpText(
      "after",
      "\nExamples:\n  $ superskill-cli worktree status\n  $ superskill-cli worktree status --budget 2G\n  $ superskill-cli worktree status --json"
    )
    .action(async (opts: { json?: boolean; budget?: string }) => {
      try {
        const result = await worktreeStatusCommand({
          json: opts.json,
          budget: opts.budget,
        }, await createScopedCtx());
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(renderWorktreeStatus(result));
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  worktreeCmd
    .command("gc")
    .description(
      "Garbage-collect worktree caches: plan by default, quarantine with --apply, permanently purge quarantined dirs with --purge --yes, restore with --undo (nothing is deleted outright)"
    )
    .option("--all", "Plan across every repo in the cache root instead of just the current repo")
    .option("--worktree <name>", "Operate on this worktree path (default: current directory)")
    .option("--tool <tool...>", "Only consider these tools (space or comma separated)")
    .option("--project <name|path>", "Limit to a project slug from project-map.json")
    .option("--older-than <dur>", "Only candidates at least this old, e.g. 12h, 30d, 2w")
    .option("--min-age <dur>", "Alias for --older-than")
    .option("--newer-than <dur>", "Only candidates at most this old")
    .option("--min-size <size>", "Only candidates at least this large, e.g. 500M")
    .option("--max-size <size>", "Only candidates at most this large")
    .option("--tier <tier>", "Reclaim tier filter: auto|consent|both (default: both)")
    .option("--include <glob...>", "Only paths matching these globs")
    .option("--exclude <glob...>", "Skip paths matching these globs")
    .option("--keep-latest <n>", "Always keep the N most recent dirs per tool")
    .option("--apply", "Quarantine the selected dirs (reversible; journaled)")
    .option("--purge", "Permanently delete quarantined dirs older than 14 days")
    .option("--yes", "Confirm a destructive step (required with --purge)")
    .option("--undo <journalId>", "Restore a previous quarantine journal")
    .option("--json", "Print the full result as JSON")
    .option("--verbose", "Show per-path skip reasons instead of summaries")
    .addHelpText(
      "after",
      "\nExamples:\n  $ superskill-cli worktree gc --tool rust --older-than 30d --apply\n  $ superskill-cli worktree gc --all --min-size 500M --json\n  $ superskill-cli worktree gc --undo 2026-10-05T14-22-01.000Z-a1b2c3d4"
    )
    .action(async (opts: {
      all?: boolean;
      worktree?: string;
      tool?: string[];
      project?: string;
      olderThan?: string;
      minAge?: string;
      newerThan?: string;
      minSize?: string;
      maxSize?: string;
      tier?: string;
      include?: string[];
      exclude?: string[];
      keepLatest?: string;
      apply?: boolean;
      purge?: boolean;
      yes?: boolean;
      undo?: string;
      json?: boolean;
      verbose?: boolean;
    }) => {
      try {
        const validTiers = ["auto", "consent", "both"] as const;
        if (opts.tier !== undefined && !validTiers.includes(opts.tier as (typeof validTiers)[number])) {
          throw new Error(`--tier must be one of: ${validTiers.join(", ")}`);
        }
        let keepLatest: number | undefined;
        if (opts.keepLatest !== undefined) {
          keepLatest = parseInt(opts.keepLatest, 10);
          if (Number.isNaN(keepLatest) || keepLatest < 0) {
            throw new Error("--keep-latest must be a non-negative integer");
          }
        }
        const tools = opts.tool
          ?.flatMap((tool) => tool.split(","))
          .map((tool) => tool.trim())
          .filter((tool) => tool.length > 0);
        const result = await worktreeGcCommand({
          all: opts.all,
          worktree: opts.worktree,
          tool: tools && tools.length > 0 ? tools : undefined,
          project: opts.project,
          olderThan: opts.olderThan ?? opts.minAge,
          newerThan: opts.newerThan,
          minSize: opts.minSize,
          maxSize: opts.maxSize,
          tier: opts.tier as "auto" | "consent" | "both" | undefined,
          include: opts.include,
          exclude: opts.exclude,
          keepLatest,
          apply: opts.apply,
          purge: opts.purge,
          yes: opts.yes,
          undo: opts.undo,
          json: opts.json,
          verbose: opts.verbose,
        }, await createScopedCtx());
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(renderWorktreeGc(result));
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  worktreeCmd
    .command("activate")
    .description("Activate superskill for the current repo: policy, post-checkout hook, host adapters and cache seeding")
    .option("--yes", "Apply non-interactively (skip the consent prompt)")
    .option("--no-hooks", "Do not install the post-checkout hook")
    .option("--hosts <ids...>", "Only activate these host adapters (space or comma separated)")
    .option("--no-seed", "Do not seed worktree caches")
    .option("--install", "Install missing toolchain dependencies")
    .option("--dry-run", "Show what would change without writing anything")
    .option("--json", "Print the activation result as JSON")
    .addHelpText(
      "after",
      "\nExamples:\n  $ superskill-cli worktree activate --yes\n  $ superskill-cli worktree activate --dry-run\n  $ superskill-cli worktree activate --yes --hosts claude-code,opencode --no-seed"
    )
    .action(async (opts: {
      yes?: boolean;
      hooks?: boolean;
      hosts?: string[];
      seed?: boolean;
      install?: boolean;
      dryRun?: boolean;
      json?: boolean;
    }) => {
      try {
        const hosts = opts.hosts
          ?.flatMap((id) => id.split(","))
          .map((id) => id.trim())
          .filter((id) => id.length > 0);
        const result = await worktreeActivateCommand({
          yes: opts.yes,
          hooks: opts.hooks,
          hosts: hosts && hosts.length > 0 ? hosts : undefined,
          seed: opts.seed,
          install: opts.install,
          dryRun: opts.dryRun,
          json: opts.json,
        }, await createScopedCtx());
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(renderWorktreeActivate(result));
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  worktreeCmd
    .command("apply")
    .description("Apply audit items (--item or --all-safe): plan by default, execute with --yes")
    .option("--item <id...>", "Audit item id(s) to apply (space or comma separated)")
    .option("--all-safe", "Apply every safe item; consent items still need --item and --yes")
    .option("--yes", "Execute the plan (without it, apply only prints a plan)")
    .option("--json", "Print the plan/result as JSON")
    .addHelpText(
      "after",
      "\nExamples:\n  $ superskill-cli worktree apply --all-safe\n  $ superskill-cli worktree apply --item seed --yes\n  $ superskill-cli worktree apply --all-safe --yes --json"
    )
    .action(async (opts: { item?: string[]; allSafe?: boolean; yes?: boolean; json?: boolean }) => {
      try {
        const items = opts.item
          ?.flatMap((id) => id.split(","))
          .map((id) => id.trim())
          .filter((id) => id.length > 0);
        const result = await worktreeApplyCommand({
          item: items && items.length > 0 ? items : undefined,
          allSafe: opts.allSafe,
          yes: opts.yes,
          json: opts.json,
        }, await createScopedCtx());
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(renderWorktreeApply(result));
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  worktreeCmd
    .command("uninstall")
    .description("Uninstall superskill from the current repo (policy file is kept; caches are quarantined, never deleted)")
    .option("--purge-local", "Also quarantine this repo's worktree cache namespace")
    .option("--yes", "Confirm quarantine (required with --purge-local)")
    .option("--json", "Print the uninstall result as JSON")
    .addHelpText(
      "after",
      "\nExamples:\n  $ superskill-cli worktree uninstall\n  $ superskill-cli worktree uninstall --purge-local --yes\n  $ superskill-cli worktree uninstall --json"
    )
    .action(async (opts: { purgeLocal?: boolean; yes?: boolean; json?: boolean }) => {
      try {
        const result = await worktreeUninstallCommand({
          purgeLocal: opts.purgeLocal,
          yes: opts.yes,
          json: opts.json,
        }, await createScopedCtx());
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(renderWorktreeUninstall(result));
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  worktreeCmd
    .command("bootstrap")
    .description("[internal] Worktree bootstrap hook (post-checkout): seeds caches/env; never fails and always exits 0")
    .option("--source <source>", "Trigger source: worktree-create|session", "worktree-create")
    .option("--claude-env", "Append resolved env vars to CLAUDE_ENV_FILE (session source)")
    .option("--json", "Print the bootstrap result as JSON")
    .addHelpText(
      "after",
      "\nExamples:\n  $ superskill-cli worktree bootstrap --source worktree-create\n  $ superskill-cli worktree bootstrap --source session --claude-env\n  $ superskill-cli worktree bootstrap --json"
    )
    .action(async (opts: { source: string; claudeEnv?: boolean; json?: boolean }) => {
      try {
        const validSources = ["worktree-create", "session"] as const;
        if (!validSources.includes(opts.source as (typeof validSources)[number])) {
          throw new Error(`--source must be one of: ${validSources.join(", ")}`);
        }
        const result = await worktreeBootstrapCommand({
          source: opts.source as "worktree-create" | "session",
          json: opts.json,
          claudeEnv: opts.claudeEnv,
        }, await createScopedCtx());
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        }
      } catch (e: unknown) {
        if (opts.json) {
          const msg = e instanceof Error ? e.message : String(e);
          console.log(JSON.stringify({ skipped: true, reason: msg, worktreeRoot: process.cwd(), notes: [] }, null, 2));
        }
      }
    });

  // ── setup / teardown ─────────────────────────────────
  registerSetupCommands(program);

  return program;
}

export function isMainEntry(argv1: string | undefined, moduleUrl: string): boolean {
  if (argv1 === undefined) return false;
  let resolved: string;
  try {
    resolved = realpathSync(argv1);
  } catch {
    resolved = argv1;
  }
  return pathToFileURL(resolved).href === moduleUrl;
}

const isMain = isMainEntry(process.argv[1], import.meta.url);

if (isMain) {
  createProgram().parseAsync();
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});
