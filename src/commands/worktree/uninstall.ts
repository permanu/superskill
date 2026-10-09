// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CommandContext } from "../../core/types.js";
import { formatBytes } from "../../lib/format-bytes.js";
import { buildProviderContext } from "../../lib/worktree/context.js";
import type { AdapterContext, AdapterActionResult } from "../../lib/worktree/host-adapters/types.js";
import { cacheNamespace, repoStateDir } from "../../lib/worktree/paths.js";
import { quarantinePaths, type QuarantineResult } from "../../lib/worktree/quarantine.js";
import { appendJournal, newJournalId, readPolicy } from "../../lib/worktree/state.js";

export interface WorktreeUninstallArgs {
  purgeLocal?: boolean;
  yes?: boolean;
  json?: boolean;
}

export interface WorktreeUninstallResult {
  repoId: string;
  repoRoot: string;
  adapters: {
    available: boolean;
    uninstalled: string[];
    files: string[];
    notes: string[];
  };
  hook: {
    available: boolean;
    removed: boolean;
    restored: boolean;
    notes: string[];
  };
  policy: {
    path: string | null;
    kept: boolean;
  };
  purgedCache?: QuarantineResult;
  cacheSkipped?: { path: string; reason: string };
  notes: string[];
}

interface HostAdapterLike {
  id?: string;
  displayName?: string;
  uninstall?: (ctx: AdapterContext) => Promise<AdapterActionResult>;
}

interface HooksModule {
  uninstallPostCheckoutHook?: (
    worktreeRoot: string,
  ) => Promise<{ removed: boolean; restored: boolean; notes: string[] }>;
}

interface AdapterModule {
  ALL_ADAPTERS?: HostAdapterLike[];
  allAdapters?: HostAdapterLike[];
  adapters?: HostAdapterLike[];
  ADAPTERS?: HostAdapterLike[];
  uninstallAdapters?: (ctx: AdapterContext, ids?: string[]) => Promise<AdapterActionResult[]>;
  getAdapters?: () => unknown;
  default?: unknown;
}

const HOOKS_SPECIFIERS = [moduleSpecifier("hooks", "js"), moduleSpecifier("hooks", "ts")];
const ADAPTERS_SPECIFIERS = [
  moduleSpecifier("host-adapters/index", "js"),
  moduleSpecifier("host-adapters/index", "ts"),
];

function moduleSpecifier(name: string, extension: string): string {
  const parts = name.split("/");
  return [...["..", "..", "lib", "worktree"], ...parts].join("/") + `.${extension}`;
}

async function importOptional<T>(specifiers: string[]): Promise<T | null> {
  for (const specifier of specifiers) {
    try {
      return (await import(/* @vite-ignore */ specifier)) as T;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (
        code !== "ERR_MODULE_NOT_FOUND" &&
        code !== "MODULE_NOT_FOUND" &&
        code !== "ERR_UNKNOWN_FILE_EXTENSION"
      ) {
        console.error(`[worktree-uninstall] import ${specifier} failed: ${code ?? String(err)}`);
      }
    }
  }
  return null;
}

async function collectAdapters(module: AdapterModule | null): Promise<HostAdapterLike[]> {
  if (module === null) return [];
  const direct = [module.ALL_ADAPTERS, module.allAdapters, module.adapters, module.ADAPTERS];
  for (const candidate of direct) {
    if (Array.isArray(candidate)) return candidate as HostAdapterLike[];
  }
  const getAdapters = module.getAdapters;
  if (typeof getAdapters === "function") {
    try {
      const result = await (getAdapters as () => unknown)();
      if (Array.isArray(result)) return result as HostAdapterLike[];
      if (result && typeof result === "object") {
        const nested = (result as { adapters?: unknown }).adapters;
        if (Array.isArray(nested)) return nested as HostAdapterLike[];
      }
    } catch (err) {
      console.error(`[worktree-uninstall] getAdapters failed: ${(err as Error).message}`);
    }
  }
  const fallback = module.default;
  if (Array.isArray(fallback)) return fallback as HostAdapterLike[];
  if (fallback && typeof fallback === "object") {
    const nested = (fallback as { adapters?: unknown }).adapters;
    if (Array.isArray(nested)) return nested as HostAdapterLike[];
  }
  return [];
}

