// SPDX-License-Identifier: Apache-2.0
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { backupOnce, writeTextAtomic } from "./helpers.js";
import type { AdapterActionResult, AdapterContext, HostAdapter } from "./types.js";

const ADAPTER_ID = "generic";
const START_MARKER = "<!-- superskill:worktree-start -->";
const END_MARKER = "<!-- superskill:worktree-end -->";

const MANAGED_BLOCK = [
  START_MARKER,
  "## SuperSkill worktree caches",
  "- Run `superskill-cli worktree env --eval` (or the MCP tool `worktree_env`) before installing dependencies in a worktree.",
  "- Never symlink `node_modules` or share `target/`, `.venv`, `DerivedData` between worktrees.",
  "- `superskill-cli worktree audit` reports cache duplication; `worktree gc` is report-only unless `--apply`.",
  END_MARKER,
].join("\n");

async function readTextOrNull(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`[worktree-adapter-generic] cannot read ${filePath}: ${code ?? String(err)}`);
    }
    return null;
  }
}

function withBlock(content: string): string {
  const start = content.indexOf(START_MARKER);
  const end = content.indexOf(END_MARKER);
  if (start !== -1 && end !== -1 && end > start) {
    return content.slice(0, start) + MANAGED_BLOCK + content.slice(end + END_MARKER.length);
  }
  if (start !== -1) {
    return `${content.slice(0, start)}${MANAGED_BLOCK}\n`;
  }
  const separator = content.length === 0 || content.endsWith("\n") ? "" : "\n";
  return `${content}${separator}${MANAGED_BLOCK}\n`;
}

function withoutBlock(content: string): string | null {
  const start = content.indexOf(START_MARKER);
  const end = content.indexOf(END_MARKER);
  if (start === -1 || end === -1 || end <= start) return null;
  let after = content.slice(end + END_MARKER.length);
  if (after.startsWith("\n")) after = after.slice(1);
  return content.slice(0, start) + after;
}

function result(
  changed: boolean,
  dryRun: boolean,
  filePath: string,
  notes: string[],
): AdapterActionResult {
  return { adapter: ADAPTER_ID, changed, dryRun, files: changed ? [filePath] : [], notes };
}

async function apply(ctx: AdapterContext, dryRun: boolean): Promise<AdapterActionResult> {
  const filePath = join(ctx.repoRoot, "AGENTS.md");
  const current = await readTextOrNull(filePath);
  const next = withBlock(current ?? "");
  const changed = next !== (current ?? "");
  if (changed && !dryRun) {
    if (current !== null) await backupOnce(filePath);
    await writeTextAtomic(filePath, next);
  }
  return result(changed, dryRun, filePath, []);
}

async function remove(ctx: AdapterContext, dryRun: boolean): Promise<AdapterActionResult> {
  const filePath = join(ctx.repoRoot, "AGENTS.md");
  const current = await readTextOrNull(filePath);
  if (current === null) return result(false, dryRun, filePath, []);
  const next = withoutBlock(current);
  if (next === null || next === current) return result(false, dryRun, filePath, []);
  if (!dryRun) {
    await backupOnce(filePath);
    if (next.trim() === "") {
      await rm(filePath, { force: true });
    } else {
      await writeTextAtomic(filePath, next);
    }
  }
  return result(true, dryRun, filePath, []);
}

export const genericAdapter: HostAdapter = {
  id: ADAPTER_ID,
  displayName: "Generic (AGENTS.md)",
  async detect(): Promise<boolean> {
    return true;
  },
  plan: (ctx) => apply(ctx, true),
  install: (ctx) => apply(ctx, false),
  uninstall: (ctx) => remove(ctx, false),
};
