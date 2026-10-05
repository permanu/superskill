// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { parseFrontmatter, serializeFrontmatter, createFrontmatter } from "../lib/frontmatter.js";
import { resolveProject } from "../config.js";
import { claimNumberedFile, slugify } from "../lib/auto-number.js";

export type Confidence = "high" | "medium" | "low";

export interface LearningItem {
  id: string;
  title: string;
  confidence: Confidence;
  tags: string[];
  created: string;
  path: string;
}

const VALID_CONFIDENCE: Confidence[] = ["high", "medium", "low"];

export async function learnCommand(
  args: {
    action: "add" | "list";
    title?: string;
    discovery?: string;
    project?: string;
    tags?: string[];
    confidence?: Confidence;
    source?: string;
    sessionId?: string;
    tag?: string;
  },
  ctx: CommandContext,
): Promise<{
  learning_id?: string;
  path?: string;
  learnings?: LearningItem[];
}> {
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);
  const vaultFs = ctx.vaultFs;
  const learningsDir = `projects/${projectSlug}/learnings`;

  switch (args.action) {
    case "add": {
      if (!args.title) throw new Error("Title required for add");
      if (!args.discovery) throw new Error("Discovery required for add");

      const confidence = args.confidence ?? "medium";
      if (!VALID_CONFIDENCE.includes(confidence)) {
        throw new Error(`Invalid confidence "${confidence}". Must be one of: ${VALID_CONFIDENCE.join(", ")}`);
      }

      const titleSlug = slugify(args.title);

      const fm = createFrontmatter({
        type: "learning",
        project: projectSlug,
        status: "active",
        confidence,
        source: args.source ?? "",
        session_id: args.sessionId ?? "",
        tags: args.tags ?? [],
      });

      const body = `\n# ${args.title}\n\n${args.discovery}\n`;
      const claim = await claimNumberedFile(
        vaultFs,
        learningsDir,
        (_number, padded) => `${padded}-${titleSlug}.md`,
        () => serializeFrontmatter(fm, body),
      );

      if (args.sessionId) {
        await noteLearningCaptured(vaultFs, projectSlug, args.sessionId);
      }

      return { learning_id: String(claim.number).padStart(3, "0"), path: claim.path };
    }

    case "list": {
      const learnings = await listLearnings(vaultFs, learningsDir);
      let filtered = learnings;

      if (args.tag) {
        filtered = filtered.filter((l) => l.tags.includes(args.tag!));
      }

      return { learnings: filtered };
    }

    default:
      throw new Error(`Unknown action: ${args.action}`);
  }
}

async function noteLearningCaptured(
  vaultFs: import("../lib/vault-fs.js").VaultFS,
  projectSlug: string,
  sessionId: string,
): Promise<void> {
  const dir = `projects/${projectSlug}/sessions`;
  let files: string[];
  try {
    files = await vaultFs.list(dir, 1);
  } catch {
    return;
  }
  for (const file of files.filter((name) => name.endsWith(".md"))) {
    const path = `${dir}/${file}`;
    let content: string;
    try {
      content = await vaultFs.read(path);
    } catch {
      continue;
    }
    const { data, content: body } = parseFrontmatter(content);
    if (data.type !== "session" || data.session_id !== sessionId) continue;
    const count = Number(data.learnings_captured ?? 0) + 1;
    try {
      await vaultFs.write(path, serializeFrontmatter({ ...data, learnings_captured: count }, body));
    } catch (err: unknown) {
      console.error(`[learn] could not update learnings_captured: ${err instanceof Error ? err.message : String(err)}`);
    }
    return;
  }
}

async function listLearnings(vaultFs: import("../lib/vault-fs.js").VaultFS, learningsDir: string): Promise<LearningItem[]> {  let files: string[];
  try {
    files = await vaultFs.list(learningsDir, 1);
  } catch {
    return [];
  }

  const mdFiles = files.filter((f) => f.endsWith(".md"));

  const learnings: LearningItem[] = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < mdFiles.length; i += BATCH_SIZE) {
    const batch = mdFiles.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (file) => {
        const content = await vaultFs.read(file);
        const { data, content: body } = parseFrontmatter(content);

        if (data.type !== "learning") return null;

        const basename = file.split("/").pop() ?? file;
        const idMatch = basename.match(/^(\d+)-/);
        if (!idMatch) return null;

        const titleMatch = body.match(/^# (.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : file;

        return {
          id: idMatch[1],
          title,
          confidence: (data.confidence as Confidence) ?? "medium",
          tags: Array.isArray(data.tags) ? data.tags as string[] : [],
          created: (data.created as string) ?? "",
          path: file,
        } satisfies LearningItem;
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value !== null) {
        learnings.push(result.value);
      } else if (result.status === "rejected") {
        const e = result.reason;
        if (e instanceof Error && "code" in e && (e as any).code !== "ENOENT") {
          console.error("[learn] Skipping unreadable learning file:", e instanceof Error ? e.message : e);
        }
      }
    }
  }

  learnings.sort((a, b) => a.id.localeCompare(b.id));
  return learnings;
}