async function adapterContext(repoRoot: string, worktreeRoot: string): Promise<AdapterContext> {
  return {
    repoRoot,
    worktreeRoot,
    stateDir: await repoStateDir(repoRoot),
    envCommand: "superskill-cli worktree env --eval",
    superskillCli: null,
  };
}

export async function worktreeUninstallCommand(
  args: WorktreeUninstallArgs,
  _ctx: CommandContext,
): Promise<unknown> {
  const worktreeRoot = (_ctx.workspacePath ?? process.cwd());
  const built = await buildProviderContext(worktreeRoot);
  const notes: string[] = [];

  const adapters = {
    available: false,
    uninstalled: [] as string[],
    files: [] as string[],
    notes: [] as string[],
  };
  const adapterModule = await importOptional<AdapterModule>(ADAPTERS_SPECIFIERS);
  if (adapterModule === null) {
    adapters.notes.push("host adapter registry not available; skipped");
  } else {
    adapters.available = true;
    const context = await adapterContext(built.repoRoot, worktreeRoot);
    if (typeof adapterModule.uninstallAdapters === "function") {
      try {
        const results = await adapterModule.uninstallAdapters(context);
        for (const result of results ?? []) {
          if (result.changed) adapters.uninstalled.push(result.adapter);
          if (Array.isArray(result.files)) adapters.files.push(...result.files);
          if (Array.isArray(result.notes)) adapters.notes.push(...result.notes);
        }
      } catch (err) {
        adapters.notes.push(`adapter registry uninstall failed: ${(err as Error).message}`);
      }
    } else {
      const list = await collectAdapters(adapterModule);
      if (list.length === 0) adapters.notes.push("no host adapters registered");
      for (const adapter of list) {
        if (typeof adapter.uninstall !== "function") continue;
        const id = adapter.id ?? "unknown-adapter";
        try {
          const result = await adapter.uninstall(context);
          adapters.uninstalled.push(id);
          if (Array.isArray(result?.files)) adapters.files.push(...result.files);
          if (Array.isArray(result?.notes)) adapters.notes.push(...result.notes);
        } catch (err) {
          adapters.notes.push(`${id}: uninstall failed: ${(err as Error).message}`);
        }
      }
    }
  }

  const hook = {
    available: false,
    removed: false,
    restored: false,
    notes: [] as string[],
  };
  const hooksModule = await importOptional<HooksModule>(HOOKS_SPECIFIERS);
  if (hooksModule === null || typeof hooksModule.uninstallPostCheckoutHook !== "function") {
    hook.notes.push("post-checkout hook module not available; skipped");
  } else {
    hook.available = true;
    try {
      const result = await hooksModule.uninstallPostCheckoutHook(built.repoRoot);
      hook.removed = result.removed === true;
      hook.restored = result.restored === true;
      if (Array.isArray(result.notes)) hook.notes.push(...result.notes);
    } catch (err) {
      hook.notes.push(`hook uninstall failed: ${(err as Error).message}`);
    }
  }

  const policy = await readPolicy(built.repoRoot);
  const policyPath = policy === null ? null : join(await repoStateDir(built.repoRoot), "policy.json");

  let purgedCache: QuarantineResult | undefined;
  let cacheSkipped: { path: string; reason: string } | undefined;
  if (args.purgeLocal === true) {
    const cacheDir = cacheNamespace(built.repoId);
    if (args.yes !== true) {
      cacheSkipped = {
        path: cacheDir,
        reason: "requires --yes; caches are only quarantined (reversible), never deleted",
      };
    } else if (!existsSync(cacheDir)) {
      cacheSkipped = { path: cacheDir, reason: "cache namespace not present" };
    } else {
      purgedCache = await quarantinePaths(built.repoRoot, [cacheDir]);
      notes.push(
        `cache quarantined (reversible): ${purgedCache.moved.length} dir(s); undo with worktree gc --undo ${purgedCache.journalId}`,
      );
    }
  }

  if (policyPath !== null) {
    notes.push(`policy kept at ${policyPath} (deletion outside the quarantine root is forbidden)`);
  }

  const journalPaths = [
    ...adapters.files,
    ...(purgedCache?.moved.map((entry) => entry.from) ?? []),
  ];
  const bytes = purgedCache?.moved.reduce((sum, entry) => sum + entry.bytes, 0) ?? 0;
  try {
    await appendJournal(built.repoRoot, {
      id: newJournalId(),
      ts: new Date().toISOString(),
      action: "uninstall",
      paths: journalPaths.length > 0 ? journalPaths : [built.repoRoot],
      bytes,
      detail: `adapters=${adapters.uninstalled.join(",") || "none"} hook=${
        hook.removed ? "removed" : "unchanged"
      } policy=kept`,
    });
  } catch (err) {
    console.error(`[worktree-uninstall] failed to append journal entry: ${(err as Error).message}`);
    notes.push("journal entry could not be written");
  }

  return {
    repoId: built.repoId,
    repoRoot: built.repoRoot,
    adapters,
    hook,
    policy: { path: policyPath, kept: policyPath !== null },
    purgedCache,
    cacheSkipped,
    notes,
  } satisfies WorktreeUninstallResult;
}

