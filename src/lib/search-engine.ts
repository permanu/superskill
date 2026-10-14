// SPDX-License-Identifier: Apache-2.0
import { execFile } from "child_process";
import { promisify } from "util";
import { resolve, relative } from "path";
import { constants } from "node:fs";
import { open } from "fs/promises";
import { parseFrontmatter } from "./frontmatter.js";
import { escapeRegex } from "./escape-regex.js";
import { VaultFS, VaultError } from "./vault-fs.js";

const execFileAsync = promisify(execFile);

export function validateSearchLimit(limit: number): void {
  if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error("limit must be a positive safe integer");
}

export interface SearchResult {
  path: string;
  snippet: string;
  line: number;
}

/**
 * Validate that a search path stays within the vault root.
 * Throws if the path escapes the vault boundary.
 */
async function validateSearchPath(vaultFs: VaultFS, searchPath: string): Promise<string> {
  const vaultPath = vaultFs.root;
  const resolved = resolve(vaultPath, searchPath);
  const rel = relative(vaultPath, resolved);
  if (rel.startsWith("..") || rel.startsWith("/")) {
    throw new Error(`Search path escapes vault: ${searchPath}`);
  }
  await vaultFs.verifyNoSymlinkEscape(searchPath);
  return resolved;
}

async function readableSearchPath(vaultFs: VaultFS, path: string): Promise<boolean> {
  if (path.split(/[\\/]/).some((segment) => segment.startsWith(".")) || /[\x00-\x1f\x7f]/.test(path)) return false;
  try {
    await vaultFs.verifyNoSymlinkEscape(path);
    return true;
  } catch (error) {
    if (error instanceof VaultError && (error.code === "PERMISSION_DENIED" || error.code === "FILE_NOT_FOUND")) return false;
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

/**
 * Convert an absolute path from rg output to a vault-relative path.
 * Uses path.relative for correctness instead of string replacement.
 */
function toRelativePath(vaultPath: string, absPath: string): string {
  return relative(vaultPath, absPath);
}

/**
 * Full-text search using ripgrep.
 */
export async function searchText(
  vaultPath: string,
  query: string,
  options: {
    pathFilter?: string;
    limit?: number;
  } = {}
): Promise<SearchResult[]> {
  const { pathFilter, limit = 10 } = options;
  validateSearchLimit(limit);
  const vaultFs = new VaultFS(vaultPath);

  const args = [
    "--json",
    "--max-count", "3",
    "--max-filesize", "10M",
    "--type", "md",
    "--glob", "!**/[pP][eE][rR][sS][oO][nN][aA][lL]/**",
    "--ignore-case",
    "--fixed-strings",
    "--",
    query,
  ];

  // Validate pathFilter stays within vault
  const searchPath = pathFilter
    ? await validateSearchPath(vaultFs, pathFilter)
    : await validateSearchPath(vaultFs, ".");

  try {
    const { stdout } = await execFileAsync("rg", [...args, searchPath], {
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });

    const results: SearchResult[] = [];
    const seenPaths = new Map<string, SearchResult>();

    for (const line of stdout.split("\n").filter(Boolean)) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === "match") {
          const absPath = parsed.data.path.text;
          const relPath = toRelativePath(vaultPath, absPath);
          const snippet = parsed.data.lines.text.trim().slice(0, 200);
          const lineNum = parsed.data.line_number;

          // Skip hidden dirs and paths escaping vault
          if (!await readableSearchPath(vaultFs, relPath)) continue;

          // Keep the best snippet per file (prefer earlier matches with more content)
          if (!seenPaths.has(relPath)) {
            const result = { path: relPath, snippet, line: lineNum };
            seenPaths.set(relPath, result);
            results.push(result);
          }

          if (results.length >= limit) break;
        }
      } catch (e: any) {
        if (e.code !== "ENOENT") {
          console.error("[search] Skipping malformed rg line:", e.message);
        }
      }
    }

    return results;
  } catch (e: any) {
    if (e.code === "ENOENT" && (e.message as string).includes("rg")) {
      console.error("[search] ripgrep (rg) not found. Install it or search will be unavailable.");
      throw new Error("ripgrep (rg) is required for text search. Install it: https://github.com/BurntSushi/ripgrep");
    }
    if (e.code === 1 || e.status === 1) return [];
    throw e;
  }
}

