// SPDX-License-Identifier: Apache-2.0

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  HygieneItem,
  HygieneProbe,
  HygieneProbeOptions,
  HygieneProbeResult,
} from "../types.js";

const execFileAsync = promisify(execFile);

const DF_TIMEOUT_MS = 10_000;
const DF_MAX_BUFFER = 10 * 1024 * 1024;
const VOLUME_INSPECT_TIMEOUT_MS = 5_000;
const VOLUME_INSPECT_MAX_BUFFER = 1024 * 1024;
const MAX_VOLUME_INSPECTIONS = 25;
const VOLUME_INSPECT_CONCURRENCY = 8;
const MAX_VOLUME_INSPECT_ERROR_LOGS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const DECIMAL_GB = 1_000_000_000;
const DECIMAL_MB = 1_000_000;

const DAEMON_DOWN_PATTERN =
  /Cannot connect to the Docker daemon|Is the docker daemon running|error during connect|docker daemon is not running/i;
const CREATED_AT_PATTERN = /"CreatedAt"\s*:\s*"([^"]+)"/;

// Docker reports sizes with decimal (1000-based) units, e.g. 1.2kB, 181MB, 3.484GB.
const SIZE_UNITS: Record<string, number> = {
  b: 1,
  kb: 1_000,
  mb: 1_000 ** 2,
  gb: 1_000 ** 3,
  tb: 1_000 ** 4,
  pb: 1_000 ** 5,
};

export interface DockerExecResult {
  stdout: string;
  stderr?: string;
}

export type DockerExec = (
  cmd: string,
  args: string[],
  opts: { timeout: number; maxBuffer: number },
) => Promise<DockerExecResult>;

export interface DockerProbeDeps {
  exec?: DockerExec;
}

export interface VolumeRow {
  name: string;
  links: number;
  bytes: number;
}

export interface DfVerboseTables {
  volumes: VolumeRow[];
  danglingImages: { count: number; bytes: number };
  buildCacheReclaimableBytes: number | null;
}

export function parseHumanSize(input: string): number | null {
  const match = input.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]{1,2})?(?=[\s(]|$)/);
  if (match === null) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const unit = (match[2] ?? "").toLowerCase();
  if (unit.length === 0) return Math.round(value);
  const multiplier = SIZE_UNITS[unit];
  if (multiplier === undefined) return null;
  return Math.round(value * multiplier);
}

type SectionName = "images" | "containers" | "volumes" | "buildCache";

interface SectionTable {
  header: string[];
  rows: string[][];
}

const SECTION_HEADERS: ReadonlyArray<readonly [SectionName, RegExp]> = [
  ["images", /^Images space usage:/i],
  ["containers", /^Containers space usage:/i],
  ["volumes", /^Local Volumes space usage:/i],
  ["buildCache", /^Build cache usage:/i],
];

