// SPDX-License-Identifier: Apache-2.0
import { lstat, mkdir, readdir, rename } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import type { CommandContext } from "../../core/types.js";
import { buildProviderContext } from "../../lib/worktree/context.js";
import { repoStateDir } from "../../lib/worktree/paths.js";
import { duBytes } from "../../lib/worktree/quarantine.js";
import { isPathInside } from "../../lib/worktree/safety.js";
import { seedWorktree, type SeedResult } from "../../lib/worktree/seed.js";
import { appendJournal, newJournalId, readJournal } from "../../lib/worktree/state.js";
import type { PruneSpec } from "../../lib/toolchains/index.js";
import { providerById } from "../../lib/toolchains/index.js";

const AUDIT_MODULE = "../../lib/worktree/audit.js";
const ACTIVATE_MODULE = "../../lib/worktree/activate.js";
const GC_MODULE = "../../lib/worktree/gc.js";
const SAFE_JOURNAL_ID = /^[0-9A-Za-z][0-9A-Za-z._:-]*$/;

export interface WorktreeApplyArgs {
  item?: string[];
  allSafe?: boolean;
  yes?: boolean;
  undo?: string;
  json?: boolean;
}

export type WorktreeApplyItemKind = "policy" | "hook" | "env" | "seed" | "prune";

export interface WorktreeApplyPlannedItem {
  id: string;
  kind: WorktreeApplyItemKind;
  title: string;
  safe: boolean;
  consent: boolean;
  command?: string;
}

export interface WorktreeApplyOutcome {
  id: string;
  kind: WorktreeApplyItemKind;
  status: "applied" | "skipped" | "failed";
  detail: string;
  result?: unknown;
}

export interface WorktreeApplyResult {
  worktreeRoot: string;
  dryRun: boolean;
  planned: WorktreeApplyPlannedItem[];
  applied: WorktreeApplyOutcome[];
  skipped: Array<{ id: string; reason: string }>;
  notes: string[];
}

interface AuditModuleItem {
  id: string;
  kind: WorktreeApplyItemKind;
  title: string;
  detail: string;
  safe: boolean;
  consent: boolean;
  command?: string;
}

interface AuditModule {
  auditRepo?: (worktreeRoot: string, opts?: unknown) => Promise<{
    items?: AuditModuleItem[];
    worktrees?: Array<{ items?: AuditModuleItem[] }>;
  }>;
}

type ActivateRepoFn = (
  worktreeRoot: string,
  opts?: { yes?: boolean; hooks?: boolean; hosts?: string[]; seed?: boolean; install?: boolean },
) => Promise<unknown>;

type RunToolPruneFn = (
  repoRoot: string,
  spec: PruneSpec,
  opts: { apply: boolean },
) => Promise<{ tool: string; command: string; applied: boolean; stdout: string; stderr: string; note: string }>;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function importModule(specifier: string): Promise<Record<string, unknown>> {
  return (await import(specifier)) as Record<string, unknown>;
}

interface WorktreeQuarantineMove {
  journalId: string;
  from: string;
  to: string | null;
  bytes: number;
  reason: string | null;
}

async function quarantineWorktreePath(
  worktreeRoot: string,
  target: string,
): Promise<WorktreeQuarantineMove> {
  const journalId = newJournalId();
  const from = resolve(target);
  let info;
  try {
    info = await lstat(from);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    return {
      journalId,
      from,
      to: null,
      bytes: 0,
      reason: code === "ENOENT" ? "does not exist" : `lstat failed: ${code ?? errorMessage(err)}`,
    };
  }
  if (info.isSymbolicLink()) {
    return { journalId, from, to: null, bytes: 0, reason: "symlink" };
  }
  if (!isPathInside(from, worktreeRoot)) {
    return { journalId, from, to: null, bytes: 0, reason: "outside worktree" };
  }

  const stateDir = await repoStateDir(worktreeRoot);
  const quarantineDir = join(stateDir, "quarantine", journalId);
  const to = join(quarantineDir, basename(from));
  const bytes = (await duBytes(from)) ?? 0;
  await mkdir(quarantineDir, { recursive: true, mode: 0o700 });
  try {
    await rename(from, to);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    return {
      journalId,
      from,
      to: null,
      bytes: 0,
      reason:
        code === "EXDEV"
          ? "cross-device rename not supported (never copy+delete)"
          : `rename failed: ${code ?? errorMessage(err)}`,
    };
  }

  await appendJournal(worktreeRoot, {
    id: journalId,
    ts: new Date().toISOString(),
    action: "quarantine",
    paths: [from],
    bytes,
    detail: "worktree-local",
  });
  return { journalId, from, to, bytes, reason: null };
}

