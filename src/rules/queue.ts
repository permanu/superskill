// SPDX-License-Identifier: Apache-2.0
import { constants, type Stats } from "node:fs";
import { lstat, mkdir, open, readFile, rename, unlink, type FileHandle } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { hostname } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const BATCH_STATUSES = ["pending", "claimed", "done", "failed", "blocked", "superseded"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const TERMINAL_STATUSES = ["done", "failed", "blocked", "superseded"] as const;
export type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

export interface PlanBatch {
  id: string;
  lang: string;
  prefix: string;
  title: string;
  target: number;
  status?: BatchStatus;
  updated?: string | null;
}

export interface PlanWorkstream {
  id: string;
  title: string;
  description?: string;
  status?: BatchStatus;
  updated?: string | null;
}

export interface PlanLanguage {
  lang: string;
  baseline: string;
  target?: number;
  batches?: number;
  note?: string;
}

export interface CampaignPlan {
  version: number;
  generated?: string;
  contract?: string;
  targetTotal?: number;
  /** Set when the plan was reconciled against the delivered catalog. */
  revision?: number;
  revised?: string;
  revision_note?: string;
  languages: PlanLanguage[];
  batches: PlanBatch[];
  nonContent: PlanWorkstream[];
}

export interface StateEntry {
  status: BatchStatus;
  owner?: string | null;
  updated?: string | null;
  claimed_at?: string | null;
  completed_at?: string | null;
  note?: string | null;
}

export interface CampaignState {
  version: number;
  updated?: string | null;
  batches: Record<string, StateEntry>;
  workstreams: Record<string, StateEntry>;
}

export interface QueueOptions {
  /** Directory holding plan.json, state.json and locks/ (default: <repo>/workstreams). */
  workstreamsDir?: string;
  staleMs?: number;
  /** Lock acquisition attempts before giving up (default 20). */
  retries?: number;
  retryDelayMs?: number;
  /** Owner recorded on claims (default: $SUPERSKILL_AGENT or pid-<pid>). */
  owner?: string;
  /** Injectable clock, for tests. */
  now?: () => Date;
}

export type QueueEntryKind = "batch" | "workstream" | "all";

export interface QueueEntry {
  id: string;
  kind: "batch" | "workstream";
  lang: string | null;
  prefix: string | null;
  title: string;
  target: number;
  status: BatchStatus;
  owner: string | null;
  claimed_at: string | null;
  completed_at: string | null;
  updated: string | null;
  note: string | null;
}

export type ClaimResult =
  | { ok: true; entry: QueueEntry }
  | { ok: false; reason: "unknown-batch" | "not-pending" | "lock-timeout"; status?: BatchStatus };

export type ReleaseResult =
  | { ok: true; entry: QueueEntry }
  | { ok: false; reason: "unknown-batch" | "not-claimed" | "lock-timeout"; status?: BatchStatus };

export type CompleteResult =
  | { ok: true; entry: QueueEntry }
  | { ok: false; reason: "unknown-batch" | "not-claimed" | "invalid-status" | "lock-timeout"; status?: BatchStatus };

export interface ListFilter {
  lang?: string;
  status?: BatchStatus;
  kind?: QueueEntryKind;
}

export interface LanguageStats {
  lang: string;
  target: number;
  batches: number;
  byStatus: Record<BatchStatus, number>;
}

export interface QueueStats {
  totalBatches: number;
  totalTarget: number;
  byStatus: Record<BatchStatus, number>;
  byLang: LanguageStats[];
  percentDone: number;
  workstreams: { total: number; byStatus: Record<BatchStatus, number> };
}

export class LockTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LockTimeoutError";
  }
}

const DEFAULT_STALE_MS = 10 * 60 * 1000;
const DEFAULT_RETRIES = 20;
const DEFAULT_RETRY_DELAY_MS = 50;
const MAX_RETRY_DELAY_MS = 250;

interface LockOwner {
  handle: FileHandle;
  identity: Stats;
  raw: string;
}

function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../..");
}

export function defaultWorkstreamsDir(): string {
  return join(repoRoot(), "workstreams");
}

export function resolveWorkstreamsDir(opts: QueueOptions = {}): string {
  return resolve(opts.workstreamsDir ?? defaultWorkstreamsDir());
}

export function planFile(workstreamsDir: string): string {
  return join(workstreamsDir, "plan.json");
}

