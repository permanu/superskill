// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CommandContext } from "../core/types.js";
import { parseFrontmatter, serializeFrontmatter, mergeFrontmatter } from "../lib/frontmatter.js";

export interface LinkResult {
  source: string;
  target: string;
  added: boolean;
  existing_links: string[];
}

export async function linkCommand(
  args: {
    source: string;
    target: string;
    project?: string;
  },
  ctx: CommandContext,
): Promise<LinkResult> {
  const { source, target } = args;
  const vaultFs = ctx.vaultFs;

  const sourceExists = await vaultFs.exists(source);
  if (!sourceExists) {
    throw new Error(`Source note not found: ${source}`);
  }

  const raw = await vaultFs.read(source);
  const { data, content: body } = parseFrontmatter(raw);

  const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const existingLinks = new Set<string>();
  let match;
  while ((match = wikilinkRegex.exec(body)) !== null) {
    existingLinks.add(match[1]);
  }

  const targetName = target.replace(/\.md$/, "");

  if (existingLinks.has(targetName)) {
    return { source, target, added: false, existing_links: [...existingLinks] };
  }

  const linkLine = `\n- [[${targetName}]]`;
  const updatedBody = body.trimEnd() + linkLine + "\n";
  const updatedFm = mergeFrontmatter(data, {});

  await vaultFs.write(source, serializeFrontmatter(updatedFm, updatedBody));

  return { source, target, added: true, existing_links: [...existingLinks, targetName] };
}