/**
 * Structured search by frontmatter properties.
 * Scans files and filters by frontmatter fields.
 */
export async function searchStructured(
  vaultPath: string,
  filters: Record<string, string>,
  options: { limit?: number; pathFilter?: string } = {}
): Promise<SearchResult[]> {
  const { limit = 10, pathFilter } = options;
  validateSearchLimit(limit);
  const vaultFs = new VaultFS(vaultPath);
  const searchRoot = await validateSearchPath(vaultFs, pathFilter ?? ".");

  // No filters means no structured criteria; return no matches rather than
  // building an empty regex.
  if (Object.keys(filters).length === 0) return [];

  const results: SearchResult[] = [];

  // Build grep patterns to narrow candidates (search for both key and value)
  // SECURITY: escape both key and value to prevent regex injection
  // Note: We search separately because YAML arrays span multiple lines
  const firstKey = Object.keys(filters)[0];
  const firstValue = filters[firstKey];
  const keyPattern = escapeRegex(firstKey) + ":";
  const valuePattern = escapeRegex(firstValue);

  let candidates: string[];
  try {
    const { stdout } = await execFileAsync("rg", [
      "--files-with-matches",
      "--null",
      "--max-filesize", "100K",
      "--type", "md",
      "--glob", "!**/[pP][eE][rR][sS][oO][nN][aA][lL]/**",
      "--regexp", keyPattern,
      "--regexp", valuePattern,
      "--",
      searchRoot,
    ], { timeout: 10_000, maxBuffer: 1024 * 1024 });
    candidates = stdout.split("\0").filter(Boolean);
  } catch (e: any) {
    if (e.code === "ENOENT" && (e.message as string).includes("rg")) {
      throw new Error("ripgrep (rg) is required for structured search. Install it: https://github.com/BurntSushi/ripgrep");
    }
    if (e.code === 1 || e.status === 1) return [];
    throw e;
  }

  const MAX_FILE_SIZE = 100_000; // 100 KB — skip large files in structured search

  for (const absPath of candidates) {
    if (results.length >= limit) break;

    const relPath = toRelativePath(vaultPath, absPath);
    if (!await readableSearchPath(vaultFs, relPath)) continue;

    try {
      const handle = await open(absPath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      let content: string;
      try {
        const fileStat = await handle.stat();
        if (!fileStat.isFile() || fileStat.size > MAX_FILE_SIZE) continue;
        if (!await readableSearchPath(vaultFs, relPath)) continue;
        const buffer = Buffer.alloc(MAX_FILE_SIZE + 1);
        let bytes = 0;
        while (bytes < buffer.length) {
          const result = await handle.read(buffer, bytes, buffer.length - bytes, bytes);
          if (result.bytesRead === 0) break;
          bytes += result.bytesRead;
        }
        if (bytes > MAX_FILE_SIZE || !await readableSearchPath(vaultFs, relPath)) continue;
        content = buffer.subarray(0, bytes).toString("utf8");
      } finally {
        await handle.close();
      }
      const { data } = parseFrontmatter(content);

      // Check all filters match
      let match = true;
      for (const [key, value] of Object.entries(filters)) {
        const fieldValue = data[key];
        if (Array.isArray(fieldValue)) {
          if (!fieldValue.includes(value)) { match = false; break; }
        } else if (String(fieldValue) !== value) {
          match = false;
          break;
        }
      }

      if (match) {
        const lines = content.split("\n");
        const firstContentLine = lines.find(
          (l) => l.startsWith("# ") || (l.trim() && !l.startsWith("---") && !l.match(/^\w+:\s/))
        );
        results.push({
          path: relPath,
          snippet: firstContentLine?.trim().slice(0, 200) ?? "",
          line: 1,
        });
      }
    } catch (e: any) {
      if (e.code !== "ENOENT") {
        console.error(`[search] Skipping unreadable file ${absPath}:`, e.message);
      }
    }
  }

  return results;
}
