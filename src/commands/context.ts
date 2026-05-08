// SPDX-License-Identifier: AGPL-3.0-or-later
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
  stale_context: boolean;
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
  const effectiveMaxTokens = maxTokens ?? ctx.config.maxInjectTokens;
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);
  const vaultFs = ctx.vaultFs;
  const contextPath = `projects/${projectSlug}/context.md`;
  const exists = await vaultFs.exists(contextPath);

  const learningCount = await countLearnings(vaultFs, projectSlug);
  const lastSession = await getLastSession(vaultFs, projectSlug);

  if (!exists) {
    return {
      project_slug: projectSlug,
      context_md: `No context file found for project "${projectSlug}". Create one at: ${contextPath}`,
      token_estimate: 20,
      sections: [],
      truncated: false,
      learning_count: learningCount,
      last_session: lastSession,
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

  if (detailLevel === "full") {
    // Enhancement C: inject:always in full mode too
    const injectPrefix = await collectInjectAlways(vaultFs, ctx.log);
    const fullContent = injectPrefix ? `${injectPrefix}\n\n---\n\n${content}` : content;
    return {
      project_slug: projectSlug,
      context_md: staleWarning + fullContent,
      token_estimate: estimateTokens(staleWarning + fullContent),
      sections,
      truncated: false,
      learning_count: learningCount,
      last_session: lastSession,
      stale_context: staleContext,
    };
  }

  // Enhancement A: inject:always support — prepend before truncation
  const injectPrefix = await collectInjectAlways(vaultFs, ctx.log);
  const combinedContent = injectPrefix ? `${injectPrefix}\n\n---\n\n${content}` : content;

  const { text, truncated } = truncateToTokenBudget(combinedContent, effectiveMaxTokens);

  return {
    project_slug: projectSlug,
    context_md: staleWarning + text,
    token_estimate: estimateTokens(staleWarning + text),
    sections,
    truncated,
    learning_count: learningCount,
    last_session: lastSession,
    stale_context: staleContext,
  };
}

async function collectInjectAlways(
  vaultFs: import("../lib/vault-fs.js").VaultFS,
  log: Logger,
): Promise<string> {
  try {
    const allFiles = await vaultFs.list("shared", 10);
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
    log.debug("[context] collectInjectAlways error:", e instanceof Error ? e.message : e);
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
    if (e instanceof VaultError && e.code === "FILE_NOT_FOUND") return 0;
    if (e instanceof Error && "code" in e && (e as any).code === "ENOENT") return 0;
    if (e instanceof Error && "code" in e && (e as any).code !== undefined) {
      console.error("[context] Error counting learnings:", e.message);
    }
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
    if (!(e instanceof Error && "code" in e && (e as any).code === "ENOENT")) {
      console.error("[context] Error reading last session:", e instanceof Error ? e.message : e);
    }
    return null;
  }
}