function splitNColumns(line: string): string[] {
  return line
    .split(/\s{2,}/)
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

function splitSections(stdout: string): Partial<Record<SectionName, SectionTable>> {
  const sections: Partial<Record<SectionName, SectionTable>> = {};
  let current: SectionName | null = null;
  for (const rawLine of stdout.split("\n")) {
    const line = rawLine.trim();
    const sectionHeader = SECTION_HEADERS.find(([, pattern]) => pattern.test(line));
    if (sectionHeader !== undefined) {
      current = sectionHeader[0];
      sections[current] = { header: [], rows: [] };
      continue;
    }
    if (current === null || line.length === 0) continue;
    const table = sections[current];
    if (table === undefined) continue;
    const cells = splitNColumns(line);
    if (table.header.length === 0) {
      table.header = cells;
    } else {
      table.rows.push(cells);
    }
  }
  return sections;
}

function headerIndex(header: string[], name: string, fallback: number): number {
  const index = header.findIndex((cell) => cell.toUpperCase() === name);
  return index >= 0 ? index : fallback;
}

function parseVolumeRows(section: SectionTable | undefined): VolumeRow[] {
  const rows: VolumeRow[] = [];
  if (section === undefined || section.header.length === 0) return rows;
  const nameIndex = headerIndex(section.header, "VOLUME NAME", 0);
  const linksIndex = headerIndex(section.header, "LINKS", 1);
  const sizeIndex = headerIndex(section.header, "SIZE", 2);
  for (const cells of section.rows) {
    const name = cells[nameIndex]?.trim();
    const linksRaw = cells[linksIndex]?.trim();
    const sizeRaw = cells[sizeIndex]?.trim();
    if (name === undefined || name.length === 0) continue;
    if (linksRaw === undefined || !/^\d+$/.test(linksRaw)) continue;
    if (sizeRaw === undefined) continue;
    const bytes = parseHumanSize(sizeRaw);
    if (bytes === null) continue;
    rows.push({ name, links: Number.parseInt(linksRaw, 10), bytes });
  }
  return rows;
}

function parseDanglingImages(section: SectionTable | undefined): { count: number; bytes: number } {
  const result = { count: 0, bytes: 0 };
  if (section === undefined || section.header.length === 0) return result;
  const repositoryIndex = headerIndex(section.header, "REPOSITORY", 0);
  const tagIndex = headerIndex(section.header, "TAG", 1);
  const sizeIndex = headerIndex(section.header, "SIZE", 4);
  for (const cells of section.rows) {
    const repository = cells[repositoryIndex]?.trim();
    const tag = cells[tagIndex]?.trim();
    if (repository !== "<none>" || tag !== "<none>") continue;
    result.count += 1;
    const sizeRaw = cells[sizeIndex]?.trim();
    if (sizeRaw === undefined) continue;
    const bytes = parseHumanSize(sizeRaw);
    if (bytes !== null) result.bytes += bytes;
  }
  return result;
}

type BuildCacheState = "none" | "verbose" | "unknown";

interface ParsedDfTables extends DfVerboseTables {
  buildCacheEntryCount: number;
  buildCacheState: BuildCacheState;
}

function parseBuildCacheSection(section: SectionTable | undefined): {
  state: BuildCacheState;
  reclaimableBytes: number | null;
  entryCount: number;
} {
  if (section === undefined || section.header.length === 0 || section.rows.length === 0) {
    return { state: "none", reclaimableBytes: 0, entryCount: 0 };
  }
  const entryCount = section.rows.length;
  const reclaimIndex = section.header.findIndex((cell) => /reclaim/i.test(cell));
  if (reclaimIndex < 0) return { state: "unknown", reclaimableBytes: null, entryCount };
  let sum = 0;
  let parsed = 0;
  for (const cells of section.rows) {
    const raw = cells[reclaimIndex];
    if (raw === undefined) continue;
    const bytes = parseHumanSize(raw);
    if (bytes === null) continue;
    sum += bytes;
    parsed += 1;
  }
  if (parsed === 0) return { state: "unknown", reclaimableBytes: null, entryCount };
  return { state: "verbose", reclaimableBytes: sum, entryCount };
}

function parseDfVerbose(stdout: string): ParsedDfTables {
  const sections = splitSections(stdout);
  const buildCache = parseBuildCacheSection(sections.buildCache);
  return {
    volumes: parseVolumeRows(sections.volumes),
    danglingImages: parseDanglingImages(sections.images),
    buildCacheReclaimableBytes: buildCache.reclaimableBytes,
    buildCacheEntryCount: buildCache.entryCount,
    buildCacheState: buildCache.state,
  };
}

export function parseDfVerboseTables(stdout: string): DfVerboseTables {
  const parsed = parseDfVerbose(stdout);
  return {
    volumes: parsed.volumes,
    danglingImages: parsed.danglingImages,
    buildCacheReclaimableBytes: parsed.buildCacheReclaimableBytes,
  };
}

function parseSummaryBuildCache(stdout: string): {
  reclaimableBytes: number | null;
  entryCount: number | null;
} {
  const lines = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const headerLine = lines.find((line) => /^TYPE\b/i.test(line) && /reclaimable/i.test(line));
  const headerCells = headerLine === undefined ? [] : splitNColumns(headerLine);
  const reclaimIndex = headerCells.findIndex((cell) => /reclaim/i.test(cell));
  const totalIndex = headerCells.findIndex((cell) => /^TOTAL$/i.test(cell));
  const rowLine = lines.find((line) => /^Build Cache\b/i.test(line));
  if (rowLine === undefined) return { reclaimableBytes: null, entryCount: null };
  const cells = splitNColumns(rowLine);
  const reclaimCell = reclaimIndex >= 0 ? cells[reclaimIndex] : cells[cells.length - 1];
  const totalCell = totalIndex >= 0 ? cells[totalIndex] : cells[1];
  const reclaimableBytes = reclaimCell === undefined ? null : parseHumanSize(reclaimCell);
  const entryCount = totalCell === undefined ? null : Number.parseInt(totalCell, 10);
  return {
    reclaimableBytes,
    entryCount: entryCount !== null && Number.isFinite(entryCount) ? entryCount : null,
  };
}

interface ExecFailure {
  code?: unknown;
  message: string;
  stdout: string;
  stderr: string;
}

type ExecOutcome =
  | { kind: "ok"; stdout: string; stderr: string }
  | { kind: "missing" }
  | { kind: "error"; failure: ExecFailure };

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

const defaultExec: DockerExec = async (cmd, args, opts) => {
  const { stdout, stderr } = await execFileAsync(cmd, args, opts);
  return { stdout, stderr };
};

async function runExec(
  exec: DockerExec,
  args: string[],
  timeout: number,
  maxBuffer: number,
): Promise<ExecOutcome> {
  try {
    const result = await exec("docker", args, { timeout, maxBuffer });
    return { kind: "ok", stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
  } catch (error: unknown) {
    const record = asRecord(error);
    if (record.code === "ENOENT") return { kind: "missing" };
    return {
      kind: "error",
      failure: {
        code: record.code,
        message: typeof record.message === "string" ? record.message : String(error),
        stdout: typeof record.stdout === "string" ? record.stdout : "",
        stderr: typeof record.stderr === "string" ? record.stderr : "",
      },
    };
  }
}

function isDaemonDown(...parts: Array<string | undefined>): boolean {
  return parts.some((part) => part !== undefined && DAEMON_DOWN_PATTERN.test(part));
}

// Docker emits nanosecond precision (e.g. .123456789Z); Date.parse expects milliseconds.
function parseCreatedAt(output: string): number | null {
  const match = output.match(CREATED_AT_PATTERN);
  if (match === null) return null;
  const raw = match[1];
  if (raw === undefined) return null;
  const parsed = Date.parse(raw.replace(/(\.\d{3})\d+/, "$1"));
  return Number.isFinite(parsed) ? parsed : null;
}

async function mapLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item === undefined) continue;
      await fn(item);
    }
  };
  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

