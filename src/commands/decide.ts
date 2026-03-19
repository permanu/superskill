import { VaultFS } from "../lib/vault-fs.js";
import { serializeFrontmatter, createFrontmatter } from "../lib/frontmatter.js";
import { resolveProject } from "../config.js";
import { getNextNumber, slugify } from "../lib/auto-number.js";

export async function decideCommand(
  vaultFs: VaultFS,
  vaultPath: string,
  options: {
    title: string;
    context: string;
    decision: string;
    alternatives?: string;
    consequences?: string;
    project?: string;
  }
): Promise<{ path: string; decision_number: number }> {
  const projectSlug = await resolveProject(vaultPath, options.project);

  const decisionsDir = `projects/${projectSlug}/decisions`;
  const nextNumber = await getNextNumber(vaultFs, decisionsDir);
  const paddedNumber = String(nextNumber).padStart(3, "0");
  const slug = slugify(options.title);
  const filename = `${paddedNumber}-${slug}.md`;
  const filePath = `${decisionsDir}/${filename}`;

  const fm = createFrontmatter({
    type: "adr",
    project: projectSlug,
    status: "active",
    tags: [],
  });

  const body = `
# ADR-${paddedNumber}: ${options.title}

## Context

${options.context}

## Decision

${options.decision}

## Alternatives Considered

${options.alternatives ?? "None documented."}

## Consequences

${options.consequences ?? "To be evaluated."}
`.trimStart();

  await vaultFs.write(filePath, serializeFrontmatter(fm, body));

  return { path: filePath, decision_number: nextNumber };
}
