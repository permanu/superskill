// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CommandContext } from "../core/types.js";
import { resolveProject } from "../config.js";
import { slugify } from "../lib/auto-number.js";
import { createFrontmatter, serializeFrontmatter, parseFrontmatter, mergeFrontmatter } from "../lib/frontmatter.js";
import { getNextNumber } from "../lib/auto-number.js";

// ── Repo State ──────────────────────────────────────────

export interface RepoStateResult {
  path: string;
  branch: string | null;
  dirty_files: string[];
  last_commit: string | null;
  snapshot_at: string;
}

export async function snapshotRepoState(
  args: { project?: string; branch?: string; dirty_files?: string[]; last_commit?: string },
  ctx: CommandContext,
): Promise<RepoStateResult> {
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);
  const now = new Date().toISOString();
  const filePath = `projects/${projectSlug}/_state/repo-state.md`;

  const fm = createFrontmatter({
    type: "repo-state",
    project: projectSlug,
    status: "active",
    branch: args.branch ?? null,
    dirty_files: args.dirty_files ?? [],
    last_commit: args.last_commit ?? null,
    snapshot_at: now,
  });

  const body = `# Repository State\n\n**Snapshot**: ${now}\n**Branch**: ${args.branch ?? "unknown"}\n**Last Commit**: ${args.last_commit ?? "unknown"}\n`;

  const existing = await ctx.vaultFs.exists(filePath);
  if (existing) {
    await ctx.vaultFs.write(filePath, serializeFrontmatter(fm, body));
  } else {
    await ctx.vaultFs.write(filePath, serializeFrontmatter(fm, body));
  }

  return {
    path: filePath,
    branch: args.branch ?? null,
    dirty_files: args.dirty_files ?? [],
    last_commit: args.last_commit ?? null,
    snapshot_at: now,
  };
}

// ── Environment Facts ───────────────────────────────────

export interface EnvFact {
  key: string;
  value: string;
  context?: string;
}

export interface EnvFactsResult {
  path: string;
  facts: EnvFact[];
}

export async function envFactsCommand(
  args: {
    action: "add" | "list";
    key?: string;
    value?: string;
    context?: string;
    project?: string;
  },
  ctx: CommandContext,
): Promise<EnvFactsResult | { facts: EnvFact[] }> {
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);
  const filePath = `projects/${projectSlug}/_state/env-facts.md`;

  if (args.action === "list") {
    try {
      const content = await ctx.vaultFs.read(filePath);
      const { data } = parseFrontmatter(content);
      const facts: EnvFact[] = Array.isArray(data.facts)
        ? (data.facts as Array<Record<string, unknown>>).map((f) => ({
            key: String(f.key ?? ""),
            value: String(f.value ?? ""),
            context: typeof f.context === "string" ? f.context : undefined,
          }))
        : [];
      return { facts };
    } catch {
      return { facts: [] };
    }
  }

  if (!args.key || !args.value) {
    throw new Error("key and value required for env-facts add");
  }

  const fact: EnvFact = { key: args.key, value: args.value, context: args.context };

  let facts: EnvFact[] = [];
  let existingFm: Record<string, unknown> = {};

  const exists = await ctx.vaultFs.exists(filePath);
  if (exists) {
    const content = await ctx.vaultFs.read(filePath);
    const { data } = parseFrontmatter(content);
    existingFm = data;
    if (Array.isArray(data.facts)) {
      facts = (data.facts as Array<Record<string, unknown>>).map((f) => ({
        key: String(f.key ?? ""),
        value: String(f.value ?? ""),
        context: typeof f.context === "string" ? f.context : undefined,
      }));
    }
  }

  const existingIdx = facts.findIndex((f) => f.key === fact.key);
  if (existingIdx >= 0) {
    facts[existingIdx] = fact;
  } else {
    facts.push(fact);
  }

  const fm = createFrontmatter({
    type: "env-facts",
    project: projectSlug,
    status: "active",
    facts: facts.map((f) => ({ key: f.key, value: f.value, ...(f.context ? { context: f.context } : {}) })),
  });

  const body = `# Environment Facts\n\n${facts.map((f) => `- **${f.key}**: ${f.value}${f.context ? ` (${f.context})` : ""}`).join("\n")}\n`;

  await ctx.vaultFs.write(filePath, serializeFrontmatter(fm, body));
  return { path: filePath, facts };
}

// ── Credential References ───────────────────────────────

export interface CredRef {
  name: string;
  location: string;
  notes?: string;
}

export interface CredRefsResult {
  path: string;
  references: CredRef[];
}

