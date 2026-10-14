// SPDX-License-Identifier: Apache-2.0
//
// Fingerprint cache for the doctor's catalog validation. Validation parses all
// ~2,200 rule files; the result only changes when the catalog tree changes, so
// the doctor serves a cached summary while the fingerprint (relative path,
// size, mtime of every file under the catalog) is unchanged. The explicit
// `validate` CLI always validates fresh and never touches this cache.

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";
import { mapConcurrent } from "../lib/concurrency.js";
import { validateAll } from "./validate.js";

/** Bump when the cache schema OR validation semantics change. */
const CACHE_VERSION = 2;

export interface CatalogValidationSummary {
  ruleCount: number;
  checkedCount: number;
  errorCount: number;
  warningCount: number;
}

export interface CatalogValidationOutcome {
  report: CatalogValidationSummary;
  cached: boolean;
  checkedAt: string;
}

interface CacheEntry {
  v: number;
  catalogRoot: string;
  fingerprint: string;
  checkedAt: string;
  report: CatalogValidationSummary;
}

export function defaultCatalogCachePath(): string {
  return join(homedir(), ".superskill", "cache", "rules-validation.json");
}

async function collectFiles(dir: string, out: string[]): Promise<void> {
  const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
}

const FINGERPRINT_CONCURRENCY = 16;

export async function catalogFingerprint(root: string): Promise<string> {
  const files: string[] = [];
  await collectFiles(root, files);
  files.sort();
  const lines = await mapConcurrent(files, FINGERPRINT_CONCURRENCY, async (full) => {
    const info = await stat(full);
    return `${relative(root, full)}:${info.size}:${info.mtimeMs}`;
  });
  return createHash("sha256").update(`${CACHE_VERSION}\n${lines.join("\n")}`).digest("hex");
}

async function readCache(cachePath: string): Promise<CacheEntry | null> {
  try {
    const parsed = JSON.parse(await readFile(cachePath, "utf-8")) as CacheEntry;
    if (parsed?.v !== CACHE_VERSION || typeof parsed.fingerprint !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(cachePath: string, entry: CacheEntry): Promise<void> {
  await mkdir(dirname(cachePath), { recursive: true });
  const tmp = `${cachePath}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(entry), "utf-8");
  await rename(tmp, cachePath);
}

/** Validate the catalog, reusing a cached summary while the tree is unchanged. */
export async function validateCatalogCached(
  root: string,
  cachePath: string = defaultCatalogCachePath(),
): Promise<CatalogValidationOutcome> {
  const fingerprint = await catalogFingerprint(root);
  const cached = await readCache(cachePath);
  if (cached && cached.fingerprint === fingerprint && cached.catalogRoot === root) {
    return { report: cached.report, cached: true, checkedAt: cached.checkedAt };
  }

  const report = await validateAll(root, { compile: false });
  const summary: CatalogValidationSummary = {
    ruleCount: report.ruleCount,
    checkedCount: report.checkedCount,
    errorCount: report.errors.length,
    warningCount: report.warnings.length,
  };
  const checkedAt = new Date().toISOString();
  try {
    await writeCache(cachePath, { v: CACHE_VERSION, catalogRoot: root, fingerprint, checkedAt, report: summary });
  } catch (e: unknown) {
    console.error(`[rules-cache] cannot write validation cache: ${e instanceof Error ? e.message : String(e)}`);
  }
  return { report: summary, cached: false, checkedAt };
}