async function applyReclaim(item: AuditModuleItem, worktreeRoot: string): Promise<WorktreeApplyOutcome> {
  const parts = item.id.split(":");
  const providerId = parts[1] ?? "";
  const dirId = parts[2] ?? "";
  const provider = providerById(providerId);
  if (!provider) throw new Error(`no toolchain provider for "${item.id}"`);
  const built = await buildProviderContext(worktreeRoot);
  const dirs = await provider.cacheDirs(built.ctx);
  const spec = dirs.find((dir) => dir.id === dirId);
  if (!spec) throw new Error(`no cache dir "${dirId}" for provider "${providerId}"`);
  if (!isPathInside(spec.path, worktreeRoot)) {
    return {
      id: item.id,
      kind: item.kind,
      status: "skipped",
      detail: `cache dir is outside the current worktree: ${spec.path}`,
    };
  }

  const move = await quarantineWorktreePath(worktreeRoot, spec.path);
  if (move.to === null) {
    return {
      id: item.id,
      kind: item.kind,
      status: "skipped",
      detail: move.reason ?? "nothing to move",
      result: move,
    };
  }
  return {
    id: item.id,
    kind: item.kind,
    status: "applied",
    detail: `quarantined ${move.from} -> ${move.to} (undo: ${move.journalId})`,
    result: move,
  };
}

async function undoWorktreeQuarantine(
  worktreeRoot: string,
  journalId: string,
): Promise<WorktreeApplyOutcome> {
  if (!SAFE_JOURNAL_ID.test(journalId)) {
    return { id: `undo:${journalId}`, kind: "prune", status: "skipped", detail: "invalid journal id" };
  }
  const record = (await readJournal(worktreeRoot)).find(
    (entry) => entry.id === journalId && entry.action === "quarantine",
  );
  if (!record) {
    return {
      id: `undo:${journalId}`,
      kind: "prune",
      status: "skipped",
      detail: `no quarantine journal entry for ${journalId}`,
    };
  }

  const quarantineDir = join(await repoStateDir(worktreeRoot), "quarantine", journalId);
  let names: string[];
  try {
    names = await readdir(quarantineDir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return { id: `undo:${journalId}`, kind: "prune", status: "skipped", detail: "quarantine directory missing" };
    }
    throw err;
  }

  const restored: string[] = [];
  const skipped: Array<{ path: string; reason: string }> = [];
  for (const name of names.sort()) {
    const source = join(quarantineDir, name);
    const original = record.paths.find((path) => basename(path) === name);
    if (!original) {
      skipped.push({ path: source, reason: "no recorded original path" });
      continue;
    }
    const target = resolve(original);
    if (!isPathInside(target, worktreeRoot)) {
      skipped.push({ path: target, reason: "outside worktree" });
      continue;
    }
    try {
      await lstat(target);
      skipped.push({ path: target, reason: "target already exists" });
      continue;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        skipped.push({ path: target, reason: `cannot stat target: ${code ?? errorMessage(err)}` });
        continue;
      }
    }
    try {
      await mkdir(dirname(target), { recursive: true });
      await rename(source, target);
      restored.push(target);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      skipped.push({
        path: target,
        reason:
          code === "EXDEV"
            ? "cross-device rename not supported (never copy+delete)"
            : `rename failed: ${code ?? errorMessage(err)}`,
      });
    }
  }

  if (restored.length > 0) {
    await appendJournal(worktreeRoot, {
      id: newJournalId(),
      ts: new Date().toISOString(),
      action: "restore",
      paths: restored,
      bytes: record.bytes,
      detail: `worktree-local undo ${journalId}`,
    });
  }

  return {
    id: `undo:${journalId}`,
    kind: "prune",
    status: restored.length > 0 ? "applied" : "skipped",
    detail:
      restored.length > 0
        ? `restored ${restored.length} path(s) from quarantine`
        : (skipped[0]?.reason ?? "nothing to restore"),
    result: { restored, skipped },
  };
}

