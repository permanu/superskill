// SPDX-License-Identifier: Apache-2.0
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { resolveProviders } from "../toolchains/index.js";
import type { ProviderContext, ToolchainProvider } from "../toolchains/types.js";
import { buildProviderContext } from "./context.js";
import { detectAdapters, installAdapters, planAdapters, uninstallAdapters } from "./host-adapters/index.js";
import type { AdapterActionResult, AdapterContext } from "./host-adapters/types.js";
import {
  installPostCheckoutHook,
  uninstallPostCheckoutHook,
  type HookInstallResult,
  type HookUninstallResult,
} from "./hooks.js";
import { repoStateDir } from "./paths.js";
import { POLICY_SCHEMA_VERSION, readPolicy, writePolicy, type WorktreePolicy } from "./state.js";

export interface ActivationOptions {
  yes?: boolean;
  hooks?: boolean;
  hosts?: string[];
  seed?: boolean;
  install?: boolean;
  dryRun?: boolean;
  cliPath?: string | null;
}

export interface ActivationResult {
  changed: boolean;
  dryRun: boolean;
  repoRoot: string;
  repoId: string;
  policyPath: string;
  stacks: string[];
  providers: string[];
  hook: HookInstallResult | null;
  adapters: AdapterActionResult[];
  notes: string[];
}

export interface DeactivationResult {
  hook: HookUninstallResult;
  adapters: AdapterActionResult[];
  policyRemoved: boolean;
  notes: string[];
}

const ENV_COMMAND = "superskill-cli worktree env --eval";

function normalizeCliPath(cliPath: string | null | undefined): string | null {
  if (typeof cliPath !== "string") return null;
  const trimmed = cliPath.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function policyDiffers(existing: WorktreePolicy | null, next: WorktreePolicy): boolean {
  if (existing === null) return true;
  const normalize = (policy: WorktreePolicy): string =>
    JSON.stringify({ ...policy, updatedAt: "" });
  return normalize(existing) !== normalize(next);
}

async function buildAdapterContext(
  worktreeRoot: string,
  repoRoot: string,
  cliPath: string | null,
): Promise<AdapterContext> {
  return {
    repoRoot,
    worktreeRoot,
    stateDir: await repoStateDir(worktreeRoot),
    envCommand: ENV_COMMAND,
    superskillCli: cliPath,
  };
}

async function resolveHosts(opts: ActivationOptions): Promise<string[]> {
  if (opts.hosts !== undefined) return opts.hosts;
  const adapters = await detectAdapters();
  return adapters.map((adapter) => adapter.id);
}

async function flattenEnv(providers: ToolchainProvider[], ctx: ProviderContext): Promise<Record<string, string>> {
  const flags: Record<string, string> = {};
  const lists = await Promise.all(providers.map((provider) => provider.env(ctx)));
  for (const list of lists) {
    for (const entry of list) flags[entry.name] = entry.value;
  }
  return flags;
}

export async function activateRepo(
  worktreeRoot: string,
  opts: ActivationOptions = {},
): Promise<ActivationResult> {
  const explicitDryRun = opts.dryRun === true;
  const consent = opts.yes === true;
  const effectiveDryRun = explicitDryRun || !consent;
  const hooksEnabled = opts.hooks !== false;
  const seed = opts.seed !== false;
  const install = opts.install === true;
  const cliPath = normalizeCliPath(opts.cliPath);
  const notes: string[] = [];

  const built = await buildProviderContext(worktreeRoot);
  const providers = await resolveProviders(built.ctx);
  const providerIds = providers.map((provider) => provider.id);
  const flags = await flattenEnv(providers, built.ctx);
  const hosts = await resolveHosts(opts);
  const policyPath = join(await repoStateDir(worktreeRoot), "policy.json");
  const now = new Date().toISOString();
  const existing = await readPolicy(worktreeRoot);

  const policy: WorktreePolicy = {
    v: POLICY_SCHEMA_VERSION,
    repoId: built.repoId,
    remoteHash: built.remoteHash,
    repoRoot: built.repoRoot,
    createdAt: existing !== null && existing.repoId === built.repoId ? existing.createdAt : now,
    updatedAt: now,
    stacks: built.stacks,
    tools: providerIds,
    flags,
    hosts,
    activation: { hooks: hooksEnabled, seed, install },
  };

  const policyChanged = policyDiffers(existing, policy);
  const adapterContext = await buildAdapterContext(worktreeRoot, built.repoRoot, cliPath);
  let changed = policyChanged;
  let hook: HookInstallResult | null = null;
  let adapters: AdapterActionResult[] = [];

  if (effectiveDryRun) {
    notes.push(
      explicitDryRun
        ? "dry-run: no policy, hook, or adapter changes written"
        : "consent required: pass --yes (CLI) or confirm=true (MCP)",
    );
    if (hooksEnabled) {
      hook = await installPostCheckoutHook(worktreeRoot, { dryRun: true, cliPath });
      changed = changed || hook.changed;
      notes.push(...hook.notes.map((note) => `hook: ${note}`));
    }
    if (hosts.length > 0) {
      adapters = await planAdapters(adapterContext, hosts);
      changed = changed || adapters.some((entry) => entry.changed);
    }
    return {
      changed,
      dryRun: true,
      repoRoot: built.repoRoot,
      repoId: built.repoId,
      policyPath,
      stacks: built.stacks,
      providers: providerIds,
      hook,
      adapters,
      notes,
    };
  }

  await writePolicy(worktreeRoot, policy);
  notes.push(`policy written to ${policyPath}`);

  if (hooksEnabled) {
    hook = await installPostCheckoutHook(worktreeRoot, { cliPath });
    changed = changed || hook.changed;
    notes.push(...hook.notes.map((note) => `hook: ${note}`));
  } else {
    notes.push("hooks disabled: post-checkout hook not installed");
  }
  if (hosts.length > 0) {
    adapters = await installAdapters(adapterContext, hosts);
    changed = changed || adapters.some((entry) => entry.changed);
    notes.push(`host adapters targeted: ${hosts.join(", ")}`);
  } else {
    notes.push("no host adapters selected or detected: skipped");
  }

  return {
    changed,
    dryRun: false,
    repoRoot: built.repoRoot,
    repoId: built.repoId,
    policyPath,
    stacks: built.stacks,
    providers: providerIds,
    hook,
    adapters,
    notes,
  };
}

export async function deactivateRepo(
  worktreeRoot: string,
  opts: { hosts?: string[]; removePolicy?: boolean } = {},
): Promise<DeactivationResult> {
  const notes: string[] = [];
  const built = await buildProviderContext(worktreeRoot);
  const hook = await uninstallPostCheckoutHook(worktreeRoot);
  notes.push(...hook.notes.map((note) => `hook: ${note}`));

  const hosts = opts.hosts !== undefined ? opts.hosts : (await detectAdapters()).map((adapter) => adapter.id);
  const adapterContext = await buildAdapterContext(worktreeRoot, built.repoRoot, null);
  const adapters = hosts.length > 0 ? await uninstallAdapters(adapterContext, hosts) : [];
  if (hosts.length === 0) notes.push("no host adapters selected: skipped");

  let policyRemoved = false;
  if (opts.removePolicy === true && (await readPolicy(worktreeRoot)) !== null) {
    const policyPath = join(await repoStateDir(worktreeRoot), "policy.json");
    await rm(policyPath, { force: true });
    policyRemoved = true;
    notes.push("policy removed");
  }

  return { hook, adapters, policyRemoved, notes };
}
