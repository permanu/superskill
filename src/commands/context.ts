// SPDX-License-Identifier: Apache-2.0
import type { CommandContext, Logger } from "../core/types.js";
import { VaultFS, VaultError } from "../lib/vault-fs.js";
import { resolveProject } from "../config.js";
import { estimateTokens, truncateToTokenBudget } from "../lib/token-estimator.js";
import { parseFrontmatter } from "../lib/frontmatter.js";

export interface ContextResult {
  project_slug: string;
  context_md: string;
  token_estimate: number;
  sections: string[];
  truncated: boolean;
  learning_count: number;
  last_session: { outcome: string; completed_at: string } | null;
  open_threads: { count: number; items: string[] };
  stale_context: boolean;
}

function missingPath(error: unknown): boolean {
  return error instanceof VaultError && error.code === "FILE_NOT_FOUND"
    || error instanceof Error && "code" in error && error.code === "ENOENT";
}

export async function contextCommand(
  args: {
    project?: string;
    detailLevel?: "summary" | "full";
    maxTokens?: number;
  } = {} as any,
  ctx: CommandContext,
): Promise<ContextResult> {
  const { detailLevel = "summary", maxTokens } = args;
  if (detailLevel !== "summary" && detailLevel !== "full") throw new VaultError("INVALID_ARGUMENT", "detailLevel must be summary or full");
  if (maxTokens !== undefined && (!Number.isSafeInteger(maxTokens) || maxTokens < 1 || maxTokens > 50_000)) {
    throw new VaultError("INVALID_ARGUMENT", "maxTokens must be a positive integer no greater than 50000");
  }
  const effectiveMaxTokens = maxTokens ?? ctx.config.maxInjectTokens;
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);
  const vaultFs = ctx.vaultFs;
  const contextPath = `projects/${projectSlug}/context.md`;
  const exists = await vaultFs.exists(contextPath);

  const learningCount = await countLearnings(vaultFs, projectSlug);
  const lastSession = await getLastSession(vaultFs, projectSlug);
  const openThreads = await getOpenThreads(vaultFs, projectSlug);

  if (!exists) {
    return {
      project_slug: projectSlug,
      context_md: `No context file found for project "${projectSlug}". Create one at: ${contextPath}`,
      token_estimate: 20,
      sections: [],
      truncated: false,
      learning_count: learningCount,
      last_session: lastSession,
      open_threads: openThreads,
      stale_context: false,
    };
  }

  const content = await vaultFs.read(contextPath);
  const { data: contextFrontmatter } = parseFrontmatter(content);

  const sections = content
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.replace("## ", "").trim());

  // Enhancement B: freshness warning
  const staleContext = isStaleContext(contextFrontmatter.updated as string | undefined);
  const staleWarning = staleContext
    ? `> ⚠ Context stale (last updated: ${contextFrontmatter.updated}). Run \`/context update\` to refresh.\n\n`
    : "";

  const injectPrefix = await collectInjectAlways(vaultFs, projectSlug, ctx.log);
  const combinedContent = (injectPrefix ? `${injectPrefix}\n\n---\n\n` : "") + staleWarning + content;
  const { text, truncated } = detailLevel === "full" && maxTokens === undefined
    ? { text: combinedContent, truncated: false }
    : truncateToTokenBudget(combinedContent, effectiveMaxTokens);

  return {
    project_slug: projectSlug,
    context_md: text,
    token_estimate: estimateTokens(text),
    sections,
    truncated,
    learning_count: learningCount,
    last_session: lastSession,
    open_threads: openThreads,
    stale_context: staleContext,
  };
}

