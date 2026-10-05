// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { serializeFrontmatter, createFrontmatter, mergeFrontmatter, parseFrontmatter } from "../lib/frontmatter.js";
import { resolveProject } from "../config.js";
import { getNextNumber, slugify } from "../lib/auto-number.js";
import {
  normalizeAcceptance,
  validateAcceptance,
  loadSpec,
  resolveSpecPath,
  type AcceptanceInput,
} from "../lib/gates/spec.js";
import {
  TICKET_COLUMNS,
  TICKET_STATUSES,
  listTickets,
  parseTicket,
  readyTickets,
  resolveTicketPath,
  topoOrder,
  type Ticket,
  type TicketStatus,
} from "../lib/gates/tickets.js";

export { topoOrder, readyTickets } from "../lib/gates/tickets.js";
export type { Ticket, TicketStatus } from "../lib/gates/tickets.js";

export interface TicketInput {
  title: string;
  acceptance?: AcceptanceInput[];
  blockedBy?: string[];
  requiresReview?: boolean;
}

export type TicketsAction = "create" | "list" | "board" | "ready" | "update";

export interface TicketsCommandArgs {
  action: TicketsAction;
  spec?: string;
  tickets?: TicketInput[];
  ticketId?: string;
  status?: TicketStatus;
  project?: string;
}

export async function ticketsCommand(
  args: TicketsCommandArgs,
  ctx: CommandContext,
): Promise<{
  spec?: string;
  spec_hash?: string;
  tickets?: Ticket[];
  created?: Array<{ ticket_id: string; title: string; path: string }>;
  board?: Record<string, Ticket[]>;
  ready?: Ticket[];
  ticket_id?: string;
  path?: string;
  updated_fields?: string[];
}> {
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);
  const specsDir = `projects/${projectSlug}/specs`;
  const ticketsDir = `projects/${projectSlug}/tickets`;

  switch (args.action) {
    case "create": {
      if (!args.spec) throw new Error("Spec reference required for tickets create");
      if (!args.tickets?.length) throw new Error("At least one ticket required for tickets create");

      const specPath = await resolveSpecPath(ctx.vaultFs, specsDir, args.spec);
      const loadedSpec = await loadSpec(ctx.vaultFs, specPath);

      if (loadedSpec.status !== "frozen") {
        throw new Error(`Spec must be frozen before creating tickets (current status: ${loadedSpec.status}): ${specPath}`);
      }
      if (!loadedSpec.hashMatches) {
        throw new Error(`Spec content hash mismatch (modified after freeze): ${specPath}`);
      }

      const nextNumber = await getNextNumber(ctx.vaultFs, ticketsDir);
      const planned = args.tickets.map((input, index) => ({
        input,
        id: `ticket-${String(nextNumber + index).padStart(3, "0")}`,
      }));
      const batchIds = new Set(planned.map((entry) => entry.id));
      const existingIds = new Set((await listTickets(ctx.vaultFs, ticketsDir)).map((ticket) => ticket.id));

      const created: Array<{ ticket_id: string; title: string; path: string }> = [];

      for (const { input, id } of planned) {
        if (!input.title?.trim()) throw new Error(`Ticket ${id} is missing a title`);

        const acceptance = normalizeAcceptance(input.acceptance ?? []);
        const errors = validateAcceptance(acceptance);
        if (errors.length > 0) {
          throw new Error(`Invalid ticket ${id}: ${errors.join("; ")}`);
        }

        const blockedBy = [...new Set(input.blockedBy ?? [])];
        for (const blocker of blockedBy) {
          if (blocker === id) throw new Error(`Ticket ${id} cannot block itself`);
          if (!batchIds.has(blocker) && !existingIds.has(blocker)) {
            throw new Error(`Ticket ${id} blocked_by unknown ticket: ${blocker}`);
          }
        }

        const fm = createFrontmatter({
          type: "ticket",
          project: projectSlug,
          spec: specPath,
          spec_hash: loadedSpec.hash,
          status: "backlog",
          blocked_by: blockedBy,
          requires_review: input.requiresReview === true,
          acceptance,
          evidence: [],
        });

        const filePath = `${ticketsDir}/${id}-${slugify(input.title)}.md`;
        await ctx.vaultFs.write(filePath, serializeFrontmatter(fm, `# ${input.title.trim()}\n`));
        created.push({ ticket_id: id, title: input.title.trim(), path: filePath });
      }

      return { spec: specPath, spec_hash: loadedSpec.hash, created };
    }

    case "list": {
      return { tickets: await listTickets(ctx.vaultFs, ticketsDir) };
    }

    case "board": {
      const tickets = await listTickets(ctx.vaultFs, ticketsDir);
      const board: Record<string, Ticket[]> = {};
      for (const column of TICKET_COLUMNS) {
        board[column] = tickets.filter((ticket) => ticket.status === column);
      }
      return { board };
    }

    case "ready": {
      const tickets = await listTickets(ctx.vaultFs, ticketsDir);
      return { ready: readyTickets(tickets) };
    }

    case "update": {
      if (!args.ticketId) throw new Error("Ticket ID required for update");
      if (args.status && !TICKET_STATUSES.includes(args.status)) {
        throw new Error(`Invalid status "${args.status}". Must be one of: ${TICKET_STATUSES.join(", ")}`);
      }

      const path = await resolveTicketPath(ctx.vaultFs, ticketsDir, args.ticketId);
      const content = await ctx.vaultFs.read(path);
      const ticket = parseTicket(content, path);
      if (!ticket) throw new Error(`Not a ticket: ${path}`);

      const updatedFields: string[] = [];
      const { data, content: body } = parseFrontmatter(content);
      if (args.status) {
        data.status = args.status;
        updatedFields.push("status");
      }

      if (updatedFields.length > 0) {
        const fm = mergeFrontmatter(data, {});
        await ctx.vaultFs.write(path, serializeFrontmatter(fm, body));
      }

      return { ticket_id: ticket.id, path, updated_fields: updatedFields };
    }

    default:
      throw new Error(`Unknown action: ${args.action}`);
  }
}
