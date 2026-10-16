// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { resolveProject } from "../config.js";
import { parseFrontmatter } from "./frontmatter.js";
import { VaultFS, VaultError } from "./vault-fs.js";

export interface ProjectRouting {
  domains: string[];
}

export async function loadProjectRouting(ctx: CommandContext): Promise<ProjectRouting> {
  if (!ctx.projectSlug) return { domains: [] };
  if (ctx.vaultFs.projectSlug !== undefined && ctx.vaultFs.projectSlug !== ctx.projectSlug) throw new Error("Project routing scope does not match the vault scope");
  const slug = await resolveProject(ctx.vaultPath, ctx.projectSlug);
  const vault = new VaultFS(ctx.vaultPath, { projectSlug: slug });
  let raw: string;
  try {
    raw = await vault.read(`projects/${slug}/context.md`);
  } catch (error) {
    if (error instanceof VaultError && error.code === "FILE_NOT_FOUND") return { domains: [] };
    throw new Error("Project routing context could not be read safely");
  }
  raw = raw.replace(/^\uFEFF/, "");
  if (!raw.startsWith("---")) return { domains: [] };
  const header = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(raw.slice(0, 16384))?.[0];
  if (!header) throw new Error("Project routing frontmatter must close within 16384 characters");
  try {
    const { data } = parseFrontmatter(header);
    if (data.routing === undefined) return { domains: [] };
    const routing: unknown = data.routing;
    if (routing === null || typeof routing !== "object" || Array.isArray(routing)) throw new Error();
    const domains: unknown = (routing as Record<string, unknown>).domains;
    if (domains === undefined) return { domains: [] };
    if (!Array.isArray(domains) || domains.length > 16 || !domains.every(domain => typeof domain === "string" && /^[a-z][a-z0-9-]{0,31}$/.test(domain))) throw new Error();
    return { domains: [...new Set(domains)] };
  } catch {
    throw new Error("Invalid project routing metadata; use routing.domains as an array of lowercase domain names");
  }
}

export function bankingApplies(task: string, context: { domains?: readonly string[]; files?: readonly string[] } = {}): boolean {
  const positive = task.replace(/\b(?:not\s+(?:a\s+)?|non[-\s]|no\s+)(?:banking|fintech)\b/gi, "");
  const explicit = /\b(?:security\/banking|banking|fintech|RBI|DORA|FFIEC|OSFI|APRA|PRA|FCA)\b/i.test(positive)
    || /\bbanks?\b/i.test(positive) && /\b(?:security|developer|tooling|payments?|financial|compliance|indian|european|canadian|australian|UK|US)\b/i.test(positive);
  if (explicit) return true;
  if (!context.domains?.includes("banking")) return false;
  if (/\b(?:typo|spelling|grammar)\b/i.test(task)) return false;
  if (context.files?.length && context.files.every(file => /\.(?:md|txt|rst)$/i.test(file)) && !/\b(?:security|audit|compliance|review|risk)\b/i.test(task)) return false;
  return true;
}
