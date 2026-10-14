// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { serializeFrontmatter, createFrontmatter, mergeFrontmatter, parseFrontmatter } from "../lib/frontmatter.js";
import { resolveProject } from "../config.js";
import { claimNumberedBatch, slugify } from "../lib/auto-number.js";
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
  limit?: number;
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
  if (args.status !== undefined && !TICKET_STATUSES.includes(args.status)) {
    throw new Error(`Invalid status "${args.status}". Must be one of: ${TICKET_STATUSES.join(", ")}`);
  }
  if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 0 || args.limit > 500)) {
    throw new Error("limit must be an integer between 0 and 500");
  }
  const projectSlug = await resolveProject(ctx.vaultPath, args.project);
  const specsDir = `projects/${projectSlug}/specs`;
  const ticketsDir = `projects/${projectSlug}/tickets`;

  switch (args.action) {
    case "create": {
      if (!args.spec) throw new Error("Spec reference required for tickets create");
      if (!Array.isArray(args.tickets) || !args.tickets.length) throw new Error("At least one ticket required for tickets create");
      for (const [index, input] of args.tickets.entries()) {
        const label = `ticket ${index + 1}`;
        if (input === null || typeof input !== "object" || Array.isArray(input)) throw new Error(`Invalid ${label}: expected an object`);
        if (typeof input.title !== "string" || !input.title.trim()) throw new Error(`Invalid ${label}: title must be a non-empty string`);
        if (input.blockedBy !== undefined && (!Array.isArray(input.blockedBy) || !input.blockedBy.every((id) => typeof id === "string" && id.trim()))) throw new Error(`Invalid ${label}: blockedBy must be an array of non-empty strings`);
        if (input.requiresReview !== undefined && typeof input.requiresReview !== "boolean") throw new Error(`Invalid ${label}: requiresReview must be a boolean`);
        if (input.acceptance !== undefined && !Array.isArray(input.acceptance)) throw new Error(`Invalid ${label}: acceptance must be an array`);
      }

      const specPath = await resolveSpecPath(ctx.vaultFs, specsDir, args.spec);
      const loadedSpec = await loadSpec(ctx.vaultFs, specPath);

      if (loadedSpec.status !== "frozen") {
        throw new Error(`Spec must be frozen before creating tickets (current status: ${loadedSpec.status}): ${specPath}`);
      }
      if (!loadedSpec.hashMatches) {
        throw new Error(`Spec content hash mismatch (modified after freeze): ${specPath}`);
      }

      const existing = await listTickets(ctx.vaultFs, ticketsDir);
      const startNumber = existing.reduce((next, ticket) => Math.max(next, Number(ticket.id.slice("ticket-".length)) + 1), 1);
      const planned = args.tickets.map((input, index) => {
        const number = startNumber + index;
        return {
          input,
          number,
          id: `ticket-${String(number).padStart(3, "0")}`,
          acceptance: normalizeAcceptance(input.acceptance ?? []),
          blockedBy: [...new Set(input.blockedBy ?? [])],
        };
      });
      const batchIds = new Set(planned.map((entry) => entry.id));
      const existingIds = new Set(existing.map((ticket) => ticket.id));

      // Validate the full batch before claiming any file.
      for (const { input, id, acceptance, blockedBy } of planned) {
        if (!input.title?.trim()) throw new Error(`Ticket ${id} is missing a title`);

        const errors = validateAcceptance(acceptance);
        if (errors.length > 0) {
          throw new Error(`Invalid ticket ${id}: ${errors.join("; ")}`);
        }

        for (const blocker of blockedBy) {
          if (blocker === id) throw new Error(`Ticket ${id} cannot block itself`);
          if (!batchIds.has(blocker) && !existingIds.has(blocker)) {
            throw new Error(`Ticket ${id} blocked_by unknown ticket: ${blocker}`);
          }
        }
      }

      const claims = await claimNumberedBatch(
        ctx.vaultFs,
        ticketsDir,
        planned.length,
        (index, _number, padded) => `ticket-${padded}-${slugify(planned[index].input.title)}.md`,
        (index, reserved) => {
          const { input, acceptance, blockedBy } = planned[index];
          const actualIds = new Map(planned.map((entry, position) => [entry.id, `ticket-${String(reserved[position].number).padStart(3, "0")}`]));
          const fm = createFrontmatter({
            type: "ticket",
            project: projectSlug,
            spec: specPath,
            spec_hash: loadedSpec.hash,
            status: "backlog",
            blocked_by: blockedBy.map((id) => actualIds.get(id) ?? id),
            requires_review: input.requiresReview === true,
            acceptance,
            evidence: [],
          });
          return serializeFrontmatter(fm, `# ${input.title.trim()}\n`);
        },
        { startAt: startNumber },
      );
      const created = claims.map((claim, index) => ({
        ticket_id: `ticket-${String(claim.number).padStart(3, "0")}`,
        title: planned[index].input.title.trim(),
        path: claim.path,
      }));

      return { spec: specPath, spec_hash: loadedSpec.hash, created };
    }

    case "list": {
      const tickets = await listTickets(ctx.vaultFs, ticketsDir);
      return { tickets: tickets.slice(0, args.limit ?? 50) };
    }

    case "board": {
      const tickets = await listTickets(ctx.vaultFs, ticketsDir);
      const board: Record<string, Ticket[]> = {};
      for (const column of TICKET_COLUMNS) {
        const columnTickets = tickets.filter((ticket) => ticket.status === column);
        board[column] = columnTickets.slice(0, args.limit ?? 50);
      }
      return { board };
    }

    case "ready": {
      const tickets = await listTickets(ctx.vaultFs, ticketsDir);
      const ready = readyTickets(tickets);
      return { ready: ready.slice(0, args.limit ?? 50) };
    }

    case "update": {
      if (!args.ticketId) throw new Error("Ticket ID required for update");

      const path = await resolveTicketPath(ctx.vaultFs, ticketsDir, args.ticketId);
      let ticketId = args.ticketId;
      const updatedFields: string[] = [];
      await ctx.vaultFs.update(path, (content) => {
        const ticket = parseTicket(content, path);
        if (!ticket) throw new Error(`Not a ticket: ${path}`);
        ticketId = ticket.id;
        if (!args.status) return content;
        const { data, content: body } = parseFrontmatter(content);
        updatedFields.push("status");
        return serializeFrontmatter(mergeFrontmatter(data, { status: args.status }), body);
      });
      return { ticket_id: ticketId, path, updated_fields: updatedFields };
    }

    default:
      throw new Error(`Unknown action: ${args.action}`);
  }
}
