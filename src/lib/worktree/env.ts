// SPDX-License-Identifier: Apache-2.0
import { resolveProviders } from "../toolchains/index.js";
import type { EnvVar } from "../toolchains/types.js";
import { buildProviderContext } from "./context.js";

const ENV_PROBE_BUDGET_MS = 10_000;
const ENV_PROBE_CONCURRENCY = 4;
let activeEnvProbes = 0;

export type EnvMode = "set" | "append" | "prepend" | "path-prepend";

export interface ResolvedEnvVar {
  name: string;
  value: string;
  mode: EnvMode;
  provider: string;
}

export interface ResolvedWorktreeEnv {
  repoRoot: string;
  worktreeRoot: string;
  repoId: string;
  stacks: string[];
  providers: string[];
  vars: ResolvedEnvVar[];
  notes: string[];
}

export interface TaggedEnvVar extends EnvVar {
  provider: string;
}

function mergePair(current: string, next: string, mode: EnvMode, separator: string): string {
  if (mode === "append") return current ? `${current} ${next}` : next;
  if (mode === "prepend") return current ? `${next} ${current}` : next;
  if (mode === "path-prepend") return current ? `${next}${separator}${current}` : next;
  return next;
}

export function mergeEnvVars(
  vars: TaggedEnvVar[],
  base: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): ResolvedEnvVar[] {
  const names: string[] = [];
  const groups = new Map<string, TaggedEnvVar[]>();
  for (const variable of vars) {
    const group = groups.get(variable.name);
    if (group) {
      group.push(variable);
    } else {
      groups.set(variable.name, [variable]);
      names.push(variable.name);
    }
  }
  const separator = platform === "win32" ? ";" : ":";
  return names.map((name) => {
    const occurrences = groups.get(name) ?? [];
    let value = base[name] ?? "";
    let mode: EnvMode = "set";
    let provider = "";
    for (const occurrence of occurrences) {
      mode = occurrence.mode ?? "set";
      provider = occurrence.provider;
      if (occurrence.value.length === 0 && value.length > 0) continue;
      value = mergePair(value, occurrence.value, mode, separator);
    }
    return { name, value, mode, provider };
  });
}

export async function resolveWorktreeEnv(
  worktreeRoot: string,
  opts?: { providers?: string[]; timeoutMs?: number }
): Promise<ResolvedWorktreeEnv> {
  const timeoutMs = opts?.timeoutMs ?? ENV_PROBE_BUDGET_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) throw new Error("env probe timeout must be between 1 and 30000 ms");
  if (activeEnvProbes >= ENV_PROBE_CONCURRENCY) throw new Error("worktree environment probes are busy; retry later");
  activeEnvProbes += 1;
  const deadline = Date.now() + timeoutMs;
  const pending = resolveWithinBudget(worktreeRoot, opts?.providers, deadline).finally(() => { activeEnvProbes -= 1; });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      pending,
      new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error("worktree environment probe time budget reached")), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function resolveWithinBudget(worktreeRoot: string, wanted: string[] | undefined, deadline: number): Promise<ResolvedWorktreeEnv> {
  const built = await buildProviderContext(worktreeRoot);
  if (Date.now() >= deadline) throw new Error("worktree environment probe time budget reached");
  const detected = await resolveProviders(built.ctx);
  const selected = wanted ? detected.filter((provider) => wanted.includes(provider.id)) : detected;

  const providers: string[] = [];
  const tagged: TaggedEnvVar[] = [];
  const notes: string[] = [];
  for (const provider of selected) {
    if (Date.now() >= deadline) throw new Error("worktree environment probe time budget reached");
    providers.push(provider.id);
    const [envVars, providerNotes] = await Promise.all([
      provider.env(built.ctx),
      provider.notes(built.ctx),
    ]);
    for (const variable of envVars) tagged.push({ provider: provider.id, ...variable });
    notes.push(...providerNotes);
  }

  return {
    repoRoot: built.repoRoot,
    worktreeRoot,
    repoId: built.repoId,
    stacks: built.stacks,
    providers,
    vars: mergeEnvVars(tagged),
    notes,
  };
}

export function shellEscape(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function isUnsafeEnvValue(value: string): boolean {
  return value.includes("\n") || value.includes("\r") || value.includes("\0");
}

export function renderEnvText(
  vars: ResolvedEnvVar[],
  shell: "sh" | "fish" | "powershell" = "sh"
): string {
  const lines: string[] = [];
  for (const variable of vars) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(variable.name) || isUnsafeEnvValue(variable.value)) continue;
    if (shell === "powershell") {
      lines.push(`$Env:${variable.name} = '${variable.value.replace(/'/g, "''")}'`);
    } else if (shell === "fish") {
      lines.push(`set -gx ${variable.name} ${shellEscape(variable.value)}`);
    } else {
      lines.push(`export ${variable.name}=${shellEscape(variable.value)}`);
    }
  }
  if (lines.length === 0) return "";
  return `${lines.join("\n")}\n`;
}