function selectItems(
  items: AuditModuleItem[],
  args: WorktreeApplyArgs,
  skipped: Array<{ id: string; reason: string }>,
): AuditModuleItem[] {
  const selected: AuditModuleItem[] = [];
  const seen = new Set<string>();
  const add = (item: AuditModuleItem): void => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    selected.push(item);
  };

  if (args.item && args.item.length > 0) {
    const byId = new Map(items.map((item) => [item.id, item]));
    for (const id of args.item) {
      const item = byId.get(id);
      if (!item) {
        skipped.push({ id, reason: "unknown item" });
        continue;
      }
      if (item.consent && args.yes !== true) {
        skipped.push({ id, reason: "consent item requires --yes" });
        continue;
      }
      add(item);
    }
    return selected;
  }

  if (args.allSafe) {
    for (const item of items) {
      if (!item.safe) continue;
      if (item.consent) {
        skipped.push({ id: item.id, reason: "consent required; name it explicitly with --yes" });
        continue;
      }
      add(item);
    }
  }
  return selected;
}

async function applyItem(
  item: AuditModuleItem,
  worktreeRoot: string,
  notes: string[],
): Promise<WorktreeApplyOutcome> {
  switch (item.kind) {
    case "policy":
    case "hook": {
      const mod = (await importModule(ACTIVATE_MODULE)) as { activateRepo?: ActivateRepoFn };
      if (typeof mod.activateRepo !== "function") throw new Error("activate module unavailable");
      const result = await mod.activateRepo(worktreeRoot, {
        yes: true,
        hooks: true,
        hosts: [],
        seed: false,
        install: false,
      });
      return { id: item.id, kind: item.kind, status: "applied", detail: "activation applied", result };
    }
    case "seed": {
      const seeded: SeedResult = await seedWorktree(worktreeRoot, { dryRun: false });
      notes.push(...seeded.notes);
      if (seeded.seeded.length > 0) {
        return {
          id: item.id,
          kind: item.kind,
          status: "applied",
          detail: `seeded ${seeded.seeded.map((s) => s.relative).join(", ")}`,
          result: seeded,
        };
      }
      return {
        id: item.id,
        kind: item.kind,
        status: "skipped",
        detail: seeded.skipped[0]?.reason ?? "nothing to seed",
        result: seeded,
      };
    }
    case "prune": {
      if (item.id.startsWith("reclaim:")) {
        return applyReclaim(item, worktreeRoot);
      }
      const colon = item.id.indexOf(":");
      const providerId = colon === -1 ? "" : item.id.slice(colon + 1);
      const provider = providerId ? providerById(providerId) : undefined;
      if (!provider) throw new Error(`no toolchain provider for "${item.id}"`);
      const built = await buildProviderContext(worktreeRoot);
      const spec = await provider.prune(built.ctx);
      if (!spec) {
        return { id: item.id, kind: item.kind, status: "skipped", detail: `${providerId} has no prune spec` };
      }
      const mod = (await importModule(GC_MODULE)) as { runToolPrune?: RunToolPruneFn };
      if (typeof mod.runToolPrune !== "function") throw new Error("gc module unavailable");
      const result = await mod.runToolPrune(built.repoRoot, spec, { apply: true });
      return {
        id: item.id,
        kind: item.kind,
        status: result.applied ? "applied" : "skipped",
        detail: result.note || result.command || spec.description,
        result,
      };
    }
    case "env":
      return { id: item.id, kind: item.kind, status: "skipped", detail: "env is injected by hosts; nothing to apply" };
  }
}

