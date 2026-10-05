// SPDX-License-Identifier: Apache-2.0
import type { VaultFS } from "../vault-fs.js";
import { parseFrontmatter } from "../frontmatter.js";
import { normalizeAcceptance, type AcceptanceInput, type SpecAcceptance } from "./spec.js";

export type TicketStatus = "backlog" | "in-progress" | "blocked" | "done" | "cancelled";

export const TICKET_STATUSES: TicketStatus[] = ["backlog", "in-progress", "blocked", "done", "cancelled"];
export const TICKET_COLUMNS: TicketStatus[] = [...TICKET_STATUSES];

/** Compact evidence reference kept in the ticket's evidence slot. */
export interface TicketEvidenceRef {
  ts: string;
  command: string;
  exit: number;
  commit: string;
}

export interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  spec: string;
  spec_hash: string;
  blocked_by: string[];
  requires_review: boolean;
  acceptance: SpecAcceptance[];
  evidence: TicketEvidenceRef[];
  path: string;
  created: string;
  updated: string;
}

function parseStoredAcceptance(value: unknown): SpecAcceptance[] {
  if (!Array.isArray(value)) return [];
  const inputs: AcceptanceInput[] = [];
  for (const raw of value) {
    if (typeof raw === "string") {
      inputs.push(raw);
      continue;
    }
    if (raw !== null && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      inputs.push({
        id: typeof obj.id === "string" ? obj.id : undefined,
        text: typeof obj.text === "string" ? obj.text : "",
        command: typeof obj.command === "string" ? obj.command : undefined,
        manual: typeof obj.manual === "string" ? obj.manual : undefined,
      });
    }
  }
  return normalizeAcceptance(inputs);
}

function parseEvidenceRefs(value: unknown): TicketEvidenceRef[] {
  if (!Array.isArray(value)) return [];
  const refs: TicketEvidenceRef[] = [];
  for (const raw of value) {
    if (raw === null || typeof raw !== "object") continue;
    const obj = raw as Record<string, unknown>;
    if (typeof obj.ts !== "string" || typeof obj.command !== "string") continue;
    refs.push({
      ts: obj.ts,
      command: obj.command,
      exit: typeof obj.exit === "number" ? obj.exit : 1,
      commit: typeof obj.commit === "string" ? obj.commit : "",
    });
  }
  return refs;
}

export function parseTicket(content: string, path: string): Ticket | null {
  const { data, content: body } = parseFrontmatter(content);
  if (data.type !== "ticket") return null;

  const basename = path.split("/").pop() ?? path;
  const idMatch = basename.match(/^(ticket-\d+)/);
  if (!idMatch) return null;

  const titleMatch = body.match(/^#\s+(.+)$/m);
  const status = TICKET_STATUSES.includes(data.status as TicketStatus)
    ? (data.status as TicketStatus)
    : "backlog";

  return {
    id: idMatch[1],
    title: titleMatch ? titleMatch[1].trim() : basename,
    status,
    spec: typeof data.spec === "string" ? data.spec : "",
    spec_hash: typeof data.spec_hash === "string" ? data.spec_hash : "",
    blocked_by: Array.isArray(data.blocked_by) ? (data.blocked_by as unknown[]).filter((v): v is string => typeof v === "string") : [],
    requires_review: data.requires_review === true,
    acceptance: parseStoredAcceptance(data.acceptance),
    evidence: parseEvidenceRefs(data.evidence),
    path,
    created: typeof data.created === "string" ? data.created : "",
    updated: typeof data.updated === "string" ? data.updated : "",
  };
}

export async function listTickets(vaultFs: VaultFS, ticketsDir: string): Promise<Ticket[]> {
  let files: string[];
  try {
    files = await vaultFs.list(ticketsDir, 1);
  } catch {
    return [];
  }

  const tickets: Ticket[] = [];
  for (const file of files.filter((f) => f.endsWith(".md"))) {
    try {
      const ticket = parseTicket(await vaultFs.read(file), file);
      if (ticket) tickets.push(ticket);
    } catch (e: unknown) {
      console.error("[tickets] Skipping unreadable ticket file:", e instanceof Error ? e.message : e);
    }
  }
  return tickets.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Resolve a ticket reference: full path, "ticket-NNN", or "NNN".
 */
export async function resolveTicketPath(vaultFs: VaultFS, ticketsDir: string, ref: string): Promise<string> {
  const clean = ref.replace(/\\/g, "/").replace(/^\.\/+/, "");
  if (clean.endsWith(".md") && (await vaultFs.exists(clean))) return clean;

  const refName = clean.split("/").pop() ?? clean;
  const prefixed = /^\d+$/.test(refName) ? `ticket-${refName.padStart(3, "0")}` : refName;
  const tickets = await listTickets(vaultFs, ticketsDir);
  const match = tickets.find((ticket) => {
    const base = ticket.path.split("/").pop() ?? ticket.path;
    return ticket.id === prefixed || base === prefixed || base === `${prefixed}.md` || base.startsWith(`${prefixed}-`);
  });
  if (!match) throw new Error(`Ticket not found: ${ref}`);
  return match.path;
}

/**
 * Deterministic topological order (Kahn's algorithm, ties broken by ticket id).
 * Unknown blocker ids are ignored; cycles throw.
 */
export function topoOrder(tickets: Ticket[]): string[] {
  const byId = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const ticket of tickets) {
    indegree.set(ticket.id, 0);
    dependents.set(ticket.id, []);
  }
  for (const ticket of tickets) {
    for (const blocker of new Set(ticket.blocked_by)) {
      if (!byId.has(blocker)) continue;
      indegree.set(ticket.id, (indegree.get(ticket.id) ?? 0) + 1);
      dependents.get(blocker)!.push(ticket.id);
    }
  }

  const ready = tickets.filter((t) => (indegree.get(t.id) ?? 0) === 0).map((t) => t.id).sort();
  const order: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift()!;
    order.push(id);
    for (const dependent of [...(dependents.get(id) ?? [])].sort()) {
      const remaining = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, remaining);
      if (remaining === 0) {
        const insertAt = ready.findIndex((candidate) => candidate > dependent);
        if (insertAt === -1) ready.push(dependent);
        else ready.splice(insertAt, 0, dependent);
      }
    }
  }

  if (order.length !== tickets.length) {
    const cyclic = tickets.map((t) => t.id).filter((id) => !order.includes(id)).sort();
    throw new Error(`Circular ticket dependencies: ${cyclic.join(", ")}`);
  }
  return order;
}

function isResolved(blocker: string, byId: Map<string, Ticket>): boolean {
  const ticket = byId.get(blocker);
  return ticket !== undefined && (ticket.status === "done" || ticket.status === "cancelled");
}

/**
 * Tickets that are not done/cancelled and whose blockers are all done/cancelled,
 * returned in deterministic topological order.
 */
export function readyTickets(tickets: Ticket[]): Ticket[] {
  const byId = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const readyIds = new Set(
    tickets
      .filter((ticket) => ticket.status !== "done" && ticket.status !== "cancelled")
      .filter((ticket) => ticket.blocked_by.every((blocker) => isResolved(blocker, byId)))
      .map((ticket) => ticket.id),
  );
  return topoOrder(tickets)
    .map((id) => byId.get(id)!)
    .filter((ticket) => readyIds.has(ticket.id));
}
