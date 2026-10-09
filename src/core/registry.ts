// SPDX-License-Identifier: Apache-2.0
import type { CommandContext, CommandHandler, CommandRegistration, MCPToolDefinition } from "./types.js";
import { readCommand, listCommand } from "../commands/read.js";
import { writeCommand } from "../commands/write.js";
import { searchCommand } from "../commands/search.js";
import { contextCommand } from "../commands/context.js";
import { decideCommand } from "../commands/decide.js";
import { brainstormCommand } from "../commands/brainstorm.js";
import { sessionCommand } from "../commands/session.js";
import { taskCommand } from "../commands/task.js";
import type { TaskStatus, TaskPriority } from "../commands/task.js";
import { learnCommand } from "../commands/learn.js";
import type { Confidence } from "../commands/learn.js";
import { pruneCommand, statsCommand, deprecateCommand } from "../commands/prune.js";
import { resumeCommand } from "../commands/resume.js";
import { initCommand } from "../commands/init.js";
import { initProject } from "../commands/skill/init.js";
import { activateSkills, compactActivationResult, type ActivateArgs } from "../commands/skill/activate.js";
import { statusCommand } from "../commands/skill/status.js";
import { graphRelatedCommand, graphCrossProjectCommand, graphTraverseCommand } from "../commands/graph.js";
import { knowledgeRebuildCommand, knowledgeVizCommand } from "../commands/knowledge.js";
import { qaVizCommand } from "../commands/qa.js";
import { linkCommand } from "../commands/link.js";
import { extractCommand } from "../commands/extract.js";
import { snapshotRepoState, envFactsCommand, credRefsCommand, rollbackCommand } from "../commands/snapshot.js";
import { captureCommand } from "../commands/capture.js";
import { listTemplates, applyTemplate } from "../lib/templates.js";
import { installSkills, listInstalledSkills, removeSkill } from "../lib/skill-installer.js";
import { specCommand, type SpecAction } from "../commands/spec.js";
import { ticketsCommand, type TicketInput } from "../commands/tickets.js";
import { evidenceCommand } from "../commands/evidence.js";
import { gateCommand } from "../commands/gate.js";
import { impactCommand } from "../commands/impact.js";
import { claimsCommand } from "../commands/claims.js";
import { telemetryCommand, type TelemetryAction } from "../commands/telemetry.js";
import { registerCommand } from "../commands/register.js";
import { doctorCommand } from "../commands/doctor.js";
import { worktreeEnvCommand } from "../commands/worktree/env.js";
import { worktreeAuditCommand } from "../commands/worktree/audit.js";
import { worktreeStatusCommand } from "../commands/worktree/status.js";
import { worktreeGcCommand } from "../commands/worktree/gc.js";
import { worktreeActivateCommand } from "../commands/worktree/activate.js";
import { worktreeApplyCommand } from "../commands/worktree/apply.js";
import { worktreeUninstallCommand } from "../commands/worktree/uninstall.js";
import { hygieneCommand } from "../commands/hygiene.js";
import { watchdogCommand, type WatchdogArgs } from "../commands/watchdog.js";
import { HYGIENE_CATEGORY_ORDER } from "../lib/hygiene/report.js";
import type { AcceptanceInput } from "../lib/gates/spec.js";
import type { TicketStatus } from "../lib/gates/tickets.js";

export type { CommandRegistration } from "./types.js";

export class CommandRegistry {
  private registrations = new Map<string, CommandRegistration>();

  register<TArgs, TResult>(name: string, registration: CommandRegistration<TArgs, TResult>): void {
    if (name === "session" || name === "superskill" || name === "graph_traverse" || name === "knowledge_viz" || name.startsWith("worktree_")) {
      const properties = registration.toolDef.inputSchema.properties as Record<string, unknown>;
      properties.workspace_path = { type: "string", description: "Absolute thread workspace directory; must map to this project. Omit only when the server cwd is the thread workspace." };
    }
    this.registrations.set(name, registration as CommandRegistration);
  }

  get(name: string): CommandRegistration | undefined {
    return this.registrations.get(name);
  }

  has(name: string): boolean {
    return this.registrations.has(name);
  }

  async execute(name: string, rawArgs: Record<string, unknown>, ctx: CommandContext): Promise<unknown> {
    const reg = this.registrations.get(name);
    if (!reg) throw new Error(`Unknown command: ${name}`);

    const adaptedArgs = reg.adaptArgs ? reg.adaptArgs(rawArgs) : rawArgs;
    return reg.handler(adaptedArgs, ctx);
  }

  getToolDefinitions(): MCPToolDefinition[] {
    const defs: MCPToolDefinition[] = [];
    for (const reg of this.registrations.values()) {
      defs.push(reg.toolDef);
    }
    return defs;
  }

  getToolNames(): string[] {
    return [...this.registrations.keys()];
  }
}

const s = (v: unknown) => typeof v === "string" ? v : undefined;
const n = (v: unknown) => typeof v === "number" ? v : undefined;
const a = (v: unknown) => Array.isArray(v) ? v as unknown[] : undefined;
const b = (v: unknown) => v === true;
const tier = (v: unknown): "auto" | "consent" | "both" | undefined => {
  const value = s(v);
  return value === "auto" || value === "consent" || value === "both" ? value : undefined;
};

