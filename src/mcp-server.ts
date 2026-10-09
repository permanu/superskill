#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createRegistry } from "./core/registry.js";
import { refreshExistingManagedInstallation } from "./setup/refresh.js";
import { handleInfoFlags } from "./core/cli-info.js";
import { VaultError } from "./lib/vault-fs.js";
import { createScopedCtx, getSessionRegistry } from "./app-context.js";
import { readCommand, listCommand } from "./commands/read.js";
import { taskCommand } from "./commands/task.js";
import { formatResumeContext, type ResumeContext } from "./commands/resume.js";
import { getTimeAgo } from "./lib/time-utils.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const registry = createRegistry();

// ── Rate Limiting ────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_WRITES = 30;
const writeTimestamps: number[] = [];

const WRITE_TOOLS = new Set([
  "write", "decide", "task", "learn", "brainstorm", "session",
  "prune", "deprecate", "init", "skill_install", "skill_remove",
  "link", "extract", "snapshot_repo_state", "env_facts", "cred_refs",
  "rollback", "capture", "register", "watchdog",
  "worktree_activate", "worktree_apply", "worktree_gc", "worktree_uninstall",
]);

function checkRateLimit(toolName: string): void {
  if (!WRITE_TOOLS.has(toolName)) return;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  while (writeTimestamps.length > 0 && writeTimestamps[0] < windowStart) {
    writeTimestamps.shift();
  }
  if (writeTimestamps.length >= RATE_LIMIT_MAX_WRITES) {
    throw new Error(`Rate limit exceeded: ${RATE_LIMIT_MAX_WRITES} write operations per minute. Slow down and retry.`);
  }
  writeTimestamps.push(now);
}

const SERVER_INSTRUCTIONS =
  "Project-scoped knowledge for coding agents. Load project_context, search relevant notes, and register a session. Prefer graph_traverse resolve/children for metadata, then open only relevant files or symbols. Use superskill with max_tokens for bounded methodology content and session_id for isolated learning. Complete the same session with verification evidence. Worktree assessment runs at session start/completion and skill activation. Consume its nextActions in the returned workspace. Reroute superskill when task, files, or phase changes. Inspect before applying and pass confirm=true only with user authorization. Never force removal. Built-in lifecycle cleanup may archive SuperSkill metadata and remove only clean, idle, completed-session worktrees proven integrated into main.";

const server = new Server(
  { name: "superskill", version },
  { capabilities: { tools: {}, resources: {}, prompts: {} }, instructions: SERVER_INSTRUCTIONS }
);

// ── Tools ─────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: registry.getToolDefinitions(),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const raw = (args ?? {}) as Record<string, unknown>;
  try {
    if (raw.workspace_path !== undefined && typeof raw.workspace_path !== "string") throw new Error("workspace_path must be an absolute existing directory");
    const ctx = await createScopedCtx(
      typeof raw.project === "string" ? raw.project : undefined,
      name,
      typeof raw.workspace_path === "string" ? raw.workspace_path : undefined,
    );
    checkRateLimit(name);

    if (name === "read") {
      const { path, depth } = raw;
      if (!path || typeof path !== "string") throw new Error("Missing required field: path (string)");
      try {
        const content = await readCommand({ path }, ctx);
        return { content: [{ type: "text", text: content }] };
      } catch (readErr: unknown) {
        const code = readErr instanceof VaultError ? readErr.code : undefined;
        const isDir = readErr instanceof Error && "code" in readErr && (readErr as NodeJS.ErrnoException).code === "EISDIR";
        if (code === "FILE_NOT_FOUND" || isDir) {
          const entries = await listCommand({ path, depth: typeof depth === "number" ? depth : 1 }, ctx);
          return { content: [{ type: "text", text: JSON.stringify(entries, null, 2) }] };
        }
        throw readErr;
      }
    }

    if (name === "resume") {
      const result = await registry.execute(name, raw, ctx);
      if (raw.format === "json") {
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      return { content: [{ type: "text", text: formatResumeContext(result as ResumeContext) }] };
    }

    const result = await registry.execute(name, raw, ctx);
    return { content: [{ type: "text", text: JSON.stringify(result, null, name === "superskill" && raw.detail !== "full" ? undefined : 2) }] };
  } catch (e: unknown) {
    const code = e instanceof VaultError ? e.code : "INTERNAL_ERROR";
    const msg = e instanceof Error ? e.message : String(e);
    return {
      content: [{ type: "text", text: JSON.stringify({ error: code, message: msg }) }],
      isError: true,
    };
  }
});