export async function credRefsCommand(
  args: {
    action: "add" | "list";
    name?: string;
    location?: string;
    notes?: string;
    project?: string;
  },
  ctx: CommandContext,
): Promise<CredRefsResult | { references: CredRef[] }> {
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);
  const filePath = `projects/${projectSlug}/_state/credential-references.md`;

  if (args.action === "list") {
    try {
      const content = await ctx.vaultFs.read(filePath);
      const { data } = parseFrontmatter(content);
      const refs: CredRef[] = Array.isArray(data.references)
        ? (data.references as Array<Record<string, unknown>>).map((r) => ({
            name: String(r.name ?? ""),
            location: String(r.location ?? ""),
            notes: typeof r.notes === "string" ? r.notes : undefined,
          }))
        : [];
      return { references: refs };
    } catch {
      return { references: [] };
    }
  }

  if (!args.name || !args.location) {
    throw new Error("name and location required for credential-references add");
  }

  const ref: CredRef = { name: args.name, location: args.location, notes: args.notes };

  let refs: CredRef[] = [];

  const exists = await ctx.vaultFs.exists(filePath);
  if (exists) {
    const content = await ctx.vaultFs.read(filePath);
    const { data } = parseFrontmatter(content);
    if (Array.isArray(data.references)) {
      refs = (data.references as Array<Record<string, unknown>>).map((r) => ({
        name: String(r.name ?? ""),
        location: String(r.location ?? ""),
        notes: typeof r.notes === "string" ? r.notes : undefined,
      }));
    }
  }

  const existingIdx = refs.findIndex((r) => r.name === ref.name);
  if (existingIdx >= 0) {
    refs[existingIdx] = ref;
  } else {
    refs.push(ref);
  }

  const fm = createFrontmatter({
    type: "credential-reference",
    project: projectSlug,
    status: "active",
    references: refs.map((r) => ({ name: r.name, location: r.location, ...(r.notes ? { notes: r.notes } : {}) })),
  });

  const body = `# Credential References\n\n> These are pointers to where credentials are documented, not the credentials themselves.\n\n${refs.map((r) => `- **${r.name}**: ${r.location}${r.notes ? ` — ${r.notes}` : ""}`).join("\n")}\n`;

  await ctx.vaultFs.write(filePath, serializeFrontmatter(fm, body));
  return { path: filePath, references: refs };
}

// ── Rollback Points ─────────────────────────────────────

export interface RollbackPoint {
  commit_hash: string;
  purpose: string;
  scope?: string;
  created_at: string;
  follow_up_started: boolean;
}

export interface RollbackResult {
  path: string;
  checkpoints: RollbackPoint[];
}

export async function rollbackCommand(
  args: {
    action: "add" | "list" | "mark-follow-up";
    commit_hash?: string;
    purpose?: string;
    scope?: string;
    project?: string;
    checkpoint_id?: string;
  },
  ctx: CommandContext,
): Promise<RollbackResult> {
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);
  const filePath = `projects/${projectSlug}/_state/rollback-points.md`;

  let checkpoints: RollbackPoint[] = [];

  const exists = await ctx.vaultFs.exists(filePath);
  if (exists) {
    const content = await ctx.vaultFs.read(filePath);
    const { data } = parseFrontmatter(content);
    if (Array.isArray(data.checkpoints)) {
      checkpoints = (data.checkpoints as Array<Record<string, unknown>>).map((c) => ({
        commit_hash: String(c.commit_hash ?? ""),
        purpose: String(c.purpose ?? ""),
        scope: typeof c.scope === "string" ? c.scope : undefined,
        created_at: String(c.created_at ?? ""),
        follow_up_started: Boolean(c.follow_up_started),
      }));
    }
  }

  if (args.action === "list") {
    return { path: filePath, checkpoints };
  }

  if (args.action === "mark-follow-up") {
    if (!args.checkpoint_id) throw new Error("checkpoint_id required for mark-follow-up");
    const idx = checkpoints.findIndex(
      (c) => c.commit_hash === args.checkpoint_id || c.created_at === args.checkpoint_id,
    );
    if (idx < 0) throw new Error(`Checkpoint not found: ${args.checkpoint_id}`);
    checkpoints[idx].follow_up_started = true;
  } else if (args.action === "add") {
    if (!args.commit_hash || !args.purpose) {
      throw new Error("commit_hash and purpose required for rollback add");
    }
    checkpoints.push({
      commit_hash: args.commit_hash,
      purpose: args.purpose,
      scope: args.scope,
      created_at: new Date().toISOString(),
      follow_up_started: false,
    });
  }

  const fm = createFrontmatter({
    type: "rollback-points",
    project: projectSlug,
    status: "active",
    checkpoints: checkpoints.map((c) => ({
      commit_hash: c.commit_hash,
      purpose: c.purpose,
      ...(c.scope ? { scope: c.scope } : {}),
      created_at: c.created_at,
      follow_up_started: c.follow_up_started,
    })),
  });

  const body = `# Rollback Points\n\n${checkpoints.map((c) => `- **${c.commit_hash.slice(0, 8)}** (${c.created_at.slice(0, 10)}): ${c.purpose}${c.follow_up_started ? " [follow-up started]" : ""}${c.scope ? ` — scope: ${c.scope}` : ""}`).join("\n")}\n`;

  await ctx.vaultFs.write(filePath, serializeFrontmatter(fm, body));
  return { path: filePath, checkpoints };
}