async function collectInjectAlways(
  vaultFs: import("../lib/vault-fs.js").VaultFS,
  projectSlug: string,
  log: Logger,
): Promise<string> {
  try {
    const allFiles = await vaultFs.list(`projects/${projectSlug}/shared`, 10);
    const mdFiles = allFiles.filter((f) => f.endsWith(".md"));
    const bodies: string[] = [];
    for (const filePath of mdFiles) {
      try {
        const raw = await vaultFs.read(filePath);
        const { data, content: body } = parseFrontmatter(raw);
        if (data.inject === "always") {
          bodies.push(body.trim());
        }
      } catch (e) {
        log.error(`[context] Failed to read shared file ${filePath}:`, e instanceof Error ? e.message : e);
      }
    }
    return bodies.join("\n\n---\n\n");
  } catch (e: unknown) {
    // shared/ may not exist — that's fine
    if (e instanceof VaultError && e.code === "FILE_NOT_FOUND") return "";
    if (e instanceof Error && "code" in e && (e as any).code === "ENOENT") return "";
    log.error("[context] collectInjectAlways error:", e instanceof Error ? e.message : e);
    return "";
  }
}

function isStaleContext(updated: string | undefined): boolean {
  if (!updated) return false;
  const date = new Date(updated);
  if (isNaN(date.getTime())) return false;
  const diffMs = Date.now() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 30;
}

async function countLearnings(vaultFs: import("../lib/vault-fs.js").VaultFS, projectSlug: string): Promise<number> {
  try {
    const files = await vaultFs.list(`projects/${projectSlug}/learnings`, 1);
    return files.filter((f) => f.endsWith(".md")).length;
  } catch (e: unknown) {
    if (missingPath(e)) return 0;
    console.error("[context] Error counting learnings:", e instanceof Error ? e.message : e);
    return 0;
  }
}

async function getLastSession(
  vaultFs: import("../lib/vault-fs.js").VaultFS,
  projectSlug: string
): Promise<{ outcome: string; completed_at: string } | null> {
  try {
    const files = await vaultFs.list(`projects/${projectSlug}/sessions`, 1);
    const mdFiles = files.filter((f) => f.endsWith(".md")).sort().reverse();

    if (mdFiles.length === 0) return null;

    const content = await vaultFs.read(mdFiles[0]);
    const { data } = parseFrontmatter(content);

    return {
      outcome: (data.outcome as string) ?? "",
      completed_at: (data.completed_at as string) ?? (data.created as string) ?? "",
    };
  } catch (e: unknown) {
    if (!missingPath(e)) {
      console.error("[context] Error reading last session:", e instanceof Error ? e.message : e);
    }
    return null;
  }
}

/**
 * Open threads are derived from what sessions already record at close
 * (blocked / partially_completed) — no separate backlog file to maintain.
 * Newest sessions first; exact-duplicate texts are collapsed.
 */
async function getOpenThreads(
  vaultFs: import("../lib/vault-fs.js").VaultFS,
  projectSlug: string,
  limit = 3,
  window = 5,
): Promise<{ count: number; items: string[] }> {
  try {
    const files = (await vaultFs.list(`projects/${projectSlug}/sessions`, 1))
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse()
      .slice(0, window);

    const seen = new Set<string>();
    const items: string[] = [];
    for (const file of files) {
      let content: string;
      try {
        content = await vaultFs.read(file);
      } catch (e: unknown) {
        if (!missingPath(e)) {
          console.error("[context] Error reading session for open threads:", e instanceof Error ? e.message : e);
        }
        continue;
      }
      const { data } = parseFrontmatter(content);
      const entries: Array<[string, unknown]> = [
        ...(Array.isArray(data.blocked) ? data.blocked.map((value) => ["blocked", value] as [string, unknown]) : []),
        ...(Array.isArray(data.partially_completed) ? data.partially_completed.map((value) => ["partial", value] as [string, unknown]) : []),
      ];
      for (const [kind, value] of entries) {
        if (typeof value !== "string") continue;
        const text = value.trim();
        if (text === "") continue;
        const key = `${kind}:${text}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        items.push(`${kind}: ${text.length > 160 ? `${text.slice(0, 157)}...` : text}`);
      }
    }
    return { count: items.length, items: items.slice(0, limit) };
  } catch (e: unknown) {
    if (!missingPath(e)) {
      console.error("[context] Error deriving open threads:", e instanceof Error ? e.message : e);
    }
    return { count: 0, items: [] };
  }
}
