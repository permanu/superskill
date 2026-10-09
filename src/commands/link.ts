// SPDX-License-Identifier: Apache-2.0
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

  let result!: LinkResult;
  await vaultFs.update(source, (raw) => {
    const { data, content: body } = parseFrontmatter(raw);
    const existingLinks = new Set(Array.from(body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g), (match) => match[1]));
    const targetName = target.replace(/\.md$/, "");
    const added = !existingLinks.has(targetName);
    existingLinks.add(targetName);
    result = { source, target, added, existing_links: [...existingLinks] };
    if (!added) return raw;
    return serializeFrontmatter(mergeFrontmatter(data, {}), body.trimEnd() + `\n- [[${targetName}]]\n`);
  });
  return result;
}
