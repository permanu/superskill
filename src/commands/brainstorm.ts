import { VaultFS } from "../lib/vault-fs.js";
import { parseFrontmatter, serializeFrontmatter, createFrontmatter, mergeFrontmatter } from "../lib/frontmatter.js";
import { detectProject } from "../lib/project-detector.js";
import { validateProjectSlug } from "../config.js";

export async function brainstormCommand(
  vaultFs: VaultFS,
  vaultPath: string,
  options: {
    topic: string;
    content: string;
    project?: string;
  }
): Promise<{ path: string; total_entries: number }> {
  let projectSlug = options.project ?? null;

  if (!projectSlug) {
    projectSlug = await detectProject(process.cwd(), vaultPath);
  }

  if (!projectSlug) {
    throw new Error("Could not detect project. Use --project <slug> to specify.");
  }
  validateProjectSlug(projectSlug);

  const slug = options.topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
