// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CommandContext } from "../core/types.js";
import { resolveProject } from "../config.js";
import { getNextNumber, slugify } from "../lib/auto-number.js";
import { createFrontmatter, serializeFrontmatter } from "../lib/frontmatter.js";

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
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);
  const vaultFs = ctx.vaultFs;

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

  const captured: Array<{ path: string; type: string; title: string }> = [];

  for (const item of args.items) {
    const dirName = typeDirMap[item.type] ?? item.type;
    const dirPath = `projects/${projectSlug}/${dirName}`;
    const nextNum = await getNextNumber(vaultFs, dirPath);
    const slug = slugify(item.title);
    const filePath = `${dirPath}/${String(nextNum).padStart(3, "0")}-${slug}.md`;

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
    await vaultFs.write(filePath, serializeFrontmatter(fm, body));

    captured.push({ path: filePath, type: item.type, title: item.title });
  }

  return { captured };
}
