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
import { createRegistry, serializeToolResult, capResponseBytes, maxResponseBytes, boundReadContent, validateArguments, fitGraphOpenResponse } from "./core/registry.js";
import { refreshStartupState } from "./setup/refresh.js";
import { handleInfoFlags } from "./core/cli-info.js";
import { VaultError } from "./lib/vault-fs.js";
import { createScopedCtx, getSessionRegistry } from "./app-context.js";
import { listCommand } from "./commands/read.js";
import { taskCommand } from "./commands/task.js";
import type { ContextResult } from "./commands/context.js";
import type { MCPErrorResponse } from "./core/types.js";
import { WorkspaceNotMappedError } from "./lib/workspace-context.js";
import { formatResumeContext, type ResumeContext } from "./commands/resume.js";
import { getTimeAgo } from "./lib/time-utils.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const registry = createRegistry();

// ── Rate Limiting ────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_WRITES = 30;
const RATE_LIMIT_MAX_READS = 60;
const RATE_LIMIT_MAX_EXPENSIVE = 10;
const writeTimestamps: number[] = [];
const readTimestamps: number[] = [];
const expensiveTimestamps: number[] = [];
const PUBLIC_ERROR_CODES = new Set([
  "INVALID_ARGUMENT", "PERMISSION_DENIED", "FILE_NOT_FOUND", "SECRET_REJECTED", "RATE_LIMITED",
  "FILE_TOO_LARGE", "FILE_CHANGED", "LOCK_TIMEOUT", "LOCK_LOST",
]);

function checkRateLimit(toolName: string): void {
  const registration = registry.get(toolName);
  const category = registration?.rateLimit ?? (registration?.toolDef.annotations?.readOnlyHint === true ? "read" : "write");
  const timestamps = category === "write" ? writeTimestamps : category === "expensive" ? expensiveTimestamps : readTimestamps;
  const limit = category === "write" ? RATE_LIMIT_MAX_WRITES : category === "expensive" ? RATE_LIMIT_MAX_EXPENSIVE : RATE_LIMIT_MAX_READS;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  while (timestamps.length > 0 && timestamps[0] <= windowStart) {
    timestamps.shift();
  }
  if (timestamps.length >= limit) {
    throw new VaultError("RATE_LIMITED", `Rate limit exceeded: ${limit} ${category} operations per minute. Slow down and retry.`);
  }
  timestamps.push(now);
}

function errorResponse(error: unknown, operation: string): MCPErrorResponse {
  if (error instanceof VaultError && PUBLIC_ERROR_CODES.has(error.code)) {
    return { error: error.code, message: error.message };
  }
  if (error instanceof WorkspaceNotMappedError) {
    return { error: "PERMISSION_DENIED", message: error.message };
  }
  console.error(`[mcp-server] ${operation} failed:`, error);
  return { error: "INTERNAL_ERROR", message: "An internal error occurred. Check the MCP server logs for details." };
}

function graphOpenErrorText(error: unknown, maxBytes: number): string {
  const serialized = JSON.stringify(errorResponse(error, "tool call"));
  if (Buffer.byteLength(serialized, "utf8") <= maxBytes) return serialized;
  const message = Buffer.from("Raise SUPERSKILL_MAX_RESPONSE_BYTES", "utf8");
  let end = Math.min(message.byteLength, maxBytes);
  while (end > 0 && ((message[end] ?? 0) & 0b1100_0000) === 0b1000_0000) end -= 1;
  return message.subarray(0, end).toString("utf8");
}

