// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { resolveProject } from "../config.js";
import { loadSpec, resolveSpecPath, specGaps, validateAcceptance, validateSpec } from "../lib/gates/spec.js";
import { parseTicket, resolveTicketPath } from "../lib/gates/tickets.js";
import {
  getHeadCommit,
  isReviewRecord,
  readEvidence,
  type EvidenceRecord,
} from "../lib/gates/evidence.js";

export type GateTargetKind = "spec" | "ticket";

export interface GateResult {
  target: string;
  kind: GateTargetKind;
  pass: boolean;
  missing: string[];
  details: Record<string, unknown>;
}

export interface GateCommandArgs {
  target: string;
  project?: string;
  head?: string;
  cwd?: string;
}

export function classifyGateTarget(target: string): GateTargetKind {
  const clean = target.replace(/\\/g, "/").trim();
  const base = clean.split("/").pop() ?? clean;
  if (clean.includes("/tickets/") || /^ticket-\d+/.test(base)) return "ticket";
  if (clean.includes("/specs/") || /^\d+/.test(base) || /^spec-/.test(base)) return "spec";
  throw new Error(`Cannot determine gate target kind (expected a spec or ticket): ${target}`);
}

function shortHash(hash: string): string {
  return hash.length > 12 ? hash.slice(0, 12) : hash;
}

function specMissingItems(loaded: Awaited<ReturnType<typeof loadSpec>>): string[] {
  const missing: string[] = [];
  for (const error of validateSpec(loaded.spec)) missing.push(`spec invalid: ${error}`);
  for (const gap of specGaps(loaded.spec)) missing.push(`spec gap: ${gap.field} (${gap.reason})`);
  if (loaded.status !== "frozen") missing.push(`spec is not frozen (status: ${loaded.status})`);
  if (loaded.status === "frozen" && !loaded.hashMatches) {
    missing.push("spec content hash mismatch (modified after freeze)");
  }
  return missing;
}

async function checkSpec(
  ctx: CommandContext,
  projectSlug: string,
  target: string,
): Promise<GateResult> {
  const specsDir = `projects/${projectSlug}/specs`;
  const path = await resolveSpecPath(ctx.vaultFs, specsDir, target);
  const loaded = await loadSpec(ctx.vaultFs, path);
  const missing = specMissingItems(loaded);

  return {
    target,
    kind: "spec",
    pass: missing.length === 0,
    missing,
    details: {
      path,
      status: loaded.status,
      spec_id: loaded.specId,
      hash: loaded.hash,
      stored_hash: loaded.storedHash,
      hash_matches: loaded.hashMatches,
    },
  };
}

async function checkTicket(
  ctx: CommandContext,
  projectSlug: string,
  target: string,
  headOverride: string | undefined,
  cwd: string | undefined,
): Promise<GateResult> {
  const ticketsDir = `projects/${projectSlug}/tickets`;
  const path = await resolveTicketPath(ctx.vaultFs, ticketsDir, target);
  const ticket = parseTicket(await ctx.vaultFs.read(path), path);
  if (!ticket) throw new Error(`Not a ticket: ${path}`);

  const missing: string[] = [];

  if (ticket.acceptance.length === 0) missing.push("ticket has no acceptance criteria");
  for (const error of validateAcceptance(ticket.acceptance)) {
    missing.push(`ticket acceptance: ${error}`);
  }

  let specDetails: Record<string, unknown> = {};
  if (!ticket.spec) {
    missing.push("ticket has no spec reference");
  } else {
    try {
      const loaded = await loadSpec(ctx.vaultFs, ticket.spec);
      for (const item of specMissingItems(loaded)) missing.push(item);
      if (ticket.spec_hash && loaded.hash !== ticket.spec_hash) {
        missing.push("spec changed since ticket creation (spec_hash mismatch)");
      }
      specDetails = {
        spec: ticket.spec,
        spec_status: loaded.status,
        spec_hash: loaded.hash,
      };
    } catch {
      missing.push(`spec not found: ${ticket.spec}`);
    }
  }

  const records = await readEvidence(ctx.vaultFs, projectSlug, ticket.id);
  const head = headOverride?.trim() || (await getHeadCommit(cwd ?? process.cwd()));
  let latest: EvidenceRecord | null = null;

  if (records.length === 0) {
    missing.push("no evidence recorded");
  } else {
    latest = records[records.length - 1];
    if (!head) {
      missing.push("could not determine HEAD commit for evidence check");
    } else if (latest.commit !== head) {
      missing.push(`evidence is stale: latest evidence at ${shortHash(latest.commit)}, HEAD is ${shortHash(head)}`);
    }
    if (latest.exit !== 0) {
      missing.push(`latest evidence exit ${latest.exit} (expected 0)`);
    }
  }

  if (ticket.requires_review) {
    const reviewed = records.some(
      (record) => isReviewRecord(record) && record.exit === 0 && (head === null || record.commit === head),
    );
    if (!reviewed) missing.push("requires review: no passing review evidence at HEAD");
  }

  return {
    target,
    kind: "ticket",
    pass: missing.length === 0,
    missing,
    details: {
      path,
      ticket: ticket.id,
      status: ticket.status,
      ...specDetails,
      evidence_count: records.length,
      head: head ?? null,
      latest_evidence: latest,
    },
  };
}

export async function gateCommand(args: GateCommandArgs, ctx: CommandContext): Promise<GateResult> {
  if (!args.target?.trim()) throw new Error("Target required for gate check");
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);
  const kind = classifyGateTarget(args.target);
  return kind === "spec"
    ? checkSpec(ctx, projectSlug, args.target)
    : checkTicket(ctx, projectSlug, args.target, args.head, args.cwd);
}