export function renderWorktreeUninstall(result: unknown): string {
  const outcome = (result ?? {}) as Partial<WorktreeUninstallResult>;
  const lines: string[] = ["superskill worktree uninstall"];
  if (outcome.repoId !== undefined) lines.push(`repo: ${outcome.repoId}`);
  if (outcome.repoRoot !== undefined) lines.push(`root: ${outcome.repoRoot}`);

  if (outcome.adapters) {
    lines.push("");
    lines.push(
      outcome.adapters.available
        ? `host adapters: ${outcome.adapters.uninstalled.length} uninstalled${
            outcome.adapters.uninstalled.length > 0
              ? ` (${outcome.adapters.uninstalled.join(", ")})`
              : ""
          }`
        : "host adapters: not available",
    );
    for (const note of outcome.adapters.notes) lines.push(`  ${note}`);
  }

  if (outcome.hook) {
    lines.push(
      outcome.hook.available
        ? `post-checkout hook: ${outcome.hook.removed ? "removed" : "unchanged"}${
            outcome.hook.restored ? ", previous hook restored" : ""
          }`
        : "post-checkout hook: not available",
    );
    for (const note of outcome.hook.notes) lines.push(`  ${note}`);
  }

  if (outcome.policy) {
    lines.push(
      outcome.policy.kept && outcome.policy.path !== null
        ? `policy: kept at ${outcome.policy.path}`
        : "policy: not present",
    );
  }

  if (outcome.purgedCache) {
    const bytes = outcome.purgedCache.moved.reduce((sum, entry) => sum + entry.bytes, 0);
    lines.push("");
    lines.push(
      `cache quarantined (reversible): ${outcome.purgedCache.moved.length} dir(s), ${formatBytes(bytes, { nullLabel: "?", maxUnit: "TB" })} — journal ${outcome.purgedCache.journalId}`,
    );
    lines.push(`  undo: superskill-cli worktree gc --undo ${outcome.purgedCache.journalId}`);
  } else if (outcome.cacheSkipped) {
    lines.push(`cache: not touched (${outcome.cacheSkipped.reason})`);
  } else {
    lines.push("cache: not touched (pass --purge-local --yes to quarantine it; never deleted)");
  }

  if ((outcome.notes ?? []).length > 0) {
    lines.push("");
    for (const note of outcome.notes ?? []) lines.push(`note: ${note}`);
  }

  return lines.join("\n");
}
