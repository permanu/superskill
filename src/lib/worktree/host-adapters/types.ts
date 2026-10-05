// SPDX-License-Identifier: Apache-2.0

export interface AdapterContext {
  /** Main worktree root of the repo the adapter is installed for. */
  repoRoot: string;
  /** Current worktree root. */
  worktreeRoot: string;
  /** Absolute path to the repo's .git/superskill state dir. */
  stateDir: string;
  /** Command that prints shell env exports, e.g. `superskill-cli worktree env --eval`. */
  envCommand: string;
  /** Absolute path to the superskill CLI entry (dist/cli.js) when known. */
  superskillCli: string | null;
}

export interface AdapterActionResult {
  adapter: string;
  changed: boolean;
  dryRun: boolean;
  files: string[];
  notes: string[];
}

export interface HostAdapter {
  /** Stable id: claude-code | opencode | codex | cursor | gemini | grokbuild | generic */
  id: string;
  displayName: string;
  /** True when this host is present on the machine or repo. */
  detect(): Promise<boolean>;
  /** Dry-run description of what install would change. */
  plan(ctx: AdapterContext): Promise<AdapterActionResult>;
  install(ctx: AdapterContext): Promise<AdapterActionResult>;
  uninstall(ctx: AdapterContext): Promise<AdapterActionResult>;
}
