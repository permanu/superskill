// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { serializeFrontmatter, createFrontmatter, mergeFrontmatter } from "../lib/frontmatter.js";
import { resolveProject } from "../config.js";
import { getNextNumber, slugify } from "../lib/auto-number.js";
import {
  hashSpec,
  listSpecFiles,
  loadSpec,
  normalizeAcceptance,
  renderSpec,
  resolveSpecPath,
  specGaps,
  validateSpec,
  type AcceptanceInput,
  type Spec,
  type SpecGap,
  type SpecStatus,
} from "../lib/gates/spec.js";

export type SpecAction = "create" | "status" | "approve" | "freeze" | "list";

export interface SpecCommandArgs {
  action: SpecAction;
  title?: string;
  goal?: string;
  nonGoals?: string[];
  constraints?: string[];
  context?: string;
  allowedFiles?: string[];
  forbiddenFiles?: string[];
  acceptance?: AcceptanceInput[];
  risks?: string[];
  rollback?: string;
  spec?: string;
  project?: string;
}

export interface SpecSummary {
  path: string;
  spec_id: string | null;
  title: string | null;
  status: SpecStatus;
  hash: string;
  frozen: boolean;
}

export async function specCommand(
  args: SpecCommandArgs,
  ctx: CommandContext,
): Promise<{
  path?: string;
  spec_id?: string | null;
  title?: string | null;
  status?: SpecStatus;
  hash?: string;
  stored_hash?: string | null;
  hash_matches?: boolean;
  frozen?: boolean;
  valid?: boolean;
  errors?: string[];
  gaps?: SpecGap[];
  already_frozen?: boolean;
  specs?: SpecSummary[];
}> {
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);
  const specsDir = `projects/${projectSlug}/specs`;

  switch (args.action) {
    case "create": {
      if (!args.title?.trim()) throw new Error("Title required for spec create");

      const spec: Spec = {
        goal: args.goal ?? "",
        non_goals: args.nonGoals ?? [],
        constraints: args.constraints ?? [],
        context: args.context ?? "",
        files: { allowed: args.allowedFiles ?? [], forbidden: args.forbiddenFiles ?? [] },
        acceptance: normalizeAcceptance(args.acceptance ?? []),
        risks: args.risks ?? [],
        rollback: args.rollback ?? "",
      };

      const errors = validateSpec(spec);
      if (errors.length > 0) {
        throw new Error(`Invalid spec: ${errors.join("; ")}`);
      }

      const nextNumber = await getNextNumber(ctx.vaultFs, specsDir);
      const padded = String(nextNumber).padStart(3, "0");
      const filePath = `${specsDir}/${padded}-${slugify(args.title)}.md`;
      const hash = hashSpec(spec);

      const fm = createFrontmatter({
        type: "spec",
        project: projectSlug,
        status: "draft",
        spec_id: padded,
        title: args.title.trim(),
        hash,
      });

      await ctx.vaultFs.write(filePath, serializeFrontmatter(fm, renderSpec(spec, args.title)));

      return {
        path: filePath,
        spec_id: padded,
        title: args.title.trim(),
        status: "draft",
        hash,
        gaps: specGaps(spec),
      };
    }

    case "status": {
      if (!args.spec) throw new Error("Spec reference required for status");
      const path = await resolveSpecPath(ctx.vaultFs, specsDir, args.spec);
      const loaded = await loadSpec(ctx.vaultFs, path);
      const errors = validateSpec(loaded.spec);
      return {
        path,
        spec_id: loaded.specId,
        title: loaded.title,
        status: loaded.status,
        frozen: loaded.status === "frozen",
        valid: errors.length === 0,
        errors,
        gaps: specGaps(loaded.spec),
        hash: loaded.hash,
        stored_hash: loaded.storedHash,
        hash_matches: loaded.hashMatches,
      };
    }

    case "approve": {
      if (!args.spec) throw new Error("Spec reference required for approve");
      const path = await resolveSpecPath(ctx.vaultFs, specsDir, args.spec);
      const loaded = await loadSpec(ctx.vaultFs, path);

      if (loaded.status === "frozen") {
        throw new Error(`Spec is frozen and immutable: ${path}`);
      }

      const errors = validateSpec(loaded.spec);
      const gaps = specGaps(loaded.spec);
      if (errors.length > 0 || gaps.length > 0) {
        const lines = [
          ...errors.map((error) => `- invalid: ${error}`),
          ...gaps.map((gap) => `- gap: ${gap.field} (${gap.reason})`),
        ];
        throw new Error(`Spec has unresolved gaps:\n${lines.join("\n")}`);
      }

      const hash = hashSpec(loaded.spec);
      const fm = mergeFrontmatter(loaded.frontmatter, { status: "approved", hash });
      await ctx.vaultFs.write(path, serializeFrontmatter(fm, loaded.body));

      return { path, status: "approved", hash };
    }

    case "freeze": {
      if (!args.spec) throw new Error("Spec reference required for freeze");
      const path = await resolveSpecPath(ctx.vaultFs, specsDir, args.spec);
      const loaded = await loadSpec(ctx.vaultFs, path);

      if (loaded.status === "frozen") {
        if (!loaded.hashMatches) {
          throw new Error(`Frozen spec content was modified: ${path}`);
        }
        return { path, status: "frozen", hash: loaded.hash, already_frozen: true };
      }

      if (loaded.status !== "approved") {
        throw new Error(`Spec must be approved before freezing (current status: ${loaded.status}): ${path}`);
      }
      if (loaded.storedHash !== null && loaded.storedHash !== loaded.hash) {
        throw new Error(`Spec content changed after approval; run approve again: ${path}`);
      }

      const fm = mergeFrontmatter(loaded.frontmatter, {
        status: "frozen",
        hash: loaded.hash,
        frozen_at: new Date().toISOString(),
      });
      await ctx.vaultFs.write(path, serializeFrontmatter(fm, loaded.body));

      return { path, status: "frozen", hash: loaded.hash, already_frozen: false };
    }

    case "list": {
      const files = await listSpecFiles(ctx.vaultFs, specsDir);
      const specs: SpecSummary[] = [];
      for (const file of files) {
        try {
          const loaded = await loadSpec(ctx.vaultFs, file);
          specs.push({
            path: file,
            spec_id: loaded.specId,
            title: loaded.title,
            status: loaded.status,
            hash: loaded.hash,
            frozen: loaded.status === "frozen",
          });
        } catch (e: unknown) {
          console.error("[spec] Skipping unreadable spec file:", e instanceof Error ? e.message : e);
        }
      }
      return { specs };
    }

    default:
      throw new Error(`Unknown action: ${args.action}`);
  }
}