// ── Resources ─────────────────────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "vault://coordination/active-sessions",
      name: "Active Sessions",
      description: "Currently active agent sessions across all tools",
      mimeType: "application/json",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    if (uri === "vault://coordination/active-sessions") {
      const scoped = await createScopedCtx();
      const sessions = await getSessionRegistry().listActive(scoped.projectSlug ?? undefined);
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(sessions, null, 2) }],
      };
    }

    const projectMatch = uri.match(/^vault:\/\/project\/([^/]+)\/context$/);
    if (projectMatch) {
      const slug = projectMatch[1];
      const ctx = await createScopedCtx(slug);
      const result = await registry.execute("project_context", { project: slug, detail_level: "summary" }, ctx) as any;
      return {
        contents: [{ uri, mimeType: "text/markdown", text: result.context_md }],
      };
    }

    return {
      contents: [{ uri, mimeType: "text/plain", text: `Unknown resource: ${uri}` }],
      isError: true,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      contents: [{ uri, mimeType: "text/plain", text: JSON.stringify({ error: "INTERNAL_ERROR", message: msg }) }],
      isError: true,
    };
  }
});

// ── Prompts ───────────────────────────────────────────

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: "inject-project-context",
      description: "Returns a system prompt fragment with project context, recent decisions, and active todos.",
      arguments: [
        { name: "project", description: "Project slug (auto-detected if omitted)", required: false },
      ],
    },
    {
      name: "summarize-session",
      description: "Returns a prompt guiding the agent to produce a structured session summary.",
      arguments: [
        { name: "project", description: "Project slug", required: false },
      ],
    },
  ],
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "inject-project-context") {
      const project = args?.project as string | undefined;
      const ctx = await createScopedCtx(project);
      const result = await registry.execute("project_context", {
        project,
        detail_level: "summary",
      }, ctx) as any;

      let todoSection = "";
      try {
        const tasks = await taskCommand({
          action: "list",
          project: result.project_slug,
          status: "blocked",
        }, ctx);
        if (tasks.tasks && tasks.tasks.length > 0) {
          todoSection = "\n\n## Active Blockers\n" +
            tasks.tasks.map((t) => `- [${t.priority.toUpperCase()}] ${t.title} (${t.id})`).join("\n");
        }
      } catch {
      }

      let learningSection = "";
      if (result.learning_count > 0) {
        learningSection = `\n\n## Learnings: ${result.learning_count} available (use learn list)`;
      }

      let sessionSection = "";
      if (result.last_session) {
        const ago = getTimeAgo(result.last_session.completed_at);
        sessionSection = `\n\n## Last Session (${ago}): ${result.last_session.outcome}`;
      }

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `## Project Context: ${result.project_slug}\n\n${result.context_md}${todoSection}${learningSection}${sessionSection}\n\n## Worktree Cache\nRun worktree_status to check worktree-cache policy, hook state, and per-worktree safety before installs or builds.`,
            },
          },
        ],
      };
    }

    if (name === "summarize-session") {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please summarize this session in the following format for the knowledge vault:

## Session Summary

**Project**: ${args?.project ?? "[auto-detect]"}
**Date**: ${new Date().toISOString().slice(0, 10)}
**Tool**: [which AI tool was used]

### What was done
- [bullet points of completed work]

### Decisions made
- [any architectural or design decisions, with reasoning]

### Open items
- [anything left incomplete or requiring follow-up]

### Files modified
- [list of files changed]`,
            },
          },
        ],
      };
    }

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Unknown prompt: ${name}`,
          },
        },
      ],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Error loading prompt "${name}": ${msg}`,
          },
        },
      ],
    };
  }
});

// ── Start ─────────────────────────────────────────────

async function main() {
  if (handleInfoFlags(process.argv.slice(2), version)) return;
  refreshExistingManagedInstallation();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("MCP server failed to start:", e);
  process.exit(1);
});