async function oldestUnreferencedVolumeAgeDays(
  exec: DockerExec,
  names: string[],
  now: number,
): Promise<number | null> {
  const targets = names.slice(0, MAX_VOLUME_INSPECTIONS);
  const createdAt: number[] = [];
  let loggedFailures = 0;
  await mapLimit(targets, VOLUME_INSPECT_CONCURRENCY, async (name) => {
    const outcome = await runExec(
      exec,
      ["volume", "inspect", name],
      VOLUME_INSPECT_TIMEOUT_MS,
      VOLUME_INSPECT_MAX_BUFFER,
    );
    if (outcome.kind === "missing") return;
    if (outcome.kind === "error") {
      if (loggedFailures < MAX_VOLUME_INSPECT_ERROR_LOGS) {
        loggedFailures += 1;
        console.error(
          `[hygiene-docker] volume inspect failed for ${name}: ${outcome.failure.message}`,
        );
      }
      return;
    }
    const parsed = parseCreatedAt(outcome.stdout);
    if (parsed !== null) createdAt.push(parsed);
  });
  if (createdAt.length === 0) return null;
  const oldest = Math.min(...createdAt);
  const ageDays = (now - oldest) / DAY_MS;
  return Number.isFinite(ageDays) ? Math.max(0, Math.floor(ageDays)) : null;
}

function skipped(reason: string): HygieneProbeResult {
  return {
    category: "docker",
    label: "Docker",
    items: [],
    skipped: { probe: "docker", reason },
  };
}