export function stateFile(workstreamsDir: string): string {
  return join(workstreamsDir, "state.json");
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function emptyStatusCounts(): Record<BatchStatus, number> {
  return { pending: 0, claimed: 0, done: 0, failed: 0, blocked: 0, superseded: 0 };
}

function defaultEntry(status: BatchStatus): StateEntry {
  return {
    status,
    owner: null,
    updated: null,
    claimed_at: null,
    completed_at: null,
    note: null,
  };
}

export async function loadPlan(workstreamsDir?: string): Promise<CampaignPlan> {
  const dir = resolve(workstreamsDir ?? defaultWorkstreamsDir());
  const raw = await readFile(planFile(dir), "utf-8");
  const parsed = JSON.parse(raw) as CampaignPlan;
  validatePlan(parsed);
  return parsed;
}

function validatePlan(plan: CampaignPlan): void {
  if (!plan || !Array.isArray(plan.batches) || !Array.isArray(plan.languages) ||
      (plan.nonContent !== undefined && !Array.isArray(plan.nonContent))) {
    throw new Error("[rules-queue] malformed plan");
  }
  const ids = new Set<string>();
  for (const entry of [...plan.batches, ...(plan.nonContent ?? [])]) {
    const id = entry?.id;
    if (typeof id !== "string" || id.length === 0 || id.trim() !== id || Object.hasOwn(Object.prototype, id)) {
      throw new Error(`[rules-queue] invalid plan id ${JSON.stringify(id)}`);
    }
    if (ids.has(id)) throw new Error(`[rules-queue] duplicate plan id ${JSON.stringify(id)}`);
    ids.add(id);
  }
}

/** Read state.json. Returns null when it has not been initialized yet. */
export async function readState(workstreamsDir?: string): Promise<CampaignState | null> {
  const dir = resolve(workstreamsDir ?? defaultWorkstreamsDir());
  try {
    const raw = await readFile(stateFile(dir), "utf-8");
    const parsed = JSON.parse(raw) as CampaignState;
    if (!parsed || typeof parsed.batches !== "object") {
      throw new Error(`[rules-queue] malformed state at ${stateFile(dir)}`);
    }
    return {
      version: parsed.version ?? 1,
      updated: parsed.updated ?? null,
      batches: parsed.batches,
      workstreams: parsed.workstreams ?? {},
    };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/** Build a fresh state document from a plan. Pure; does not touch disk. */
export function stateFromPlan(plan: CampaignPlan, now?: Date): CampaignState {
  validatePlan(plan);
  const at = now?.toISOString() ?? null;
  const batches: Record<string, StateEntry> = {};
  for (const batch of plan.batches) {
    batches[batch.id] = defaultEntry(batch.status ?? "pending");
  }
  const workstreams: Record<string, StateEntry> = {};
  for (const workstream of plan.nonContent ?? []) {
    workstreams[workstream.id] = defaultEntry(workstream.status ?? "pending");
  }
  return { version: 1, updated: at, batches, workstreams };
}

/** Write state.json initialized from plan.json (overwrites). */
export async function initState(opts: QueueOptions = {}): Promise<CampaignState> {
  const dir = resolveWorkstreamsDir(opts);
  const plan = await loadPlan(dir);
  const state = stateFromPlan(plan, opts.now?.());
  await writeStateFile(dir, state);
  return state;
}

export async function writeStateFile(workstreamsDir: string, state: CampaignState): Promise<void> {
  await mkdir(workstreamsDir, { recursive: true });
  await writeJsonFile(stateFile(workstreamsDir), state);
}

/** Write plan.json atomically (used by the plan-revision flow). */
export async function writePlanFile(workstreamsDir: string, plan: CampaignPlan): Promise<void> {
  validatePlan(plan);
  await mkdir(workstreamsDir, { recursive: true });
  await writeJsonFile(planFile(workstreamsDir), plan);
}

async function writeJsonFile(target: string, data: CampaignPlan | CampaignState): Promise<void> {
  const raw = JSON.stringify(data, null, 2) + "\n";
  const tmp = `${target}.tmp-${process.pid}-${randomBytes(16).toString("hex")}`;
  const handle = await open(tmp, "wx", 0o600);
  try {
    try {
      await handle.writeFile(raw, "utf-8");
    } finally {
      await handle.close();
    }
    await rename(tmp, target);
  } finally {
    await unlink(tmp).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") console.error(`[rules-queue] cannot clean temporary file ${tmp}:`, error.message);
    });
  }
}

interface PlanState {
  plan: CampaignPlan;
  state: CampaignState;
}

function toEntry(
  kind: "batch" | "workstream",
  id: string,
  title: string,
  target: number,
  meta: { lang?: string; prefix?: string },
  entry: StateEntry
): QueueEntry {
  return {
    id,
    kind,
    lang: meta.lang ?? null,
    prefix: meta.prefix ?? null,
    title,
    target,
    status: entry.status,
    owner: entry.owner ?? null,
    claimed_at: entry.claimed_at ?? null,
    completed_at: entry.completed_at ?? null,
    updated: entry.updated ?? null,
    note: entry.note ?? null,
  };
}

/** Merge plan metadata with runtime state into ordered queue entries. Pure. */
export function collectEntries(
  plan: CampaignPlan,
  state: CampaignState,
  filter: ListFilter = {}
): QueueEntry[] {
  const kind = filter.kind ?? "batch";
  const out: QueueEntry[] = [];
  if (kind === "batch" || kind === "all") {
    for (const batch of plan.batches) {
      if (filter.lang && batch.lang !== filter.lang) continue;
      const entry = state.batches[batch.id] ?? defaultEntry(batch.status ?? "pending");
      if (filter.status && entry.status !== filter.status) continue;
      out.push(toEntry("batch", batch.id, batch.title, batch.target, { lang: batch.lang, prefix: batch.prefix }, entry));
    }
  }
  if (kind === "workstream" || kind === "all") {
    for (const workstream of plan.nonContent ?? []) {
      if (filter.lang) continue;
      const entry = state.workstreams[workstream.id] ?? defaultEntry(workstream.status ?? "pending");
      if (filter.status && entry.status !== filter.status) continue;
      out.push(toEntry("workstream", workstream.id, workstream.title, 0, {}, entry));
    }
  }
  return out;
}

export class WorkstreamQueue {
  readonly workstreamsDir: string;
  private readonly staleMs: number;
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly owner: string;
  private readonly now: () => Date;

  constructor(opts: QueueOptions = {}) {
    this.workstreamsDir = resolveWorkstreamsDir(opts);
    this.staleMs = opts.staleMs ?? DEFAULT_STALE_MS;
    this.retries = opts.retries ?? DEFAULT_RETRIES;
    this.retryDelayMs = opts.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    if (!Number.isSafeInteger(this.retries) || this.retries < 1) {
      throw new RangeError("[rules-queue] retries must be a positive finite integer");
    }
    for (const [name, value] of [["staleMs", this.staleMs], ["retryDelayMs", this.retryDelayMs]] as const) {
      if (!Number.isFinite(value) || value < 0) throw new RangeError(`[rules-queue] ${name} must be finite and non-negative`);
    }
    this.owner = opts.owner ?? process.env.SUPERSKILL_AGENT ?? `pid-${process.pid}`;
    this.now = opts.now ?? (() => new Date());
  }

  async claim(id: string): Promise<ClaimResult> {
    try {
      return await this.withStateLock(async () => {
        const { plan, state } = await this.readPlanState();
        const batch = plan.batches.find((b) => b.id === id);
        const workstream = (plan.nonContent ?? []).find((w) => w.id === id);
        if (!batch && !workstream) return { ok: false as const, reason: "unknown-batch" as const };
        const map = batch ? state.batches : state.workstreams;
        const entry = map[id] ?? (map[id] = defaultEntry("pending"));
        if (entry.status !== "pending") {
          return { ok: false as const, reason: "not-pending" as const, status: entry.status };
        }
        const at = this.now().toISOString();
        entry.status = "claimed";
        entry.owner = this.owner;
        entry.claimed_at = at;
        entry.completed_at = null;
        entry.updated = at;
        state.updated = at;
        await writeStateFile(this.workstreamsDir, state);
        return {
          ok: true as const,
          entry: batch
            ? toEntry("batch", batch.id, batch.title, batch.target, { lang: batch.lang, prefix: batch.prefix }, entry)
            : toEntry("workstream", workstream!.id, workstream!.title, 0, {}, entry),
        };
      });
    } catch (e) {
      if (e instanceof LockTimeoutError) return { ok: false, reason: "lock-timeout" };
      throw e;
    }
  }

  async release(id: string): Promise<ReleaseResult> {
    try {
      return await this.withStateLock(async () => {
        const { plan, state } = await this.readPlanState();
        const batch = plan.batches.find((b) => b.id === id);
        const workstream = (plan.nonContent ?? []).find((w) => w.id === id);
        if (!batch && !workstream) return { ok: false as const, reason: "unknown-batch" as const };
        const map = batch ? state.batches : state.workstreams;
        const entry = map[id] ?? (map[id] = defaultEntry("pending"));
        if (entry.status !== "claimed") {
          return { ok: false as const, reason: "not-claimed" as const, status: entry.status };
        }
        const at = this.now().toISOString();
        entry.status = "pending";
        entry.owner = null;
        entry.claimed_at = null;
        entry.completed_at = null;
        entry.updated = at;
        state.updated = at;
        await writeStateFile(this.workstreamsDir, state);
        return {
          ok: true as const,
          entry: batch
            ? toEntry("batch", batch.id, batch.title, batch.target, { lang: batch.lang, prefix: batch.prefix }, entry)
            : toEntry("workstream", workstream!.id, workstream!.title, 0, {}, entry),
        };
      });
    } catch (e) {
      if (e instanceof LockTimeoutError) return { ok: false, reason: "lock-timeout" };
      throw e;
    }
  }

  async complete(id: string, status: TerminalStatus): Promise<CompleteResult> {
    if (!TERMINAL_STATUSES.includes(status)) {
      return { ok: false, reason: "invalid-status" };
    }
    try {
      return await this.withStateLock(async () => {
        const { plan, state } = await this.readPlanState();
        const batch = plan.batches.find((b) => b.id === id);
        const workstream = (plan.nonContent ?? []).find((w) => w.id === id);
        if (!batch && !workstream) return { ok: false as const, reason: "unknown-batch" as const };
        const map = batch ? state.batches : state.workstreams;
        const entry = map[id] ?? (map[id] = defaultEntry("pending"));
        if (entry.status !== "claimed") {
          return { ok: false as const, reason: "not-claimed" as const, status: entry.status };
        }
        const at = this.now().toISOString();
        entry.status = status;
        entry.completed_at = at;
        entry.updated = at;
        state.updated = at;
        await writeStateFile(this.workstreamsDir, state);
        return {
          ok: true as const,
          entry: batch
            ? toEntry("batch", batch.id, batch.title, batch.target, { lang: batch.lang, prefix: batch.prefix }, entry)
            : toEntry("workstream", workstream!.id, workstream!.title, 0, {}, entry),
        };
      });
    } catch (e) {
      if (e instanceof LockTimeoutError) return { ok: false, reason: "lock-timeout" };
      throw e;
    }
  }

  async list(filter: ListFilter = {}): Promise<QueueEntry[]> {
    const { plan, state } = await this.withStateLock(() => this.readPlanState());
    return collectEntries(plan, state, filter);
  }

  async stats(): Promise<QueueStats> {
    const { plan, state } = await this.withStateLock(() => this.readPlanState());
    const byStatus = emptyStatusCounts();
    const byLang: LanguageStats[] = [];
    let totalTarget = 0;
    for (const language of plan.languages) {
      const stats: LanguageStats = { lang: language.lang, target: 0, batches: 0, byStatus: emptyStatusCounts() };
      byLang.push(stats);
    }
    const langIndex = new Map(byLang.map((l) => [l.lang, l]));
    for (const batch of plan.batches) {
      const entry = state.batches[batch.id] ?? defaultEntry(batch.status ?? "pending");
      byStatus[entry.status]++;
      totalTarget += batch.target;
      const lang = langIndex.get(batch.lang);
      if (lang) {
        lang.byStatus[entry.status]++;
        lang.batches++;
        lang.target += batch.target;
      }
    }
    const workstreams = emptyStatusCounts();
    let workstreamTotal = 0;
    for (const workstream of plan.nonContent ?? []) {
      const entry = state.workstreams[workstream.id] ?? defaultEntry(workstream.status ?? "pending");
      workstreams[entry.status]++;
      workstreamTotal++;
    }
    const totalBatches = plan.batches.length;
    return {
      totalBatches,
      totalTarget,
      byStatus,
      byLang,
      percentDone: totalBatches === 0 ? 0 : (byStatus.done / totalBatches) * 100,
      workstreams: { total: workstreamTotal, byStatus: workstreams },
    };
  }

  private async readPlanState(): Promise<PlanState> {
    const plan = await loadPlan(this.workstreamsDir);
    let state = await readState(this.workstreamsDir);
    if (!state) {
      state = stateFromPlan(plan, this.now());
      await writeStateFile(this.workstreamsDir, state);
    }
    return { plan, state };
  }

  private async withStateLock<T>(fn: () => Promise<T>): Promise<T> {
    const lockDir = join(this.workstreamsDir, "locks");
    await mkdir(lockDir, { recursive: true });
    const lockPath = join(lockDir, "state.lock");
    const lock = await this.acquireLock(lockPath);
    try {
      return await fn();
    } finally {
      try {
        await this.unlinkOwnedLock(lockPath, lock.identity, lock.raw);
      } finally {
        await lock.handle.close();
      }
    }
  }

  /** O_CREAT|O_EXCL lockfile acquisition with stale-lock recovery. */
  private async acquireLock(lockPath: string): Promise<LockOwner> {
    for (let attempt = 0; attempt < this.retries; attempt++) {
      let handle: FileHandle;
      try {
        handle = await open(lockPath, "wx", 0o600);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
        if (await this.breakStaleLock(lockPath)) continue;
        if (attempt + 1 < this.retries) {
          await delay(Math.min(MAX_RETRY_DELAY_MS, this.retryDelayMs * 2 ** Math.min(attempt, 8)));
        }
        continue;
      }
      let identity: Stats | undefined;
      try {
        identity = await handle.stat();
        const raw = JSON.stringify({
          pid: process.pid, host: hostname(), token: randomBytes(16).toString("hex"),
          owner: this.owner, at: this.now().toISOString(),
        });
        await handle.writeFile(raw, "utf-8");
        return { handle, identity, raw };
      } catch (error) {
        try {
          if (identity) await this.unlinkOwnedLock(lockPath, identity);
        } finally {
          await handle.close();
        }
        throw error;
      }
    }
    throw new LockTimeoutError(`[rules-queue] could not acquire lock ${lockPath} after ${this.retries} attempts`);
  }

  private async breakStaleLock(lockPath: string): Promise<boolean> {
    let handle: FileHandle | undefined;
    try {
      const identity = await lstat(lockPath);
      if (!identity.isFile()) {
        console.error(`[rules-queue] failed to break stale lock ${lockPath}:`, "not a regular file");
        return false;
      }
      handle = await open(lockPath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      const opened = await handle.stat();
      if (opened.ino !== identity.ino || opened.dev !== identity.dev) return false;
      const raw = await handle.readFile("utf-8");
      let owner: { pid?: unknown; host?: unknown } | null = null;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object") owner = parsed;
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
      }
      if (typeof owner?.host === "string" && owner.host !== hostname()) return false;
      if (typeof owner?.pid === "number" && Number.isSafeInteger(owner.pid) && owner.pid > 0) {
        try {
          process.kill(owner.pid, 0);
          return false;
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code !== "ESRCH") {
            if (code !== "EPERM") console.error(`[rules-queue] cannot check lock pid ${owner.pid}:`, (error as Error).message);
            return false;
          }
        }
      } else if (Date.now() - identity.mtimeMs <= this.staleMs) {
        return false;
      }
      return await this.unlinkOwnedLock(lockPath, identity, raw);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return true;
      console.error(`[rules-queue] failed to break stale lock ${lockPath}:`, (e as Error).message);
      return false;
    } finally {
      await handle?.close();
    }
  }

  private async unlinkOwnedLock(lockPath: string, identity: Stats, raw?: string): Promise<boolean> {
    try {
      const before = await lstat(lockPath);
      if (before.ino !== identity.ino || before.dev !== identity.dev || !before.isFile()) return false;
      if (raw !== undefined && await readFile(lockPath, "utf-8") !== raw) return false;
      const after = await lstat(lockPath);
      if (after.ino !== identity.ino || after.dev !== identity.dev) return false;
      await unlink(lockPath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
      console.error(`[rules-queue] cannot release lock ${lockPath}:`, (error as Error).message);
      throw error;
    }
  }
}

export function claim(id: string, opts?: QueueOptions): Promise<ClaimResult> {
  return new WorkstreamQueue(opts).claim(id);
}

export function release(id: string, opts?: QueueOptions): Promise<ReleaseResult> {
  return new WorkstreamQueue(opts).release(id);
}

export function complete(id: string, status: TerminalStatus, opts?: QueueOptions): Promise<CompleteResult> {
  return new WorkstreamQueue(opts).complete(id, status);
}

export function list(filter?: ListFilter, opts?: QueueOptions): Promise<QueueEntry[]> {
  return new WorkstreamQueue(opts).list(filter);
}

export function stats(opts?: QueueOptions): Promise<QueueStats> {
  return new WorkstreamQueue(opts).stats();
}
