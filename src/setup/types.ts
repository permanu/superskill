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
  verified: boolean;
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
  skipped?: string;
  error?: string;
}

export interface TeardownResult {
  client: string;
  mcpRemoved: boolean;
  instructionRemoved: boolean;
  error?: string;
}

export const INSTRUCTION_TEXT = `SuperSkill knowledge base + rules (MCP server: superskill).
- Call the \`superskill\` tool with your task before creative work, debugging, or review.
- No "done" without \`gate check\` evidence.
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
