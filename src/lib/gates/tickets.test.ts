import { describe, it, expect } from "vitest";
import { serializeFrontmatter } from "../frontmatter.js";
import { parseTicket, readyTickets, topoOrder, type Ticket } from "./tickets.js";

function ticket(overrides: Partial<Ticket> & { id: string }): Ticket {
  return {
    title: overrides.id,
    status: "backlog",
    spec: "projects/p/specs/001-x.md",
    spec_hash: "abc",
    blocked_by: [],
    requires_review: false,
    acceptance: [],
    evidence: [],
    path: `projects/p/tickets/${overrides.id}-x.md`,
    created: "",
    updated: "",
    ...overrides,
  };
}

describe("parseTicket", () => {
  it("parses frontmatter and body", () => {
    const content = serializeFrontmatter(
      {
        type: "ticket",
        spec: "projects/p/specs/001-x.md",
        spec_hash: "deadbeef",
        status: "in-progress",
        blocked_by: ["ticket-001"],
        requires_review: true,
        acceptance: [{ id: "A1", text: "tests pass", command: "npm test" }],
        evidence: [{ ts: "2026-01-01T00:00:00.000Z", command: "npm test", exit: 0, commit: "c1" }],
      },
      "# My ticket\n",
    );

    const parsed = parseTicket(content, "projects/p/tickets/ticket-002-my-ticket.md");
    expect(parsed).not.toBeNull();
    expect(parsed!.id).toBe("ticket-002");
    expect(parsed!.title).toBe("My ticket");
    expect(parsed!.status).toBe("in-progress");
    expect(parsed!.blocked_by).toEqual(["ticket-001"]);
    expect(parsed!.requires_review).toBe(true);
    expect(parsed!.acceptance).toEqual([{ id: "A1", text: "tests pass", command: "npm test" }]);
    expect(parsed!.evidence).toEqual([
      { ts: "2026-01-01T00:00:00.000Z", command: "npm test", exit: 0, commit: "c1" },
    ]);
  });

  it("returns null for non-ticket files", () => {
    expect(parseTicket("---\ntype: task\n---\n# nope\n", "projects/p/tickets/ticket-001-x.md")).toBeNull();
    expect(parseTicket("---\ntype: ticket\n---\n# nope\n", "projects/p/tickets/other.md")).toBeNull();
  });

  it("defaults unknown statuses to backlog", () => {
    const content = serializeFrontmatter({ type: "ticket", status: "weird" }, "# T\n");
    expect(parseTicket(content, "projects/p/tickets/ticket-001-t.md")!.status).toBe("backlog");
  });
});

describe("topoOrder", () => {
  it("orders independent tickets by id", () => {
    const order = topoOrder([ticket({ id: "ticket-002" }), ticket({ id: "ticket-001" })]);
    expect(order).toEqual(["ticket-001", "ticket-002"]);
  });

  it("orders a chain", () => {
    const order = topoOrder([
      ticket({ id: "ticket-003", blocked_by: ["ticket-002"] }),
      ticket({ id: "ticket-002", blocked_by: ["ticket-001"] }),
      ticket({ id: "ticket-001" }),
    ]);
    expect(order).toEqual(["ticket-001", "ticket-002", "ticket-003"]);
  });

  it("orders a diamond deterministically", () => {
    const order = topoOrder([
      ticket({ id: "ticket-004", blocked_by: ["ticket-002", "ticket-003"] }),
      ticket({ id: "ticket-003", blocked_by: ["ticket-001"] }),
      ticket({ id: "ticket-002", blocked_by: ["ticket-001"] }),
      ticket({ id: "ticket-001" }),
    ]);
    expect(order).toEqual(["ticket-001", "ticket-002", "ticket-003", "ticket-004"]);
  });

  it("ignores unknown blockers", () => {
    expect(topoOrder([ticket({ id: "ticket-001", blocked_by: ["ghost"] })])).toEqual(["ticket-001"]);
  });

  it("throws on cycles", () => {
    expect(() =>
      topoOrder([
        ticket({ id: "ticket-001", blocked_by: ["ticket-002"] }),
        ticket({ id: "ticket-002", blocked_by: ["ticket-001"] }),
      ]),
    ).toThrow("Circular ticket dependencies: ticket-001, ticket-002");
  });

  it("throws on self-blocking tickets", () => {
    expect(() => topoOrder([ticket({ id: "ticket-001", blocked_by: ["ticket-001"] })])).toThrow("Circular");
  });
});

describe("readyTickets", () => {
  it("returns tickets whose blockers are done", () => {
    const ready = readyTickets([
      ticket({ id: "ticket-001", status: "done" }),
      ticket({ id: "ticket-002", blocked_by: ["ticket-001"] }),
      ticket({ id: "ticket-003", blocked_by: ["ticket-002"] }),
    ]);
    expect(ready.map((t) => t.id)).toEqual(["ticket-002"]);
  });

  it("treats cancelled blockers as resolved", () => {
    const ready = readyTickets([
      ticket({ id: "ticket-001", status: "cancelled" }),
      ticket({ id: "ticket-002", blocked_by: ["ticket-001"] }),
    ]);
    expect(ready.map((t) => t.id)).toEqual(["ticket-002"]);
  });

  it("does not ready tickets with unknown blockers", () => {
    const ready = readyTickets([ticket({ id: "ticket-001", blocked_by: ["ghost"] })]);
    expect(ready).toEqual([]);
  });

  it("excludes done and cancelled tickets", () => {
    const ready = readyTickets([
      ticket({ id: "ticket-001", status: "done" }),
      ticket({ id: "ticket-002", status: "cancelled" }),
      ticket({ id: "ticket-003" }),
    ]);
    expect(ready.map((t) => t.id)).toEqual(["ticket-003"]);
  });

  it("returns ready tickets in topological order", () => {
    const ready = readyTickets([
      ticket({ id: "ticket-003" }),
      ticket({ id: "ticket-002" }),
      ticket({ id: "ticket-001" }),
    ]);
    expect(ready.map((t) => t.id)).toEqual(["ticket-001", "ticket-002", "ticket-003"]);
  });
});
