// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { serializeFrontmatter, createFrontmatter } from "../lib/frontmatter.js";
import { resolveProject } from "../config.js";
import { claimNumberedFile, slugify } from "../lib/auto-number.js";

export async function decideCommand(
  args: {
    title: string;
    context: string;
    decision: string;
    alternatives?: string;
    consequences?: string;
    project?: string;
  },
  ctx: CommandContext,
): Promise<{ path: string; decision_number: number }> {
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);

  const decisionsDir = `projects/${projectSlug}/decisions`;
  const slug = slugify(args.title);

  const fm = createFrontmatter({
    type: "adr",
    project: projectSlug,
    status: "active",
    tags: [],
  });

  const claim = await claimNumberedFile(
    ctx.vaultFs,
    decisionsDir,
    (_number, paddedNumber) => `${paddedNumber}-${slug}.md`,
    (_number, paddedNumber) => {
      const body = `
# ADR-${paddedNumber}: ${args.title}

## Context

${args.context}

## Decision

${args.decision}

## Alternatives Considered

${args.alternatives ?? "None documented."}

## Consequences

${args.consequences ?? "To be evaluated."}
`.trimStart();

      return serializeFrontmatter(fm, body);
    },
  );

  return { path: claim.path, decision_number: claim.number };
}
