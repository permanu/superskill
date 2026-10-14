// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { resolveProject } from "../config.js";
import { claimNumberedFile, slugify } from "../lib/auto-number.js";
import { createFrontmatter, serializeFrontmatter } from "../lib/frontmatter.js";
import { assertSafeVaultContent, VaultError } from "../lib/vault-fs.js";
import { syncCapturedFile, validateBatchItems } from "./capture.js";

export interface ExtractItem {
  type: string;
  title: string;
  content: string;
}

export interface ExtractResult {
  source: string;
  extracted: Array<{ path: string; type: string; title: string }>;
}

export async function extractCommand(
  args: {
    source: string;
    items: Array<{ type: string; title: string; content: string }>;
    project?: string;
  },
  ctx: CommandContext,
): Promise<ExtractResult> {
  const { source, items } = args;
  const vaultFs = ctx.vaultFs;
  if (typeof source !== "string" || !source.trim()) throw new Error("Source must be a non-empty string");

  const sourceExists = await vaultFs.exists(source);
  if (!sourceExists) {
    throw new Error(`Source note not found: ${source}`);
  }

  const projectSlug = await resolveProject(ctx.vaultPath, args.project);

  const typeDirMap: Record<string, string> = {
    adr: "decisions",
    decision: "decisions",
    learning: "learnings",
    task: "tasks",
    brainstorm: "brainstorms",
    incident: "incidents",
    pattern: "patterns",
    evaluation: "evaluations",
  };

  const extracted: Array<{ path: string; type: string; title: string }> = [];

  validateBatchItems(items, typeDirMap, "extract");

  const prepared = items.map((item) => {
    const dirName = typeDirMap[item.type];
    const dirPath = `projects/${projectSlug}/${dirName}`;
    const slug = slugify(item.title);

    const fm = createFrontmatter({
      type: item.type,
      project: projectSlug,
      status: "active",
      related: [source],
    });

    const body = `# ${item.title}\n\n${item.content}`;
    const content = serializeFrontmatter(fm, body);
    assertSafeVaultContent(content);
    return { item, dirPath, slug, content };
  });

  for (const [index, { item, dirPath, slug, content }] of prepared.entries()) {
    try {
      const claim = await claimNumberedFile(vaultFs, dirPath, (_number, padded) => `${padded}-${slug}.md`, () => content);
      extracted.push({ path: claim.path, type: item.type, title: item.title });
      await syncCapturedFile(ctx, claim.path);
    } catch (cause: unknown) {
      const message = `Extract item ${index + 1} failed after ${extracted.length} extracted (${extracted.map((entry) => entry.path).join(", ")}): ${cause instanceof Error ? cause.message : String(cause)}`;
      const error = cause instanceof VaultError ? new VaultError(cause.code, message) : new Error(message, { cause });
      throw Object.assign(error, { extracted, failed_index: index });
    }
  }

  return { source, extracted };
}