export function createRegistry(): CommandRegistry {
  const r = new CommandRegistry();

  r.register("read", {
    handler: readCommand as CommandHandler,
    toolDef: {
      name: "read",
      description: "Read a file or directory listing from the AI knowledge vault.",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: { type: "string", description: "Relative path within vault. Use '.' for root." },
          depth: { type: "number", description: "Directory listing depth (default 1)" },
        },
        required: ["path"],
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({ path: raw.path as string, depth: n(raw.depth) }),
  });

  r.register("write", {
    handler: writeCommand as CommandHandler,
    toolDef: {
      name: "write",
      description: "Write or append to a file in the AI knowledge vault.",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: { type: "string", description: "Relative path within vault" },
          content: { type: "string", description: "Markdown content to write" },
          mode: { type: "string", enum: ["overwrite", "append", "prepend"], description: "Write mode (default append)" },
          frontmatter: { type: "object", description: "YAML frontmatter key-value pairs" },
        },
        required: ["path", "content"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      path: raw.path as string,
      content: raw.content as string,
      mode: s(raw.mode) as "overwrite" | "append" | "prepend" | undefined,
      frontmatter: typeof raw.frontmatter === "object" && raw.frontmatter !== null
        ? raw.frontmatter as Record<string, unknown> : undefined,
    }),
  });

  r.register("search", {
    handler: searchCommand as CommandHandler,
    toolDef: {
      name: "search",
      description: "Full-text search (SQLite FTS5 porter stemming) scoped to this project. Structured mode still matches frontmatter.",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Search query or structured filter (e.g. 'type:adr project:permanu')" },
          path_filter: { type: "string", description: "Glob to restrict search scope" },
          mode: { type: "string", enum: ["text", "structured"], description: "Search mode (default text)" },
          limit: { type: "number", description: "Max results (default 10)" },
          project: { type: "string", description: "Project slug to scope results" },
        },
        required: ["query"],
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({
      query: raw.query as string,
      project: s(raw.project),
      limit: n(raw.limit),
      structured: raw.mode === "structured",
    }),
  });

  r.register("project_context", {
    handler: contextCommand as CommandHandler,
    toolDef: {
      name: "project_context",
      description: "Get the context document for a project. Auto-detects project from CWD if not specified.",
      inputSchema: {
        type: "object" as const,
        properties: {
          project: { type: "string", description: "Project slug. If omitted, auto-detected from CWD." },
          detail_level: { type: "string", enum: ["summary", "full"], description: "Detail level (default summary)" },
        },
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({
      project: s(raw.project),
      detailLevel: s(raw.detail_level) as "summary" | "full" | undefined,
    }),
  });

  r.register("generate_context", {
    handler: (async (args: { projectPath: string; slug?: string }) => {
      return initCommand(args.projectPath, args.slug);
    }) as CommandHandler,
    toolDef: {
      name: "generate_context",
      description: "Scan a git repo and generate a draft context.md. Returns the draft — does NOT write to vault. Human reviews before committing.",
      inputSchema: {
        type: "object" as const,
        properties: {
          project_path: { type: "string", description: "Absolute path to the git repository to scan" },
          slug: { type: "string", description: "Project slug (default: derived from directory name)" },
        },
        required: ["project_path"],
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({
      projectPath: raw.project_path as string,
      slug: s(raw.slug),
    }),
  });

  r.register("decide", {
    handler: decideCommand as CommandHandler,
    toolDef: {
      name: "decide",
      description: "Log an architectural/design decision to the project's decisions directory.",
      inputSchema: {
        type: "object" as const,
        properties: {
          title: { type: "string", description: "Decision title" },
          context: { type: "string", description: "Why this decision was needed" },
          decision: { type: "string", description: "What was decided" },
          alternatives: { type: "string", description: "Alternatives considered" },
          consequences: { type: "string", description: "Known trade-offs" },
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
        },
        required: ["title", "decision"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      title: raw.title as string,
      context: s(raw.context) ?? "",
      decision: raw.decision as string,
      alternatives: s(raw.alternatives),
      consequences: s(raw.consequences),
      project: s(raw.project),
    }),
  });

  r.register("task", {
    handler: taskCommand as CommandHandler,
    toolDef: {
      name: "task",
      description: "Manage project tasks. Supports add, list, update, and board (kanban) views. Tasks are stored as individual files in projects/<slug>/tasks/.",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: { type: "string", enum: ["add", "list", "update", "board"], description: "Task action" },
          title: { type: "string", description: "Task title (required for add)" },
          task_id: { type: "string", description: "Task ID e.g. task-001 (required for update)" },
          status: { type: "string", enum: ["backlog", "in-progress", "blocked", "done", "cancelled"], description: "Task status" },
          priority: { type: "string", enum: ["p0", "p1", "p2"], description: "Task priority (default p1)" },
          blocked_by: { type: "array", items: { type: "string" }, description: "Task IDs that block this task" },
          assigned_to: { type: "string", description: "Assignee: claude-code|opencode|codex|human" },
          tags: { type: "array", items: { type: "string" }, description: "Tags" },
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
        },
        required: ["action"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      action: raw.action as "add" | "list" | "update" | "board",
      title: s(raw.title),
      taskId: s(raw.task_id),
      status: s(raw.status) as TaskStatus | undefined,
      priority: s(raw.priority) as TaskPriority | undefined,
      blockedBy: a(raw.blocked_by) as string[] | undefined,
      assignedTo: s(raw.assigned_to),
      tags: a(raw.tags) as string[] | undefined,
      project: s(raw.project),
    }),
  });

  r.register("learn", {
    handler: learnCommand as CommandHandler,
    toolDef: {
      name: "learn",
      description: "Capture and query learnings. Learnings persist discoveries across sessions. Stored as individual files in projects/<slug>/learnings/.",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: { type: "string", enum: ["add", "list"], description: "Learning action" },
          title: { type: "string", description: "Learning title (required for add)" },
          discovery: { type: "string", description: "What was discovered (required for add)" },
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
          tags: { type: "array", items: { type: "string" }, description: "Tags" },
          confidence: { type: "string", enum: ["high", "medium", "low"], description: "Confidence level (default medium)" },
          source: { type: "string", description: "Source tool" },
          session_id: { type: "string", description: "Session ID that captured this learning" },
          tag: { type: "string", description: "Filter learnings by tag (for list)" },
        },
        required: ["action"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      action: raw.action as "add" | "list",
      title: s(raw.title),
      discovery: s(raw.discovery),
      project: s(raw.project),
      tags: a(raw.tags) as string[] | undefined,
      confidence: s(raw.confidence) as Confidence | undefined,
      source: s(raw.source),
      sessionId: s(raw.session_id),
      tag: s(raw.tag),
    }),
  });

  r.register("brainstorm", {
    handler: brainstormCommand as CommandHandler,
    toolDef: {
      name: "brainstorm",
      description: "Start or continue a brainstorm document for a project.",
      inputSchema: {
        type: "object" as const,
        properties: {
          topic: { type: "string", description: "Brainstorm topic (used as filename)" },
          content: { type: "string", description: "Content to add" },
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
        },
        required: ["topic", "content"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      topic: raw.topic as string,
      content: raw.content as string,
      project: s(raw.project),
    }),
  });

  r.register("session", {
    handler: sessionCommand as CommandHandler,
    toolDef: {
      name: "session",
      description: "Register, update, or query active agent sessions for multi-agent coordination. On complete, persists a session note to the vault.",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: { type: "string", enum: ["register", "heartbeat", "complete", "list_active"], description: "Session action" },
          tool: { type: "string", description: "Tool name: claude-code|opencode|codex" },
          project: { type: "string", description: "Project being worked on" },
          task_summary: { type: "string", description: "What this session is doing" },
          files_touched: { type: "array", items: { type: "string" }, description: "Files this session modifies" },
          session_id: { type: "string", description: "Session ID (for heartbeat/complete)" },
          outcome: { type: "string", description: "Session outcome (for complete)" },
          tasks_completed: { type: "array", items: { type: "string" }, description: "Task IDs completed (for complete)" },
          completed: { type: "array", items: { type: "string" }, description: "Completed work items (for complete)" },
          partially_completed: { type: "array", items: { type: "string" }, description: "Partially completed work items (for complete)" },
          blocked: { type: "array", items: { type: "string" }, description: "Blocking issues (for complete)" },
          verification_run: { type: "string", description: "Verification steps run and results (for complete)" },
          commands_to_resume: { type: "array", items: { type: "string" }, description: "Commands to resume work (for complete)" },
        },
        required: ["action"],
      },
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    adaptArgs: (raw) => ({
      action: raw.action as "register" | "heartbeat" | "complete" | "list_active",
      tool: s(raw.tool),
      project: s(raw.project),
      taskSummary: s(raw.task_summary),
      filesTouched: a(raw.files_touched) as string[] | undefined,
      sessionId: s(raw.session_id),
      outcome: s(raw.outcome),
      tasksCompleted: a(raw.tasks_completed) as string[] | undefined,
      completed: a(raw.completed) as string[] | undefined,
      partiallyCompleted: a(raw.partially_completed) as string[] | undefined,
      blocked: a(raw.blocked) as string[] | undefined,
      verificationRun: s(raw.verification_run),
      commandsToResume: a(raw.commands_to_resume) as string[] | undefined,
    }),
  });

  r.register("prune", {
    handler: pruneCommand as CommandHandler,
    toolDef: {
      name: "prune",
      description: "Archive or delete stale vault content based on retention policies. Use mode='dry-run' first to preview.",
      inputSchema: {
        type: "object" as const,
        properties: {
          mode: { type: "string", enum: ["dry-run", "archive", "delete"], description: "Prune mode (default dry-run)" },
          project: { type: "string", description: "Project slug (or omit for auto-detect)" },
          all: { type: "boolean", description: "Prune all projects" },
          sessions_days: { type: "number", description: "Session retention in days (default 30)" },
          done_tasks_days: { type: "number", description: "Done task retention in days (default 30)" },
        },
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      mode: (s(raw.mode) as "dry-run" | "archive" | "delete") ?? "dry-run",
      project: s(raw.project),
      all: b(raw.all),
      policy: {
        sessions: typeof raw.sessions_days === "number" ? raw.sessions_days : 30,
        doneTasks: typeof raw.done_tasks_days === "number" ? raw.done_tasks_days : 30,
      },
    }),
  });

  r.register("stats", {
    handler: statsCommand as CommandHandler,
    toolDef: {
      name: "stats",
      description: "Show content statistics for a project — file counts, task breakdown, growth monitoring.",
      inputSchema: {
        type: "object" as const,
        properties: {
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
        },
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({ project: s(raw.project) }),
  });

  r.register("resume", {
    handler: resumeCommand as CommandHandler,
    toolDef: {
      name: "resume",
      description: "Get resume context for continuing work — recent sessions, interrupted work, in-progress tasks, suggested next steps. Call this at session start to understand what happened before.",
      inputSchema: {
        type: "object" as const,
        properties: {
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
          limit: { type: "number", description: "Number of recent sessions to show (default 5)" },
          format: { type: "string", enum: ["json", "markdown"], description: "Output format (default markdown)" },
        },
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({
      project: s(raw.project),
      limit: typeof raw.limit === "number" ? raw.limit : 5,
    }),
  });

  r.register("deprecate", {
    handler: deprecateCommand as CommandHandler,
    toolDef: {
      name: "deprecate",
      description: "Mark a vault item (ADR, learning, etc.) as deprecated with an optional reason.",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: { type: "string", description: "Relative path to the item in the vault" },
          reason: { type: "string", description: "Why this item is being deprecated" },
        },
        required: ["path"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      path: raw.path as string,
      reason: s(raw.reason),
    }),
  });

  r.register("init", {
    handler: initProject as CommandHandler,
    toolDef: {
      name: "init",
      description: "Initialize superskill for the current project. Detects stack, indexes the in-repo catalog, builds the project-local knowledge graph, and registers the repo in the vault map for auto-detection. Does not scrape skills.sh.",
      inputSchema: {
        type: "object" as const,
        properties: {
          bridge: { type: "boolean", description: "Enable native skill bridge (replaces native skill files with superskill redirects)" },
          slug: { type: "string", description: "Vault project slug for auto-detection (default: repo directory name)" },
        },
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({ bridge: b(raw.bridge), slug: s(raw.slug) }),
  });

  r.register("status", {
    handler: statusCommand as CommandHandler,
    toolDef: {
      name: "status",
      description: "Show superskill knowledge graph state: loaded skills, weights, recent sessions.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: () => ({}),
  });

  r.register("telemetry", {
    handler: telemetryCommand as CommandHandler,
    toolDef: {
      name: "telemetry",
      description:
        "Local, opt-in rule-selection telemetry: status/enable/disable/report/clear. Events never leave the machine; prompts are stored only as truncated hashes.",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: {
            type: "string",
            enum: ["status", "enable", "disable", "report", "clear"],
            description: "What to do; defaults to status.",
          },
          top: { type: "number", description: "Rows per selection/drop list for action=report (default 20)." },
        },
      },
      annotations: { readOnlyHint: false },
    },
    adaptArgs: (raw) => ({
      action: (typeof raw.action === "string" ? raw.action : "status") as TelemetryAction,
      top: n(raw.top),
    }),
  });

  r.register("register", {
    handler: registerCommand as CommandHandler,
    toolDef: {
      name: "register",
      description:
        "Map a repo to a vault project so vault-backed commands auto-detect the slug (writes the vault project-map.json locator; project knowledge stays jailed under projects/<slug>/).",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: { type: "string", description: "Directory to map (default: cwd). Git roots are used as the key." },
          slug: { type: "string", description: "Explicit project slug (default: keep existing mapping or derive from directory name)" },
        },
      },
      annotations: { readOnlyHint: false },
    },
    adaptArgs: (raw) => ({ path: s(raw.path), slug: s(raw.slug) }),
  });

  r.register("doctor", {
    handler: doctorCommand as CommandHandler,
    toolDef: {
      name: "doctor",
      description:
        "One-shot health check: install vs running MCP servers, vault + project mapping, project graph isolation (must stay gitignored/project-local), rules catalog, compile toolchains, telemetry, MCP clients.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: () => ({}),
  });

  r.register("superskill", {
    handler: (async (args: ActivateArgs & { detail?: string }, ctx: CommandContext) => {
      if (args.detail !== undefined && args.detail !== "compact" && args.detail !== "full") throw new Error("detail must be compact or full");
      const result = await activateSkills(args, ctx);
      return args.detail === "full" ? result : compactActivationResult(result);
    }) as CommandHandler,
    toolDef: {
      name: "superskill",
      description: "Route a task to curated in-repo packs (code/review/security/ops/devops) and deterministic verified rules selected by language, file hints, and phase. Lazy: only matching language + phase. Does not scrape skills.sh.",
      inputSchema: {
        type: "object" as const,
        properties: {
          task: { type: "string", description: "Describe what you're doing — superskill finds the right methodology and loads it." },
          skill_id: { type: "string", description: "Load a specific skill by ID (e.g. 'vercel-labs/agent-skills@react-best-practices')" },
          files: { type: "array", items: { type: "string" }, description: "Repo-relative file paths being worked on — selects file-triggered rules deterministically" },
          phase: { type: "string", enum: ["explore", "implement", "review", "ship"], description: "Current work phase; reroute when task, files or phase changes" },
          max_tokens: { type: "integer", minimum: 256, maximum: 50000, description: "Estimated content token budget; response metadata is measured separately" },
          session_id: { type: "string", description: "Registered coordination session ID for isolated activation learning" },
          detail: { type: "string", enum: ["compact", "full"], description: "Compact by default; full includes routing diagnostics" },
        },
      },
      annotations: { readOnlyHint: false },
    },
    adaptArgs: (raw) => ({
      task: s(raw.task),
      skill_id: s(raw.skill_id),
      files: a(raw.files) as string[] | undefined,
      phase: raw.phase as ActivateArgs["phase"],
      max_tokens: raw.max_tokens as number | undefined,
      session_id: s(raw.session_id),
      detail: s(raw.detail),
    }),
  });

  r.register("skill_install", {
    handler: (async (args: { source: string; select_skills?: string[] }) => {
      return installSkills(args.source, { selectSkills: args.select_skills });
    }) as CommandHandler,
    toolDef: {
      name: "skill_install",
      description: "Install skills from a GitHub repo (e.g. owner/repo or full URL). Resolves the skill list and gen/socket/snyk audits via skills.sh; fail-audit skills are blocked, and the unaudited GitHub fallback is used only when skills.sh is unreachable.",
      inputSchema: {
        type: "object" as const,
        properties: {
          source: { type: "string", description: "GitHub source: owner/repo, github:owner/repo, or full URL" },
          select_skills: { type: "array", items: { type: "string" }, description: "Optional list of skill names to install (installs all if omitted)" },
        },
        required: ["source"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      source: raw.source as string,
      select_skills: a(raw.select_skills) as string[] | undefined,
    }),
  });

  r.register("skill_list_installed", {
    handler: (async () => listInstalledSkills()) as CommandHandler,
    toolDef: {
      name: "skill_list_installed",
      description: "List skills installed locally from GitHub repos.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: () => ({}),
  });

  r.register("skill_remove", {
    handler: (async (args: { name: string }) => removeSkill(args.name)) as CommandHandler,
    toolDef: {
      name: "skill_remove",
      description: "Remove an installed skill by name.",
      inputSchema: {
        type: "object" as const,
        properties: {
          name: { type: "string", description: "Skill name to remove" },
        },
        required: ["name"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({ name: raw.name as string }),
  });

  r.register("link", {
    handler: linkCommand as CommandHandler,
    toolDef: {
      name: "link",
      description: "Create a forward link between two vault notes. Appends a [[wikilink]] to the source note, enabling graph_related to discover the connection.",
      inputSchema: {
        type: "object" as const,
        properties: {
          source: { type: "string", description: "Relative path to the source vault note" },
          target: { type: "string", description: "Relative path (or note name) to link to" },
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
        },
        required: ["source", "target"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      source: raw.source as string,
      target: raw.target as string,
      project: s(raw.project),
    }),
  });

  r.register("extract", {
    handler: extractCommand as CommandHandler,
    toolDef: {
      name: "extract",
      description: "Extract decisions, learnings, or other items from a source document into individual vault files. Each extracted item gets its own file with a backlink to the source.",
      inputSchema: {
        type: "object" as const,
        properties: {
          source: { type: "string", description: "Relative path to the source vault note" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", description: "Content type (adr, learning, decision, etc.)" },
                title: { type: "string", description: "Title for the extracted item" },
                content: { type: "string", description: "Body content for the extracted item" },
              },
              required: ["type", "title", "content"],
            },
            description: "Items to extract from the source document",
          },
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
        },
        required: ["source", "items"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      source: raw.source as string,
      items: a(raw.items) as Array<{ type: string; title: string; content: string }> | undefined,
      project: s(raw.project),
    }),
  });

  r.register("graph_related", {
    handler: graphRelatedCommand as CommandHandler,
    toolDef: {
      name: "graph_related",
      description: "Related notes via the FTS/edge index (related frontmatter + wikilinks), jailed to this project.",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: { type: "string", description: "Relative path to the vault note" },
          hops: { type: "number", description: "Number of hops (default 1)" },
        },
        required: ["path"],
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({
      path: raw.path as string,
      hops: n(raw.hops),
    }),
  });

  r.register("graph_traverse", {
    handler: graphTraverseCommand as CommandHandler,
    toolDef: {
      name: "graph_traverse",
      description:
        "Traverse the project index without loading bodies. node|children return metadata; resolve finds relevant notes, skills, rules, files and symbols with size estimates; open retrieves one file or symbol span capped at 4096 UTF-8 bytes by default.",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: { type: "string", enum: ["node", "children", "resolve", "open"], description: "Traversal action" },
          id: { type: "string", description: "Node id (required for node/children/open), e.g. rule:rust-own-borrow-over-clone, skill:code/rust, code:src/lib/graph/traverse.ts, vault:projects/<slug>/context.md" },
          task: { type: "string", description: "Task text (required for resolve)" },
          limit: { type: "number", description: "Max children/resolve items (default 100/30)" },
          full: { type: "boolean", description: "open: return the whole file instead of the 4KB cap" },
        },
        required: ["action"],
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({
      action: (typeof raw.action === "string" ? raw.action : "node") as "node" | "children" | "resolve" | "open",
      id: s(raw.id),
      task: s(raw.task),
      limit: n(raw.limit),
      full: b(raw.full),
    }),
  });

  r.register("knowledge_rebuild", {
    handler: knowledgeRebuildCommand as CommandHandler,
    toolDef: {
      name: "knowledge_rebuild",
      description: "Rebuild this project's SQLite FTS5 + edges index from markdown. Source of truth stays the files.",
      inputSchema: {
        type: "object" as const,
        properties: {
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
        },
      },
      annotations: { destructiveHint: false },
    },
    adaptArgs: (raw) => ({ project: s(raw.project) }),
  });

  r.register("knowledge_viz", {
    handler: knowledgeVizCommand as CommandHandler,
    toolDef: {
      name: "knowledge_viz",
      description: "Write knowledge-graph.html (browser) and knowledge-graph.canvas (open in Obsidian). Same edges as the FTS index.",
      inputSchema: {
        type: "object" as const,
        properties: {
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
        },
      },
      annotations: { destructiveHint: false },
    },
    adaptArgs: (raw) => ({ project: s(raw.project) }),
  });

  r.register("qa_viz", {
    handler: qaVizCommand as CommandHandler,
    toolDef: {
      name: "qa_viz",
      description: "Regenerate the knowledge graph HTML and drive system Chrome to click nodes and read the panel. In-harness QA, not a plugin.",
      inputSchema: {
        type: "object" as const,
        properties: {
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
        },
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({ project: s(raw.project) }),
  });

  r.register("graph_cross_project", {
    handler: graphCrossProjectCommand as CommandHandler,
    toolDef: {
      name: "graph_cross_project",
      description: "Search the current project's vault only. Cross-project search is denied.",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: ["query"],
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({
      query: raw.query as string,
      limit: n(raw.limit),
    }),
  });

  r.register("snapshot_repo_state", {
    handler: snapshotRepoState as CommandHandler,
    toolDef: {
      name: "snapshot_repo_state",
      description: "Snapshot current git state (branch, dirty files, last commit) into the vault. Helps avoid repeating repo discovery across sessions.",
      inputSchema: {
        type: "object" as const,
        properties: {
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
          branch: { type: "string", description: "Current git branch" },
          dirty_files: { type: "array", items: { type: "string" }, description: "List of dirty/uncommitted files" },
          last_commit: { type: "string", description: "Last commit hash or message" },
        },
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      project: s(raw.project),
      branch: s(raw.branch),
      dirty_files: a(raw.dirty_files) as string[] | undefined,
      last_commit: s(raw.last_commit),
    }),
  });

  r.register("env_facts", {
    handler: envFactsCommand as CommandHandler,
    toolDef: {
      name: "env_facts",
      description: "Store and query stable environment facts for a project (e.g., auth backend, env file locations, local URLs, required env vars). Not for secrets — use cred_refs for that.",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: { type: "string", enum: ["add", "list"], description: "Action" },
          key: { type: "string", description: "Fact key (required for add)" },
          value: { type: "string", description: "Fact value (required for add)" },
          context: { type: "string", description: "Additional context for the fact" },
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
        },
        required: ["action"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      action: raw.action as "add" | "list",
      key: s(raw.key),
      value: s(raw.value),
      context: s(raw.context),
      project: s(raw.project),
    }),
  });

  r.register("cred_refs", {
    handler: credRefsCommand as CommandHandler,
    toolDef: {
      name: "cred_refs",
      description: "Store pointers to where credentials are documented (not the credentials themselves). E.g., 'Django admin creds are in tests/live/test_all_endpoints.py'.",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: { type: "string", enum: ["add", "list"], description: "Action" },
          name: { type: "string", description: "Credential name (required for add)" },
          location: { type: "string", description: "Where the credential is documented (required for add)" },
          notes: { type: "string", description: "Additional notes" },
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
        },
        required: ["action"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      action: raw.action as "add" | "list",
      name: s(raw.name),
      location: s(raw.location),
      notes: s(raw.notes),
      project: s(raw.project),
    }),
  });

  r.register("rollback", {
    handler: rollbackCommand as CommandHandler,
    toolDef: {
      name: "rollback",
      description: "Manage rollback checkpoints. Store commit hashes with purpose/scope so rollback is safer. Mark when follow-up work starts after a checkpoint.",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: { type: "string", enum: ["add", "list", "mark-follow-up"], description: "Action" },
          commit_hash: { type: "string", description: "Commit hash (required for add)" },
          purpose: { type: "string", description: "Purpose of the checkpoint (required for add)" },
          scope: { type: "string", description: "Scope of changes in the checkpoint" },
          checkpoint_id: { type: "string", description: "Checkpoint ID to mark follow-up for" },
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
        },
        required: ["action"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      action: raw.action as "add" | "list" | "mark-follow-up",
      commit_hash: s(raw.commit_hash),
      purpose: s(raw.purpose),
      scope: s(raw.scope),
      checkpoint_id: s(raw.checkpoint_id),
      project: s(raw.project),
    }),
  });

  r.register("capture", {
    handler: captureCommand as CommandHandler,
    toolDef: {
      name: "capture",
      description: "Batch-capture multiple insights from a conversation into individual vault items. Each item gets its own file with auto-numbering. Supports any content type (learning, decision, adr, prd, research, etc.).",
      inputSchema: {
        type: "object" as const,
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", description: "Content type (learning, decision, adr, prd, research, etc.)" },
                title: { type: "string", description: "Title for the item" },
                content: { type: "string", description: "Body content" },
                tags: { type: "array", items: { type: "string" }, description: "Tags" },
                confidence: { type: "string", enum: ["high", "medium", "low"], description: "Confidence level (for learnings/research)" },
              },
              required: ["type", "title", "content"],
            },
            description: "Items to capture from the conversation",
          },
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
        },
        required: ["items"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      items: a(raw.items) as Array<{ type: string; title: string; content: string; tags?: string[]; confidence?: string }> | undefined,
      project: s(raw.project),
    }),
  });

  r.register("template", {
    handler: ((async (args: { action?: string; type?: string; variables?: Record<string, string> }) => {
      if (args.action === "list") {
        return { templates: listTemplates() };
      }
      if (args.type) {
        const result = applyTemplate(args.type, args.variables ?? {});
        if (!result) return { error: `No template found for type: ${args.type}` };
        return result;
      }
      return { templates: listTemplates() };
    }) as unknown) as CommandHandler,
    toolDef: {
      name: "template",
      description: "Get pre-filled templates for common vault item types (adr, prd, decision, learning, spec, rfc, roadmap, competitive-analysis, incident, research, vision, strategy). Use to scaffold new documents.",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: { type: "string", enum: ["list", "get"], description: "Action (default: list)" },
          type: { type: "string", description: "Template type to retrieve" },
          variables: { type: "object", description: "Variables to substitute in the template (e.g. { title: 'My ADR' })" },
        },
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({
      action: s(raw.action) as "list" | "get" | undefined,
      type: s(raw.type),
      variables: typeof raw.variables === "object" && raw.variables !== null
        ? raw.variables as Record<string, string> : undefined,
    }),
  });

  r.register("spec", {
    handler: specCommand as CommandHandler,
    toolDef: {
      name: "spec",
      description: "Manage deterministic plan specs. Actions: create, status, approve, freeze, list. Specs use a fixed skeleton (goal, non-goals, constraints, context, files, acceptance, risks, rollback). Approve requires zero gaps; freeze pins a content hash and makes the spec immutable.",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: { type: "string", enum: ["create", "status", "approve", "freeze", "list"], description: "Spec action" },
          title: { type: "string", description: "Spec title (required for create)" },
          goal: { type: "string", description: "What this work must achieve" },
          non_goals: { type: "array", items: { type: "string" }, description: "Explicitly out of scope" },
          constraints: { type: "array", items: { type: "string" }, description: "Hard constraints" },
          context: { type: "string", description: "Background context" },
          allowed_files: { type: "array", items: { type: "string" }, description: "Globs this work may touch" },
          forbidden_files: { type: "array", items: { type: "string" }, description: "Globs this work must not touch" },
          acceptance: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "Acceptance id (auto-assigned A1..An if omitted)" },
                text: { type: "string", description: "What must be true" },
                command: { type: "string", description: "Executable command that proves it" },
                manual: { type: "string", description: "Reason it can only be checked manually" },
              },
              required: ["text"],
            },
            description: "Acceptance criteria; each item needs a command or a manual reason",
          },
          risks: { type: "array", items: { type: "string" }, description: "Known risks" },
          rollback: { type: "string", description: "How to undo this work" },
          spec: { type: "string", description: "Spec reference for status/approve/freeze (NNN, NNN-slug, or path)" },
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
        },
        required: ["action"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      action: raw.action as SpecAction,
      title: s(raw.title),
      goal: s(raw.goal),
      nonGoals: a(raw.non_goals) as string[] | undefined,
      constraints: a(raw.constraints) as string[] | undefined,
      context: s(raw.context),
      allowedFiles: a(raw.allowed_files) as string[] | undefined,
      forbiddenFiles: a(raw.forbidden_files) as string[] | undefined,
      acceptance: a(raw.acceptance) as AcceptanceInput[] | undefined,
      risks: a(raw.risks) as string[] | undefined,
      rollback: s(raw.rollback),
      spec: s(raw.spec),
      project: s(raw.project),
    }),
  });

  r.register("tickets", {
    handler: ticketsCommand as CommandHandler,
    toolDef: {
      name: "tickets",
      description: "Manage tickets derived from a frozen spec. Actions: create, list, board, ready, update. Tickets carry acceptance criteria, blocked_by, a requires_review flag, and an evidence slot. ready returns unblocked tickets in deterministic topological order.",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: { type: "string", enum: ["create", "list", "board", "ready", "update"], description: "Ticket action" },
          spec: { type: "string", description: "Frozen spec reference (required for create)" },
          tickets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Ticket title" },
                acceptance: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      command: { type: "string" },
                      manual: { type: "string" },
                    },
                    required: ["text"],
                  },
                  description: "Acceptance criteria; each item needs a command or a manual reason",
                },
                blocked_by: { type: "array", items: { type: "string" }, description: "Ticket ids that must be done first" },
                requires_review: { type: "boolean", description: "Require a review evidence entry before the gate passes" },
              },
              required: ["title"],
            },
            description: "Tickets to create (required for create)",
          },
          ticket_id: { type: "string", description: "Ticket id e.g. ticket-001 (required for update)" },
          status: { type: "string", enum: ["backlog", "in-progress", "blocked", "done", "cancelled"], description: "New ticket status (for update)" },
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
        },
        required: ["action"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      action: raw.action as "create" | "list" | "board" | "ready" | "update",
      spec: s(raw.spec),
      tickets: a(raw.tickets)?.map((item) => {
        const obj = (item ?? {}) as Record<string, unknown>;
        return {
          title: s(obj.title) ?? "",
          acceptance: a(obj.acceptance) as AcceptanceInput[] | undefined,
          blockedBy: a(obj.blocked_by) as string[] | undefined,
          requiresReview: obj.requires_review === true,
        } satisfies TicketInput;
      }),
      ticketId: s(raw.ticket_id),
      status: s(raw.status) as TicketStatus | undefined,
      project: s(raw.project),
    }),
  });

  r.register("evidence", {
    handler: evidenceCommand as CommandHandler,
    toolDef: {
      name: "evidence",
      description: "Record and read ticket evidence. Actions: add, list. Evidence is appended to projects/<slug>/evidence/<ticket>.jsonl with command, exit code, truncated output, commit, and timestamp.",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: { type: "string", enum: ["add", "list"], description: "Evidence action" },
          ticket: { type: "string", description: "Ticket id e.g. ticket-001" },
          command: { type: "string", description: "Command that was run (required for add)" },
          exit: { type: "number", description: "Exit code (default 0)" },
          output: { type: "string", description: "Command output (truncated when stored)" },
          commit: { type: "string", description: "Commit the evidence applies to (default: git HEAD of cwd)" },
          ts: { type: "string", description: "ISO timestamp (default: now)" },
          cwd: { type: "string", description: "Directory used for the git HEAD lookup" },
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
        },
        required: ["action", "ticket"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      action: raw.action as "add" | "list",
      ticket: s(raw.ticket),
      command: s(raw.command),
      exit: n(raw.exit),
      output: s(raw.output),
      commit: s(raw.commit),
      ts: s(raw.ts),
      cwd: s(raw.cwd),
      project: s(raw.project),
    }),
  });

  r.register("gate", {
    handler: gateCommand as CommandHandler,
    toolDef: {
      name: "gate",
      description: "Deterministic evidence gate. Checks a spec (fields complete, frozen, hash intact) or a ticket (acceptance present, spec frozen and unchanged, evidence recorded at HEAD, review evidence when required). Returns pass/fail with the missing items.",
      inputSchema: {
        type: "object" as const,
        properties: {
          target: { type: "string", description: "Spec reference (NNN, NNN-slug, path) or ticket id (ticket-NNN)" },
          project: { type: "string", description: "Project slug (auto-detected if omitted)" },
          head: { type: "string", description: "Override HEAD commit for the evidence check" },
          cwd: { type: "string", description: "Directory used for the git HEAD lookup" },
        },
        required: ["target"],
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({
      target: raw.target as string,
      project: s(raw.project),
      head: s(raw.head),
      cwd: s(raw.cwd),
    }),
  });

  r.register("impact", {
    handler: impactCommand as CommandHandler,
    toolDef: {
      name: "impact",
      description: "Deterministic code-graph impact for a file or symbol: EXTRACTED definitions, importers, INFERRED callers, and the shortest graph path to a second target. Read-only; no LLM.",
      inputSchema: {
        type: "object" as const,
        properties: {
          target: { type: "string", description: "Repo-relative file path, file:<path> id, or symbol name" },
          to: { type: "string", description: "Optional second file/symbol target; when given, include the shortest path between both" },
          root: { type: "string", description: "Scan root (default: cwd)" },
        },
        required: ["target"],
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({
      target: raw.target as string,
      to: s(raw.to),
      root: s(raw.root),
    }),
  });

  r.register("claims", {
    handler: claimsCommand as CommandHandler,
    toolDef: {
      name: "claims",
      description: "Verify structured claims against a deterministic code-graph scan of a root (default cwd). Kinds: file-exists {path}, symbol-exists {name,file?}, symbol-exported {name,file}, import-resolves {from,specifier}, no-other-importers {file}, no-other-callers {symbol,file?}. Returns verified|refuted|unverifiable with node ids and edge confidence; hard verdicts require EXTRACTED facts.",
      inputSchema: {
        type: "object" as const,
        properties: {
          claims: {
            type: "array",
            items: {
              type: "object",
              properties: {
                kind: {
                  type: "string",
                  enum: [
                    "file-exists",
                    "symbol-exists",
                    "symbol-exported",
                    "import-resolves",
                    "no-other-importers",
                    "no-other-callers",
                  ],
                  description: "Claim kind",
                },
                path: { type: "string", description: "file-exists: repo-relative file path" },
                name: { type: "string", description: "symbol-exists/symbol-exported: symbol name" },
                file: { type: "string", description: "symbol-exists/symbol-exported/no-other-callers: repo-relative file path" },
                from: { type: "string", description: "import-resolves: importing file" },
                specifier: { type: "string", description: "import-resolves: import specifier" },
                symbol: { type: "string", description: "no-other-callers: symbol name" },
              },
              required: ["kind"],
            },
            description: "Claims to verify",
          },
          root: { type: "string", description: "Scan root (default: cwd)" },
        },
        required: ["claims"],
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({
      claims: raw.claims,
      root: s(raw.root),
    }),
  });

  r.register("worktree_env", {
    handler: worktreeEnvCommand as CommandHandler,
    toolDef: {
      name: "worktree_env",
      description:
        "Resolve shared-cache environment variables for the current git worktree (cache dirs + hit-enabling flags). Use before running installs/builds in a worktree.",
      inputSchema: {
        type: "object" as const,
        properties: {
          json: { type: "boolean", description: "Return the raw variable map as JSON instead of shell syntax" },
          shell: { type: "string", enum: ["sh", "fish", "powershell"], description: "Shell syntax for the env text (default sh)" },
          providers: { type: "array", items: { type: "string" }, description: "Restrict to these build-cache providers (default: all detected)" },
        },
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({
      json: b(raw.json),
      shell: s(raw.shell) as "sh" | "fish" | "powershell" | undefined,
      providers: a(raw.providers) as string[] | undefined,
    }),
  });

  r.register("worktree_audit", {
    handler: worktreeAuditCommand as CommandHandler,
    toolDef: {
      name: "worktree_audit",
      description:
        "Read-only audit of git worktrees and build-cache duplication for this repo. Reports safety verdicts and recommendation items. Never deletes anything.",
      inputSchema: {
        type: "object" as const,
        properties: {
          json: { type: "boolean", description: "Return JSON instead of text" },
          sizes: { type: "boolean", description: "Measure cache directory sizes (slower)" },
          worktree: { type: "string", description: "Audit only this worktree path (default: all worktrees)" },
        },
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({
      json: b(raw.json),
      sizes: b(raw.sizes),
      worktree: s(raw.worktree),
    }),
  });

  r.register("worktree_status", {
    handler: worktreeStatusCommand as CommandHandler,
    toolDef: {
      name: "worktree_status",
      description: "Worktree cache status: policy/hook state, per-worktree safety, cache bytes, optional budget check.",
      inputSchema: {
        type: "object" as const,
        properties: {
          json: { type: "boolean", description: "Return JSON instead of text" },
          budget: { type: "string", description: "Cache budget to check, e.g. '2G'" },
        },
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({
      json: b(raw.json),
      budget: s(raw.budget),
    }),
  });

  r.register("worktree_activate", {
    handler: worktreeActivateCommand as CommandHandler,
    toolDef: {
      name: "worktree_activate",
      description:
        "Install the shared build-cache policy for this repo: policy file in .git/superskill, guarded post-checkout hook, and host session hooks. Call with confirm=false first to preview; only pass confirm=true after the user agrees. Nothing is ever deleted.",
      inputSchema: {
        type: "object" as const,
        properties: {
          confirm: { type: "boolean", description: "true applies changes; false previews first (required)" },
          hooks: { type: "boolean", description: "Install the guarded post-checkout hook (default true)" },
          hosts: { type: "array", items: { type: "string" }, description: "Host session-hook adapters to install (default: all detected)" },
          seed: { type: "boolean", description: "Seed cache manifests into worktrees (default true)" },
          install: { type: "boolean", description: "Run toolchain installs after activation (default false)" },
          dry_run: { type: "boolean", description: "Preview only; write nothing" },
          json: { type: "boolean", description: "Return JSON instead of text" },
        },
        required: ["confirm"],
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    adaptArgs: (raw) => ({
      yes: b(raw.confirm),
      hooks: raw.hooks === false ? false : true,
      hosts: a(raw.hosts) as string[] | undefined,
      seed: raw.seed === false ? false : true,
      install: b(raw.install),
      dryRun: b(raw.dry_run) || !b(raw.confirm),
      json: b(raw.json),
    }),
  });

  r.register("worktree_apply", {
    handler: worktreeApplyCommand as CommandHandler,
    toolDef: {
      name: "worktree_apply",
      description:
        "Apply selected audit recommendation items (policy/hook/seed/tool-prune) after user consent. Requires confirm=true to mutate; without it returns the plan. Never removes worktrees or user files.",
      inputSchema: {
        type: "object" as const,
        properties: {
          item: { type: "array", items: { type: "string" }, description: "Audit item ids to apply (e.g. policy, hook, seed:pnpm)" },
          all_safe: { type: "boolean", description: "Apply every safe item that needs no extra consent" },
          confirm: { type: "boolean", description: "true mutates; false or omitted returns the plan" },
          json: { type: "boolean", description: "Return JSON instead of text" },
        },
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      item: a(raw.item) as string[] | undefined,
      allSafe: b(raw.all_safe),
      yes: b(raw.confirm),
      json: b(raw.json),
    }),
  });

  r.register("worktree_gc", {
    handler: worktreeGcCommand as CommandHandler,
    toolDef: {
      name: "worktree_gc",
      description:
        "Reclaim rebuildable build-cache entries (project-wise or --all). Default is a dry-run report. Mutations require confirm=true; deletions are quarantine-only (reversible via undo). Filters: tool, older_than, newer_than, min_size, max_size, tier, include, exclude, keep_latest, project, all, undo, purge.",
      inputSchema: {
        type: "object" as const,
        properties: {
          tool: { type: "array", items: { type: "string" }, description: "Restrict to these tools (e.g. pnpm, cargo)" },
          older_than: { type: "string", description: "Only entries older than this (e.g. 30d, 12h, 2w)" },
          newer_than: { type: "string", description: "Only entries newer than this (e.g. 7d)" },
          min_size: { type: "string", description: "Only entries at least this size (e.g. 1M)" },
          max_size: { type: "string", description: "Only entries at most this size (e.g. 2G)" },
          tier: { type: "string", enum: ["auto", "consent", "both"], description: "Candidate tier (default both)" },
          include: { type: "array", items: { type: "string" }, description: "Glob patterns to include" },
          exclude: { type: "array", items: { type: "string" }, description: "Glob patterns to exclude" },
          keep_latest: { type: "number", description: "Always keep the N newest entries per tool" },
          project: { type: "string", description: "Vault project slug to scope to" },
          all: { type: "boolean", description: "Scan all repos, not just this one" },
          undo: { type: "string", description: "Restore a quarantine journal id, reversing an apply" },
          purge: { type: "boolean", description: "Permanently delete quarantined entries older than 14d (requires confirm=true)" },
          worktree: { type: "string", description: "Worktree path to scope to (default: cwd)" },
          confirm: { type: "boolean", description: "true applies/quarantines/purges; false or omitted is a dry-run report" },
          json: { type: "boolean", description: "Return JSON instead of text" },
        },
      },
      annotations: { destructiveHint: true, idempotentHint: false },
    },
    adaptArgs: (raw) => ({
      tool: a(raw.tool) as string[] | undefined,
      olderThan: s(raw.older_than),
      newerThan: s(raw.newer_than),
      minSize: s(raw.min_size),
      maxSize: s(raw.max_size),
      tier: tier(raw.tier),
      include: a(raw.include) as string[] | undefined,
      exclude: a(raw.exclude) as string[] | undefined,
      keepLatest: n(raw.keep_latest),
      project: s(raw.project),
      all: b(raw.all),
      undo: s(raw.undo),
      purge: b(raw.purge),
      worktree: s(raw.worktree),
      apply: b(raw.confirm),
      yes: b(raw.confirm),
      json: b(raw.json),
    }),
  });

  r.register("worktree_uninstall", {
    handler: worktreeUninstallCommand as CommandHandler,
    toolDef: {
      name: "worktree_uninstall",
      description:
        "Remove worktree-cache integration for this repo: host session hooks, post-checkout hook, policy metadata. Caches are untouched unless purge_local=true AND confirm=true (then this repo's cache namespace is quarantined, still reversible).",
      inputSchema: {
        type: "object" as const,
        properties: {
          purge_local: { type: "boolean", description: "Quarantine this repo's cache namespace (reversible; requires confirm=true)" },
          confirm: { type: "boolean", description: "true applies mutations; false or omitted skips cache purge" },
          json: { type: "boolean", description: "Return JSON instead of text" },
        },
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      purgeLocal: b(raw.purge_local),
      yes: b(raw.confirm),
      json: b(raw.json),
    }),
  });

  r.register("hygiene_report", {
    handler: hygieneCommand as CommandHandler,
    toolDef: {
      name: "hygiene_report",
      description:
        "Read-only machine-wide space hygiene report across mapped repos: build caches, git worktrees, docker, xcode, and agent scratch. Marks entries that are DUE for cleanup with reasons and exact remediation commands. Reports only — deletes nothing.",
      inputSchema: {
        type: "object" as const,
        properties: {
          sizes: { type: "boolean", description: "Measure on-disk sizes (slower, more accurate)" },
          categories: {
            type: "array",
            items: { type: "string", enum: [...HYGIENE_CATEGORY_ORDER] },
            description: "Limit to these categories (default: all)",
          },
        },
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({
      sizes: b(raw.sizes),
      categories: a(raw.categories) as string[] | undefined,
    }),
  });

  r.register("watchdog", {
    handler: watchdogCommand as CommandHandler,
    toolDef: {
      name: "watchdog",
      description:
        "Session review + environment optimization. action='dig' analyzes a session, a window of sessions, or the machine environment and returns severity-ranked findings with evidence and proposals (digests for agent reasoning, persisted to the vault as watchdog notes). action='fix' applies approved repairs — dry-run by default; file reclamation is quarantined and reversible. action='status' lists past digs and pending findings.",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: { type: "string", enum: ["dig", "fix", "status"], description: "watchdog action" },
          scope: { type: "string", enum: ["session", "window", "env", "all"], description: "dig scope (default session)" },
          session_id: { type: "string", description: "Session id, optionally tool:id (default: latest session in this project)" },
          tool: { type: "string", description: "Restrict to a harness: opencode | claude-code | codex" },
          since: { type: "string", description: "Window start for scope=window: 7d, 24h, or ISO date" },
          count: { type: "number", description: "Max sessions in window (default 20)" },
          project: { type: "string", description: "Project slug (auto-detected when omitted)" },
          all_projects: { type: "boolean", description: "Ignore the current project filter; review sessions across all projects" },
          persist: { type: "boolean", description: "Persist the dig report to the vault (default true)" },
          finding_ids: { type: "array", items: { type: "string" }, description: "Finding ids for action=fix" },
          categories: {
            type: "array",
            items: { type: "string" },
            description: "Finding categories for action=fix; include 'leaked-tmp' to reclaim leaked .tmp files",
          },
          dismiss: { type: "boolean", description: "action=fix: mark dismissed instead of applied" },
          apply: { type: "boolean", description: "action=fix: actually perform changes (default false = dry-run)" },
          report_path: { type: "string", description: "action=fix: target a specific stored report path" },
        },
        required: ["action"],
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({
      action: raw.action as WatchdogArgs["action"],
      scope: s(raw.scope) as WatchdogArgs["scope"],
      sessionId: s(raw.session_id),
      tool: s(raw.tool),
      since: s(raw.since),
      count: n(raw.count),
      project: s(raw.project),
      allProjects: b(raw.all_projects),
      persist: typeof raw.persist === "boolean" ? raw.persist : undefined,
      findingIds: a(raw.finding_ids) as string[] | undefined,
      categories: a(raw.categories) as string[] | undefined,
      dismiss: b(raw.dismiss),
      apply: b(raw.apply),
      reportPath: s(raw.report_path),
    }),
  });

  return r;
}
