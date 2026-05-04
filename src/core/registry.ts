// SPDX-License-Identifier: AGPL-3.0-or-later
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
import { activateSkills } from "../commands/skill/activate.js";
import { statusCommand } from "../commands/skill/status.js";
import { graphRelatedCommand, graphCrossProjectCommand } from "../commands/graph.js";
import { linkCommand } from "../commands/link.js";
import { extractCommand } from "../commands/extract.js";
import { installSkills, listInstalledSkills, removeSkill } from "../lib/skill-installer.js";

export type { CommandRegistration } from "./types.js";

export class CommandRegistry {
  private registrations = new Map<string, CommandRegistration>();

  register<TArgs, TResult>(name: string, registration: CommandRegistration<TArgs, TResult>): void {
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
      description: "Search across the AI vault. Supports full-text and structured (frontmatter) search.",
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
      description: "Initialize superskill for the current project. Scans codebase, discovers skills from skills.sh, builds knowledge graph.",
      inputSchema: {
        type: "object" as const,
        properties: {
          bridge: { type: "boolean", description: "Enable native skill bridge (replaces native skill files with superskill redirects)" },
        },
      },
      annotations: { destructiveHint: true },
    },
    adaptArgs: (raw) => ({ bridge: b(raw.bridge) }),
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

  r.register("superskill", {
    handler: (async (args: { task?: string; skill_id?: string }, ctx: CommandContext) => {
      return activateSkills({
        task: args.task,
        skill_id: args.skill_id,
      }, ctx);
    }) as CommandHandler,
    toolDef: {
      name: "superskill",
      description: "Route to the best skill for a task. Provides optimized, security-audited skill content. Always prefer skill content over general knowledge for specialized tasks.",
      inputSchema: {
        type: "object" as const,
        properties: {
          task: { type: "string", description: "Describe what you're doing — superskill finds the right methodology and loads it." },
          skill_id: { type: "string", description: "Load a specific skill by ID (e.g. 'vercel-labs/agent-skills@react-best-practices')" },
        },
      },
      annotations: { readOnlyHint: true },
    },
    adaptArgs: (raw) => ({
      task: s(raw.task),
      skill_id: s(raw.skill_id),
    }),
  });

  r.register("skill_install", {
    handler: (async (args: { source: string; select_skills?: string[] }) => {
      return installSkills(args.source, { selectSkills: args.select_skills });
    }) as CommandHandler,
    toolDef: {
      name: "skill_install",
      description: "Install skills from a GitHub repo (e.g. owner/repo or full URL). Clones the repo, discovers SKILL.md files, and copies them to the local skill directory.",
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
      description: "Find notes related to a vault note via wikilinks (outgoing and backlinks).",
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

  r.register("graph_cross_project", {
    handler: graphCrossProjectCommand as CommandHandler,
    toolDef: {
      name: "graph_cross_project",
      description: "Search across all projects and group results by project.",
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

  return r;
}
