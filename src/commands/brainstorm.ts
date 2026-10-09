// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { parseFrontmatter, serializeFrontmatter, createFrontmatter, mergeFrontmatter } from "../lib/frontmatter.js";
import { resolveProject } from "../config.js";
import { slugify } from "../lib/auto-number.js";

export async function brainstormCommand(
  args: {
    topic: string;
    content: string;
    project?: string;
  },
  ctx: CommandContext,
): Promise<{ path: string; total_entries: number }> {
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);

  const slug = slugify(args.topic);
  const filePath = `projects/${projectSlug}/brainstorms/${slug}.md`;
  const today = new Date().toISOString().slice(0, 10);

  const result = await ctx.vaultFs.update(filePath, (existing) => {
    if (!existing) {
      const fm = createFrontmatter({ type: "brainstorm", project: projectSlug, status: "draft" });
      return serializeFrontmatter(fm, `# ${args.topic}\n\n## Entries\n\n### ${today}\n\n${args.content}\n`);
    }
    const { data, content: body } = parseFrontmatter(existing);
    const updatedBody = body.trimEnd() + `\n\n### ${today}\n\n${args.content}\n`;
    return serializeFrontmatter(mergeFrontmatter(data, {}), updatedBody);
  }, { create: true });
  const { content: body } = parseFrontmatter(result.content);
  return { path: filePath, total_entries: (body.match(/^### /gm) ?? []).length };
}
