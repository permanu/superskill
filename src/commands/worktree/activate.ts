// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../../core/types.js";
import { activateRepo, type ActivationResult } from "../../lib/worktree/activate.js";

export interface WorktreeActivateArgs {
  yes?: boolean;
  hooks?: boolean;
  hosts?: string[];
  seed?: boolean;
  install?: boolean;
  dryRun?: boolean;
  json?: boolean;
}

export async function worktreeActivateCommand(
  args: WorktreeActivateArgs,
  ctx: CommandContext,
): Promise<ActivationResult> {
  ctx.log.debug("[worktree-activate] activating repo from", (ctx.workspacePath ?? process.cwd()));
  return activateRepo((ctx.workspacePath ?? process.cwd()), {
    yes: args.yes,
    hooks: args.hooks,
    hosts: args.hosts,
    seed: args.seed,
    install: args.install,
    dryRun: args.dryRun,
  });
}

export function renderWorktreeActivate(result: ActivationResult): string {
  const lines: string[] = [
    `worktree activate ${result.dryRun ? "(dry-run)" : ""}`.trim(),
    `  repo root:  ${result.repoRoot}`,
    `  repo id:    ${result.repoId}`,
    `  policy:     ${result.policyPath}${result.dryRun ? " (planned)" : ""}`,
    `  stacks:     ${result.stacks.length > 0 ? result.stacks.join(", ") : "none detected"}`,
    `  providers:  ${result.providers.length > 0 ? result.providers.join(", ") : "none"}`,
  ];

  if (result.hook === null) {
    lines.push(`  hook:       ${result.dryRun ? "not planned" : "not installed"}`);
  } else {
    const state = result.hook.changed ? "installed" : "unchanged";
    lines.push(`  hook:       ${result.hook.kind} (${state}) -> ${result.hook.hookFile}`);
    if (result.hook.backupPath !== null) lines.push(`  backup:     ${result.hook.backupPath}`);
  }

  if (result.adapters.length === 0) {
    lines.push("  adapters:   none");
  } else {
    for (const adapter of result.adapters) {
      const state = adapter.changed ? "changed" : "unchanged";
      const files = adapter.files.length > 0 ? ` [${adapter.files.join(", ")}]` : "";
      lines.push(`  adapter:    ${adapter.adapter} (${state})${files}`);
    }
  }

  for (const note of result.notes) {
    lines.push(`  note:       ${note}`);
  }

  return lines.join("\n");
}
