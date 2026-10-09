// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { serializeFrontmatter, mergeFrontmatter, parseFrontmatter } from "../lib/frontmatter.js";
import { resolveProject } from "../config.js";
import {
  appendEvidence,
  evidencePath,
  getHeadCommit,
  readEvidence,
  truncateOutput,
  type EvidenceRecord,
} from "../lib/gates/evidence.js";
import { parseTicket, resolveTicketPath } from "../lib/gates/tickets.js";

export type EvidenceAction = "add" | "list";

export interface EvidenceCommandArgs {
  action: EvidenceAction;
  ticket?: string;
  command?: string;
  exit?: number;
  output?: string;
  commit?: string;
  ts?: string;
  cwd?: string;
  project?: string;
}

export async function evidenceCommand(
  args: EvidenceCommandArgs,
  ctx: CommandContext,
): Promise<{
  ticket?: string;
  path?: string;
  record?: EvidenceRecord;
  evidence?: EvidenceRecord[];
  count?: number;
}> {
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);
  const ticketsDir = `projects/${projectSlug}/tickets`;

  switch (args.action) {
    case "add": {
      if (!args.ticket) throw new Error("Ticket required for evidence add");
      if (!args.command?.trim()) throw new Error("Command required for evidence add");

      const ticketPath = await resolveTicketPath(ctx.vaultFs, ticketsDir, args.ticket);
      const ticket = parseTicket(await ctx.vaultFs.read(ticketPath), ticketPath);
      if (!ticket) throw new Error(`Not a ticket: ${ticketPath}`);

      const commit = args.commit?.trim() || (await getHeadCommit(args.cwd ?? process.cwd()));
      if (!commit) {
        throw new Error("Could not determine git HEAD commit; pass commit explicitly");
      }

      const ts = args.ts ?? new Date().toISOString();
      const record: EvidenceRecord = {
        ticket: ticket.id,
        command: args.command.trim(),
        exit: args.exit ?? 0,
        output: truncateOutput(args.output ?? ""),
        commit,
        ts,
      };

      const { path } = await appendEvidence(ctx.vaultFs, projectSlug, record);

      let count = 0;
      await ctx.vaultFs.update(ticketPath, (current) => {
        const { data, content: body } = parseFrontmatter(current);
        const slot = Array.isArray(data.evidence) ? [...data.evidence] : [];
        slot.push({ ts, command: record.command, exit: record.exit, commit });
        count = slot.length;
        return serializeFrontmatter(mergeFrontmatter(data, { evidence: slot }), body);
      });

      return { ticket: ticket.id, path, record, count };
    }

    case "list": {
      if (!args.ticket) throw new Error("Ticket required for evidence list");
      const ticketPath = await resolveTicketPath(ctx.vaultFs, ticketsDir, args.ticket);
      const ticket = parseTicket(await ctx.vaultFs.read(ticketPath), ticketPath);
      if (!ticket) throw new Error(`Not a ticket: ${ticketPath}`);

      const evidence = await readEvidence(ctx.vaultFs, projectSlug, ticket.id);
      return {
        ticket: ticket.id,
        path: evidencePath(projectSlug, ticket.id),
        evidence,
        count: evidence.length,
      };
    }

    default:
      throw new Error(`Unknown action: ${args.action}`);
  }
}
