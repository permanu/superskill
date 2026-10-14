// SPDX-License-Identifier: Apache-2.0
import { platform, homedir } from "os";
import { join } from "path";

export type Platform = "darwin" | "linux" | "win32";

export type InstructionStrategy =
  | "markdown-file"
  | "mdc-file"
  | "config-array"
  | "none";

export interface ClientConfig {
  name: string;
  slug: string;
  mcpConfigPaths: Record<Platform, string>;
  configFormat: "json" | "toml";
  rootKey: string;
  commandType: "string" | "array";
  envKey: string;
  extraFields?: Record<string, unknown>;
  instructionStrategy: InstructionStrategy;
  instructionPaths?: Record<Platform, string>;
  commandPaths?: Record<Platform, string>;
  support: "documented" | "unsupported";
  supportNote?: string;
  detectionPaths?: Record<Platform, string>;
}

export interface DetectedClient {
  config: ClientConfig;
  mcpConfigPath: string;
  instructionPath?: string;
}

export interface SetupOptions {
  all?: boolean;
  clients?: string[];
  dryRun?: boolean;
  check?: boolean;
  force?: boolean;
  vaultPath?: string;
}

export interface TeardownOptions {
  clients?: string[];
  dryRun?: boolean;
  silent?: boolean;
}

export interface SetupResult {
  client: string;
  mcpConfigured: boolean;
  instructionConfigured: boolean;
  slashCommandsInstalled?: string[];
  skipped?: string;
  preserved?: string[];
  error?: string;
}

export interface TeardownResult {
  client: string;
  mcpRemoved: boolean;
  instructionRemoved: boolean;
  slashCommandsRemoved?: string[];
  preserved?: string[];
  error?: string;
}

export type InstructionStatus = "created" | "appended" | "exists";

export const PREVIOUS_INSTRUCTION_TEXT = `SuperSkill knowledge base + rules (MCP server: superskill).
- Call the \`superskill\` tool with your task before creative work, debugging, or review.
- No "done" without \`gate check\` evidence.
- Only verified rules are injected by default.
- Constitution: catalog/constitution.md in the superskill package (always applies).`;

export const PREVIOUS_LIFECYCLE_INSTRUCTION_TEXT = `SuperSkill knowledge base + rules (MCP server: superskill).
- Start with project_context, search, then session register with your tool, project and absolute workspace_path; retain session_id.
- Call the \`superskill\` tool with your task, repo-relative files, session_id, workspace_path and explicit phase (explore|implement|review|ship). Reroute when the task, files or phase meaningfully change and before verification or completion.
- Consume result.worktree: inspect its worktree assessment and next steps before installs/builds and at completion. Run worktree_env/audit in the exact returned workspace (CLI with that cwd if needed). Inspection is the default; built-in completed-session cleanup requires clean, idle, session-owned worktrees proven merged into main. Other apply/GC/removals require existing user authorization and verified scope.
- Coordinator integrates related dependent work in a local stack; workers do not independently push/create PRs. Validate each layer and the combined top before a batch push; keep independent work separate and publish only when authorized.
- Complete the same session with verification evidence; no "done" without \`gate check\` evidence.
- Only verified rules are injected by default.
- Constitution: catalog/constitution.md in the superskill package (always applies).`;

export const PREVIOUS_SESSION_INSTRUCTION_TEXT = `SuperSkill knowledge base + rules (MCP server: superskill).
- At every session start: if the actual checkout is unmapped, call the register tool with path set to that absolute checkout and use its returned project slug; never guess a slug. Load project_context and search, then session register with your tool, project and workspace_path; retain session_id.
- Immediately call the \`superskill\` tool with your task, repo-relative files, session_id, workspace_path and explicit phase (explore|implement|review|ship). This first activation initializes a missing graph from the local catalog for a mapped workspace. Reroute when the task, files or phase meaningfully change and before verification or completion.
- Consume result.worktree: inspect its worktree assessment and next steps before installs/builds and at completion. Run worktree_env/audit in the exact returned workspace (CLI with that cwd if needed). Inspection is the default; built-in completed-session cleanup requires clean, idle, session-owned worktrees proven merged into main. Other apply/GC/removals require existing user authorization and verified scope.
- Coordinator integrates related dependent work in a local stack; workers do not independently push/create PRs. Validate each layer and the combined top before a batch push; keep independent work separate and publish only when authorized.
- Complete the same session with verification evidence; no "done" without \`gate check\` evidence.
- Only verified rules are injected by default.
- Constitution: catalog/constitution.md in the superskill package (always applies).`;

