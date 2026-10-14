// SPDX-License-Identifier: Apache-2.0
import type { VaultFS } from '../lib/vault-fs.js';
import type { SessionRegistryManager } from '../lib/session-registry.js';
import type { Config } from '../config.js';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface CommandContext {
  vaultFs: VaultFS;
  vaultPath: string;
  sessionRegistry: SessionRegistryManager;
  config: Config;
  log: Logger;
  /** Set when this call is jailed to one vault project. */
  projectSlug?: string | null;
  workspacePath?: string;
}

export type CommandHandler<TArgs = unknown, TResult = unknown> = (
  args: TArgs,
  ctx: CommandContext
) => Promise<TResult>;

export type Middleware = (
  ctx: CommandContext,
  next: () => Promise<unknown>
) => Promise<unknown>;

export interface InputSchema extends Record<string, unknown> {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";
  properties?: Record<string, InputSchema>;
  required?: string[];
  enum?: Array<string | number | boolean | null>;
  items?: InputSchema;
  additionalProperties?: boolean | InputSchema;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: InputSchema;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}

export interface MCPErrorResponse {
  error: string;
  message: string;
}

export interface CommandRegistration<TArgs = unknown, TResult = unknown> {
  handler: CommandHandler<TArgs, TResult>;
  toolDef: MCPToolDefinition;
  adaptArgs?: (raw: Record<string, unknown>) => TArgs;
  rateLimit?: "read" | "write" | "expensive";
}