export async function worktreeApplyCommand(
  args: WorktreeApplyArgs,
  _ctx: CommandContext,
): Promise<WorktreeApplyResult> {
  const worktreeRoot = (_ctx.workspacePath ?? process.cwd());
  const notes: string[] = [];
  const skipped: Array<{ id: string; reason: string }> = [];
  let items: AuditModuleItem[] = [];

  const undoId = args.undo?.trim() ?? "";
  if (undoId.length > 0) {
    if (args.yes !== true) {
      notes.push(`undo ${undoId} requires --yes`);
      return { worktreeRoot, dryRun: true, planned: [], applied: [], skipped, notes };
    }
    try {
      const outcome = await undoWorktreeQuarantine(worktreeRoot, undoId);
      return { worktreeRoot, dryRun: false, planned: [], applied: [outcome], skipped, notes };
    } catch (err) {
      return {
        worktreeRoot,
        dryRun: false,
        planned: [],
        applied: [{ id: `undo:${undoId}`, kind: "prune", status: "failed", detail: errorMessage(err) }],
        skipped,
        notes,
      };
    }
  }

  try {
    const auditMod = (await importModule(AUDIT_MODULE)) as AuditModule;
    if (typeof auditMod.auditRepo !== "function") throw new Error("auditRepo export missing");
    const audit = await auditMod.auditRepo(worktreeRoot);
    const repoItems = Array.isArray(audit?.items) ? audit.items : [];
    const worktreeItems = (Array.isArray(audit?.worktrees) ? audit.worktrees : []).flatMap((entry) =>
      Array.isArray(entry.items) ? entry.items : [],
    );
    items = [...repoItems, ...worktreeItems];
  } catch (err) {
    notes.push(`audit unavailable: ${errorMessage(err)}`);
    return { worktreeRoot, dryRun: args.yes !== true, planned: [], applied: [], skipped, notes };
  }

  const selected = selectItems(items, args, skipped);
  if (selected.length === 0 && skipped.length === 0 && !args.item?.length && !args.allSafe) {
    notes.push("no selection: pass --item <id> or --all-safe");
  }

  const planned: WorktreeApplyPlannedItem[] = selected.map((item) => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    safe: item.safe,
    consent: item.consent,
    ...(item.command ? { command: item.command } : {}),
  }));

  if (args.yes !== true) {
    return { worktreeRoot, dryRun: true, planned, applied: [], skipped, notes };
  }

  const applied: WorktreeApplyOutcome[] = [];
  for (const item of selected) {
    try {
      applied.push(await applyItem(item, worktreeRoot, notes));
    } catch (err) {
      applied.push({ id: item.id, kind: item.kind, status: "failed", detail: errorMessage(err) });
    }
  }
  return { worktreeRoot, dryRun: false, planned, applied, skipped, notes };
}

export function renderWorktreeApply(result: unknown): string {
  if (
    !result ||
    typeof result !== "object" ||
    !Array.isArray((result as WorktreeApplyResult).planned)
  ) {
    return JSON.stringify(result, null, 2) ?? String(result);
  }
  const r = result as WorktreeApplyResult;
  const lines: string[] = [`worktree apply ${r.dryRun ? "(plan)" : "(applied)"}: ${r.worktreeRoot}`];
  if (r.planned.length === 0) lines.push("  no items selected");
  for (const item of r.planned) {
    lines.push(`  - ${item.id} [${item.kind}] ${item.title}${item.command ? ` :: ${item.command}` : ""}`);
  }
  if (r.dryRun && r.planned.length > 0) lines.push("re-run with --yes to apply");
  for (const outcome of r.applied) {
    lines.push(`  ${outcome.status}: ${outcome.id} — ${outcome.detail}`);
  }
  for (const entry of r.skipped) {
    lines.push(`  skipped: ${entry.id} — ${entry.reason}`);
  }
  for (const note of r.notes) {
    lines.push(`  note: ${note}`);
  }
  return lines.join("\n");
}
