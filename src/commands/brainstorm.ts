import { VaultFS } from "../lib/vault-fs.js";
import { parseFrontmatter, serializeFrontmatter, createFrontmatter, mergeFrontmatter } from "../lib/frontmatter.js";
import { resolveProject } from "../config.js";
import { slugify } from "../lib/auto-number.js";

export async function brainstormCommand(
  vaultFs: VaultFS,
  vaultPath: string,
  options: {
    topic: string;
    content: string;
    project?: string;
  }
): Promise<{ path: string; total_entries: number }> {
  const projectSlug = await resolveProject(vaultPath, options.project);

  const slug = slugify(options.topic);
  const filePath = `projects/${projectSlug}/brainstorms/${slug}.md`;
  const today = new Date().toISOString().slice(0, 10);

  const exists = await vaultFs.exists(filePath);

  if (!exists) {
    const fm = createFrontmatter({
      type: "brainstorm",
      project: projectSlug,
      status: "draft",
    });

    const body = `
# ${options.topic}

## Entries

### ${today}

${options.content}
`.trimStart();

    await vaultFs.write(filePath, serializeFrontmatter(fm, body));
    return { path: filePath, total_entries: 1 };
  }

  // Append new entry
  const existing = await vaultFs.read(filePath);
  const { data, content: body } = parseFrontmatter(existing);

  const newEntry = `\n### ${today}\n\n${options.content}\n`;
  const updatedBody = body.trimEnd() + "\n" + newEntry;
  const updatedFm = mergeFrontmatter(data, {});

  await vaultFs.write(filePath, serializeFrontmatter(updatedFm, updatedBody));

  // Count entries
  const entryCount = (updatedBody.match(/^### /gm) ?? []).length;

  return { path: filePath, total_entries: entryCount };
}
