// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { resolveProject } from "../config.js";
import { claimNumberedFile, slugify } from "../lib/auto-number.js";
import { createFrontmatter, serializeFrontmatter } from "../lib/frontmatter.js";
import { upsertVaultFile } from "../lib/knowledge-index.js";
import { assertSafeVaultContent, VaultError } from "../lib/vault-fs.js";

export interface CaptureItem {
  type: string;
  title: string;
  content: string;
  tags?: string[];
  confidence?: "high" | "medium" | "low";
}

export interface CaptureResult {
  captured: Array<{ path: string; type: string; title: string }>;
}

export async function captureCommand(
  args: {
    items: CaptureItem[];
    project?: string;
  },
  ctx: CommandContext,
): Promise<CaptureResult> {
  const typeDirMap: Record<string, string> = {
    adr: "decisions",
    decision: "decisions",
    learning: "learnings",
    task: "tasks",
    brainstorm: "brainstorms",
    incident: "incidents",
    pattern: "patterns",
    evaluation: "evaluations",
    research: "research",
    prd: "decisions",
    spec: "decisions",
    rfc: "decisions",
    vision: "decisions",
    strategy: "decisions",
    roadmap: "decisions",
    "competitive-analysis": "decisions",
  };

  validateBatchItems(args.items, typeDirMap, "capture");
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);
  const vaultFs = ctx.vaultFs;
  const captured: Array<{ path: string; type: string; title: string }> = [];

  const prepared = args.items.map((item) => {
    const dirName = typeDirMap[item.type];
    const dirPath = `projects/${projectSlug}/${dirName}`;
    const slug = slugify(item.title);

    const fmOverrides: Record<string, unknown> = {
      type: item.type,
      project: projectSlug,
      status: "active",
    };

    if (item.tags?.length) {
      fmOverrides.tags = item.tags;
    }

    if (item.confidence && (item.type === "learning" || item.type === "research")) {
      fmOverrides.confidence = item.confidence;
    }

    const fm = createFrontmatter(fmOverrides);
    const body = `# ${item.title}\n\n${item.content}`;
    const content = serializeFrontmatter(fm, body);
    assertSafeVaultContent(content);
    return { item, dirPath, slug, content };
  });

  for (const [index, { item, dirPath, slug, content }] of prepared.entries()) {
    try {
      const claim = await claimNumberedFile(vaultFs, dirPath, (_number, padded) => `${padded}-${slug}.md`, () => content);
      captured.push({ path: claim.path, type: item.type, title: item.title });
      await syncCapturedFile(ctx, claim.path);
    } catch (cause: unknown) {
      const message = `Capture item ${index + 1} failed after ${captured.length} captured (${captured.map((entry) => entry.path).join(", ")}): ${cause instanceof Error ? cause.message : String(cause)}`;
      const error = cause instanceof VaultError ? new VaultError(cause.code, message) : new Error(message, { cause });
      throw Object.assign(error, { captured, failed_index: index });
    }
  }

  return { captured };
}

export function validateBatchItems(items: unknown, typeDirMap: Record<string, string>, action: "capture" | "extract"): asserts items is CaptureItem[] {
  if (!Array.isArray(items)) throw new Error(`${action} items must be an array`);
  for (const [index, value] of items.entries()) {
    const label = `${action} item ${index + 1}`;
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid ${label}: expected an object`);
    const item = value as Record<string, unknown>;
    if (typeof item.type !== "string") throw new Error(`Invalid ${label}: type must be a string`);
    if (!Object.hasOwn(typeDirMap, item.type)) {
      throw new Error(`Unknown ${action} type "${item.type}". Allowed types: ${Object.keys(typeDirMap).join(", ")}`);
    }
    if (typeof item.title !== "string" || !item.title.trim()) throw new Error(`Invalid ${label}: title must be a non-empty string`);
    if (typeof item.content !== "string") throw new Error(`Invalid ${label}: content must be a string`);
    if (item.tags !== undefined && (!Array.isArray(item.tags) || !item.tags.every((tag) => typeof tag === "string"))) throw new Error(`Invalid ${label}: tags must be an array of strings`);
    if (item.confidence !== undefined && !["high", "medium", "low"].includes(item.confidence as string)) throw new Error(`Invalid ${label}: confidence must be high, medium, or low`);
  }
}

export async function syncCapturedFile(ctx: CommandContext, path: string): Promise<void> {
  try {
    const stored = ctx.vaultFs.jailPath(path);
    const raw = await ctx.vaultFs.read(path);
    upsertVaultFile(ctx.vaultPath, stored, raw);
  } catch (e: unknown) {
    console.error("[knowledge-index] sync skipped:", e instanceof Error ? e.message : e);
  }
}
