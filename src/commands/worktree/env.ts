// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../../core/types.js";
import { renderEnvText, resolveWorktreeEnv } from "../../lib/worktree/env.js";

export interface WorktreeEnvArgs {
  json?: boolean;
  shell?: "sh" | "fish" | "powershell";
  providers?: string[];
}

export interface WorktreeEnvResult {
  worktreeRoot: string;
  repoRoot: string;
  repoId: string;
  providers: string[];
  text: string;
  json: Record<string, string>;
  notes: string[];
}

export async function worktreeEnvCommand(
  args: WorktreeEnvArgs,
  ctx: CommandContext
): Promise<WorktreeEnvResult> {
  const worktreeRoot = process.cwd();
  const resolved = await resolveWorktreeEnv(
    worktreeRoot,
    args.providers ? { providers: args.providers } : undefined
  );
  const json: Record<string, string> = {};
  for (const variable of resolved.vars) json[variable.name] = variable.value;
  return {
    worktreeRoot,
    repoRoot: resolved.repoRoot,
    repoId: resolved.repoId,
    providers: resolved.providers,
    text: renderEnvText(resolved.vars, args.shell),
    json,
    notes: resolved.notes,
  };
}

export function renderWorktreeEnv(result: WorktreeEnvResult, opts?: { text?: boolean }): string {
  const asText = opts?.text ?? true;
  return asText ? result.text : JSON.stringify(result.json, null, 2);
}
