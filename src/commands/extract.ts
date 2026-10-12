// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { resolveProject } from "../config.js";
import { claimNumberedFile, slugify } from "../lib/auto-number.js";
import { createFrontmatter, serializeFrontmatter } from "../lib/frontmatter.js";
import { upsertVaultFile } from "../lib/knowledge-index.js";

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

  for (const item of items) {
    if (!Object.hasOwn(typeDirMap, item.type)) {
      throw new Error(`Unknown extract type "${item.type}". Allowed types: ${Object.keys(typeDirMap).join(", ")}`);
    }
  }

  for (const item of items) {
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
    const claim = await claimNumberedFile(vaultFs, dirPath, (_number, padded) => `${padded}-${slug}.md`, () => serializeFrontmatter(fm, body));
    await syncIndex(ctx, claim.path);

    extracted.push({ path: claim.path, type: item.type, title: item.title });
  }

  return { source, extracted };
}

async function syncIndex(ctx: CommandContext, path: string): Promise<void> {
  try {
    const stored = ctx.vaultFs.jailPath(path);
    const raw = await ctx.vaultFs.read(path);
    upsertVaultFile(ctx.vaultPath, stored, raw);
  } catch (e: unknown) {
    console.error("[knowledge-index] sync skipped:", e instanceof Error ? e.message : e);
  }
}
