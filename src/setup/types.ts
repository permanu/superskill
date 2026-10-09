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
  error?: string;
}

export interface TeardownResult {
  client: string;
  mcpRemoved: boolean;
  instructionRemoved: boolean;
  slashCommandsRemoved?: string[];
  error?: string;
}

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

export const INSTRUCTION_TEXT = `SuperSkill knowledge base + rules (MCP server: superskill).
- At every session start: if the actual checkout is unmapped, call the register tool with path set to that absolute checkout and use its returned project slug; never guess a slug. Load project_context and search, then session register with your tool, project and workspace_path; retain session_id.
- Immediately call the \`superskill\` tool with your task, repo-relative files, session_id, workspace_path and explicit phase (explore|implement|review|ship). This first activation initializes a missing graph from the local catalog for a mapped workspace. Reroute when the task, files or phase meaningfully change and before verification or completion.
- Consume result.worktree: inspect its worktree assessment and next steps before installs/builds and at completion. Run worktree_env/audit in the exact returned workspace (CLI with that cwd if needed). Inspection is the default; built-in completed-session cleanup requires clean, idle, session-owned worktrees proven merged into main. Other apply/GC/removals require existing user authorization and verified scope.
- Coordinator integrates related dependent work in a local stack; workers do not independently push/create PRs. Validate each layer and the combined top before a batch push; keep independent work separate and publish only when authorized.
- Complete the same session with verification evidence; no "done" without \`gate check\` evidence.
- Only verified rules are injected by default.
- Constitution: catalog/constitution.md in the superskill package (always applies).`;

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