export async function runDockerProbe(
  opts: HygieneProbeOptions,
  deps: DockerProbeDeps = {},
): Promise<HygieneProbeResult> {
  const exec = deps.exec ?? defaultExec;
  try {
    const primary = await runExec(exec, ["system", "df", "-v"], DF_TIMEOUT_MS, DF_MAX_BUFFER);
    if (primary.kind === "missing") return skipped("docker CLI not installed");
    if (primary.kind === "error") {
      const failure = primary.failure;
      if (isDaemonDown(failure.message, failure.stdout, failure.stderr)) {
        return skipped("docker daemon not running");
      }
      console.error(`[hygiene-docker] docker system df -v failed: ${failure.message}`);
      return skipped(`docker system df -v failed: ${failure.message}`);
    }
    if (isDaemonDown(primary.stdout, primary.stderr)) {
      return skipped("docker daemon not running");
    }

    const parsed = parseDfVerbose(primary.stdout);
    const items: HygieneItem[] = [];

    const unreferenced = parsed.volumes.filter((volume) => volume.links === 0);
    if (unreferenced.length > 0) {
      const bytes = unreferenced.reduce((total, volume) => total + volume.bytes, 0);
      const ageDays = await oldestUnreferencedVolumeAgeDays(
        exec,
        unreferenced.map((volume) => volume.name),
        opts.now,
      );
      const reasonBase =
        "LINKS=0 means no container references these volumes; verify the data is disposable before removing";
      items.push({
        id: "docker:volumes",
        category: "docker",
        title: "Unreferenced docker volumes",
        path: null,
        bytes,
        ageDays,
        tier: "review",
        due:
          bytes >= DECIMAL_GB &&
          ageDays !== null &&
          ageDays >= opts.policy.dockerMinAgeDays,
        reason:
          ageDays === null ? `${reasonBase}; age unknown; verify manually` : reasonBase,
        plan: "docker volume ls --filter dangling=true then docker volume rm <name...>",
        meta: { count: unreferenced.length },
      });
    }

    items.push({
      id: "docker:images",
      category: "docker",
      title: "Dangling docker images",
      path: null,
      bytes: parsed.danglingImages.bytes,
      ageDays: null,
      tier: "auto",
      due: parsed.danglingImages.bytes >= 512 * DECIMAL_MB,
      reason: "untagged layers, not referenced by any image",
      plan: "docker image prune -f",
      meta: { count: parsed.danglingImages.count },
    });

    let buildCacheReclaimable = parsed.buildCacheReclaimableBytes;
    let buildCacheReclaimKnown = parsed.buildCacheState !== "unknown";
    let buildCacheCount = parsed.buildCacheEntryCount;

    if (parsed.buildCacheState === "unknown") {
      const summary = await runExec(exec, ["system", "df"], DF_TIMEOUT_MS, DF_MAX_BUFFER);
      if (summary.kind === "ok") {
        const summaryCache = parseSummaryBuildCache(summary.stdout);
        if (summaryCache.reclaimableBytes !== null) {
          buildCacheReclaimable = summaryCache.reclaimableBytes;
          buildCacheReclaimKnown = true;
        }
        if (summaryCache.entryCount !== null) buildCacheCount = summaryCache.entryCount;
      } else if (summary.kind === "error") {
        console.error(`[hygiene-docker] docker system df failed: ${summary.failure.message}`);
      }
    }

    items.push({
      id: "docker:build-cache",
      category: "docker",
      title: "Docker build cache",
      path: null,
      bytes: buildCacheReclaimable,
      ageDays: null,
      tier: "auto",
      due: buildCacheReclaimable !== null && buildCacheReclaimable >= DECIMAL_GB,
      reason: buildCacheReclaimKnown
        ? "reclaimable build cache from intermediate build layers"
        : "build cache present but reclaimable size is unavailable; check docker system df",
      plan: "docker builder prune -f",
      meta: { count: buildCacheCount },
    });

    return { category: "docker", label: "Docker", items, skipped: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[hygiene-docker] probe failed: ${message}`);
    return skipped(`docker probe failed: ${message}`);
  }
}

export const dockerProbe: HygieneProbe = {
  id: "docker",
  run: (probeOpts) => runDockerProbe(probeOpts),
};