const SERVER_INSTRUCTIONS =
  "Project-scoped knowledge for coding agents. Load project_context, search relevant notes, and register a session with the `session` tool (action `register`). Prefer graph_traverse resolve/children for metadata, then open only relevant files or symbols. Use superskill with max_tokens for bounded methodology content and session_id for isolated learning. Complete the same session with verification evidence. Worktree assessment runs at session start/completion and skill activation. Consume its nextActions in the returned workspace. Reroute superskill when task, files, or phase changes. Inspect before applying and pass confirm=true only with user authorization. Never force removal. Built-in lifecycle cleanup may relocate clean, idle, completed-session worktrees proven integrated into the repository's default branch into locked recovery archives. It never automatically deletes a checkout; inspect the returned recovery metadata.";

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
  const raw = args ?? {};
  try {
    registry.validate(name, raw);
    checkRateLimit(name);
    const ctx = await createScopedCtx(
      typeof raw.project === "string" ? raw.project : undefined,
      name,
      typeof raw.workspace_path === "string" ? raw.workspace_path : undefined,
    );

    if (name === "read") {
      const { path, depth } = raw;
      if (typeof path !== "string") throw new VaultError("INVALID_ARGUMENT", "path must be a string");
      try {
        const content = await registry.execute(name, raw, ctx) as string;
        return { content: [{ type: "text", text: content }] };
      } catch (readErr: unknown) {
        const code = readErr instanceof VaultError ? readErr.code : undefined;
        const isDir = readErr instanceof Error && "code" in readErr && readErr.code === "EISDIR";
        if (code === "FILE_NOT_FOUND" || isDir) {
          const entries = await listCommand({ path, depth: typeof depth === "number" ? depth : 1 }, ctx);
          return { content: [{ type: "text", text: boundReadContent(serializeToolResult(entries), raw.max_bytes) }] };
        }
        throw readErr;
      }
    }

    if (name === "resume") {
      const result = await registry.execute(name, raw, ctx);
      const text = raw.format === "json"
        ? serializeToolResult(result)
        : formatResumeContext(result as ResumeContext);
      return { content: [{ type: "text", text: capResponseBytes(text, maxResponseBytes()) }] };
    }

    const result = await registry.execute(name, raw, ctx);
    if (name === "graph_traverse" && raw.action === "open") {
      return { content: [{ type: "text", text: fitGraphOpenResponse(result, maxResponseBytes()) }] };
    }
    return { content: [{ type: "text", text: capResponseBytes(serializeToolResult(result), maxResponseBytes()) }] };
  } catch (e: unknown) {
    const responseLimit = maxResponseBytes();
    const errorText = name === "graph_traverse" && raw.action === "open"
      ? graphOpenErrorText(e, responseLimit)
      : capResponseBytes(JSON.stringify(errorResponse(e, "tool call")), responseLimit);
    return {
      content: [{ type: "text", text: errorText }],
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
      description: "Active agent sessions across tools for the current mapped project",
      mimeType: "application/json",
    },
    {
      uri: "vault://project/<slug>/context",
      name: "Project Context",
      description: "The context.md for one project; replace <slug> with the project slug",
      mimeType: "text/markdown",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    if (uri === "vault://coordination/active-sessions") {
      checkRateLimit("project_context");
      const scoped = await createScopedCtx(undefined, "session");
      if (!scoped.projectSlug) throw new VaultError("PERMISSION_DENIED", "Active sessions require a mapped project workspace.");
      const sessions = await getSessionRegistry().listActive(scoped.projectSlug);
      return {
        contents: [{ uri, mimeType: "application/json", text: capResponseBytes(serializeToolResult(sessions), maxResponseBytes()) }],
      };
    }

    const projectMatch = uri.match(/^vault:\/\/project\/([^/]+)\/context$/);
    if (projectMatch) {
      const slug = projectMatch[1];
      validateArguments(PROMPT_ARGUMENTS_SCHEMA, { project: slug });
      checkRateLimit("project_context");
      const ctx = await createScopedCtx(slug, "project_context");
      const result = await registry.execute("project_context", { project: slug, detail_level: "summary" }, ctx) as ContextResult;
      return {
        contents: [{ uri, mimeType: "text/markdown", text: capResponseBytes(result.context_md, maxResponseBytes()) }],
      };
    }

    throw new VaultError("INVALID_ARGUMENT", "Unknown resource URI");
  } catch (e) {
    return {
      contents: [{ uri, mimeType: "application/json", text: capResponseBytes(JSON.stringify(errorResponse(e, "resource read")), maxResponseBytes()) }],
      isError: true,
    };
  }
});

// ── Prompts ───────────────────────────────────────────

const PROMPT_ARGUMENTS_SCHEMA = {
  type: "object" as const,
  properties: {
    project: { type: "string" as const, pattern: "^(?!.*\\.\\.)[a-zA-Z0-9][a-zA-Z0-9._-]*$" },
  },
  additionalProperties: false,
};

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: "inject-project-context",
      description: "Returns a system prompt fragment with project context, active blockers, open threads, learnings, and the last session.",
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
    const promptArgs = args ?? {};
    validateArguments(PROMPT_ARGUMENTS_SCHEMA, promptArgs);
    const project = typeof promptArgs.project === "string" ? promptArgs.project : undefined;
    checkRateLimit("project_context");
    if (name === "inject-project-context") {
      const ctx = await createScopedCtx(project, "project_context");
      const result = await registry.execute("project_context", {
        project,
        detail_level: "summary",
      }, ctx) as ContextResult;

      let blockerSection = "";
      try {
        const tasks = await taskCommand({
          action: "list",
          project: result.project_slug,
          status: "blocked",
        }, ctx);
        if (tasks.tasks && tasks.tasks.length > 0) {
          blockerSection = "\n\n## Active Blockers\n" +
            tasks.tasks.map((t) => `- [${t.priority.toUpperCase()}] ${t.title} (${t.id})`).join("\n");
        }
      } catch (error) {
        if (!(error instanceof VaultError && error.code === "FILE_NOT_FOUND")) {
          console.error("[mcp-server] prompt blockers failed:", error);
        }
      }

      let threadSection = "";
      if (result.open_threads && result.open_threads.count > 0) {
        threadSection = `\n\n## Open Threads (${result.open_threads.count})\n` +
          result.open_threads.items.map((item) => `- ${item}`).join("\n");
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
              text: capResponseBytes(`## Project Context: ${result.project_slug}\n\n${result.context_md}${blockerSection}${threadSection}${learningSection}${sessionSection}\n\n## Worktree Cache\nRun worktree_status to check worktree-cache policy, hook state, and per-worktree safety before installs or builds.`, maxResponseBytes()),
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

**Project**: ${project ?? "[auto-detect]"}
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

    throw new VaultError("INVALID_ARGUMENT", "Unknown prompt");
  } catch (e) {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: capResponseBytes(JSON.stringify(errorResponse(e, "prompt load")), maxResponseBytes()),
          },
        },
      ],
    };
  }
});

// ── Start ─────────────────────────────────────────────

async function main() {
  if (handleInfoFlags(process.argv.slice(2), version)) return;
  try {
    await refreshStartupState();
  } catch (error) {
    console.error(`[mcp-server] startup refresh failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("MCP server failed to start:", e);
  process.exit(1);
});