export const PREVIOUS_CLEANUP_INSTRUCTION_TEXT = `SuperSkill knowledge base + rules (MCP server: superskill).
- At every session start: if the actual checkout is unmapped, call the register tool with path set to that absolute checkout and use its returned project slug; never guess a slug. Load project_context and search, then call the \`session\` tool with \`action: "register"\` (pass your tool, project and the absolute workspace_path); retain the returned session_id.
- Immediately call the \`superskill\` tool with your task, repo-relative files, session_id, workspace_path and explicit phase (explore|implement|review|ship). This first activation initializes a missing graph from the local catalog for a mapped workspace. Reroute when the task, files or phase meaningfully change and before verification or completion.
- Consume result.worktree: inspect its worktree assessment and next steps before installs/builds and at completion. Run worktree_env/audit in the exact returned workspace (CLI with that cwd if needed). Inspection is the default; built-in completed-session cleanup requires clean, idle, session-owned worktrees proven merged into main. Other apply/GC/removals require existing user authorization and verified scope.
- Coordinator integrates related dependent work in a local stack; workers do not independently push/create PRs. Validate each layer and the combined top before a batch push; keep independent work separate and publish only when authorized.
- Complete the same session with verification evidence; no "done" without \`gate check\` evidence.
- Only verified rules are injected by default.
- Constitution: catalog/constitution.md in the superskill package (always applies).`;

export const PREVIOUS_ARCHIVE_INSTRUCTION_TEXT = PREVIOUS_CLEANUP_INSTRUCTION_TEXT.replace(
  "built-in completed-session cleanup requires clean, idle, session-owned worktrees proven merged into main. Other apply/GC/removals require existing user authorization and verified scope.",
  "built-in completed-session cleanup may relocate only clean, idle, session-owned worktrees proven integrated into the repository's default branch into locked recovery archives. It never automatically deletes a checkout; inspect the returned recovery metadata. Other apply/GC/permanent removals require existing user authorization and verified scope.",
);

export const INSTRUCTION_TEXT = `SuperSkill uses host-configured, project-scoped MCP, not a standalone/offline API.
- Use exact routes: OpenCode Code Mode tools.superskill.<tool>; Claude Code mcp__superskill__<tool>. If unavailable, report it; CLI only if superskill --help succeeds. No install/npx without explicit network approval.
- For nontrivial authorized code work, scope the actual checkout/project; register an unmapped absolute path and use its returned slug. Load project_context/search relevant notes; say if context is absent. Register with the session tool (action: "register", tool, project, absolute workspace_path); reuse session_id. Call the superskill tool with task, repo-relative files, session_id, workspace_path, and phase; reroute only when task, files, or phase meaningfully change; complete the same session with evidence.
- Simple/read-only work needs no session/plan. Registration/completion are coordination bookkeeping for authorized nontrivial work; completion persists a session note. Additional ADR/learning/task/report writes need a request or project policy. Keep project scope; redact prompts by default; use include_prompts only for bounded current-project excerpts explicitly requested and needed. Never expose secrets/credentials or unrelated history; cross-project reads need explicit scope/authorization.
- Resolve graph metadata first; open relevant content only. Page with bounded max_bytes/offset_bytes; if read_complete is false, continue at next_offset_bytes. Only verified rules are injected by default.
- Use worktree_env before installs/builds. Built-in session maintenance may automatically quarantine eligible clean, idle, session-owned checkouts after session completion once proven integrated into the actual default branch, preserving the whole checkout in a locked recovery archive with metadata; it never deletes. Assessment alone does not authorize manual actions; manual cleanup/cache apply/GC/permanent removal/config/install requires explicit approval.`;

export const MARKER_BEGIN_HTML = "<!-- superskill:begin -->";
export const MARKER_START_HTML = "<!-- superskill:start -->";
export const MARKER_END_HTML = "<!-- superskill:end -->";
export const MARKER_START_TOML = "# superskill:start";
export const MARKER_END_TOML = "# superskill:end";

export function resolveHome(p: string): string {
  return p.startsWith("~") ? join(homedir(), p.slice(1)) : p;
}

export function currentPlatform(): Platform {
  const p = platform();
  if (p === "darwin" || p === "linux" || p === "win32") return p;
  return "linux";
}
