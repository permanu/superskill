import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { specCommand } from "./spec.js";
import { ticketsCommand } from "./tickets.js";
import { createTestContext } from "../test-helpers.js";
import type { CommandContext } from "../core/types.js";
import type { VaultFS } from "../lib/vault-fs.js";

async function createFrozenSpec(ctx: CommandContext): Promise<string> {
  await specCommand(
    {
      action: "create",
      title: "Gates Pipeline",
      goal: "Ship the gates pipeline",
      nonGoals: ["No UI"],
      constraints: ["Node 22"],
      context: "Agents drift.",
      allowedFiles: ["src/**"],
      forbiddenFiles: ["README.md"],
      acceptance: [{ text: "tsc clean", command: "npx tsc --noEmit" }],
      risks: ["Strict gates"],
      rollback: "Revert.",
      project: "test-project",
    },
    ctx,
  );
  await specCommand({ action: "approve", spec: "001", project: "test-project" }, ctx);
  await specCommand({ action: "freeze", spec: "001", project: "test-project" }, ctx);
  return "001";
}

describe("ticketsCommand", () => {
  let vaultFs: VaultFS;
  let ctx: CommandContext;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ vaultFs, ctx, cleanup } = await createTestContext({ project: "test-project", setupProject: true }));
  });

  afterEach(async () => {
    await cleanup();
  });

  it.each(["create", "list", "board", "ready", "update"] as const)("validates every supplied status for %s", async (action) => {
    for (const status of ["", null, "invalid"]) {
      await expect(ticketsCommand({ action, ticketId: "ticket-001", status: status as never, project: "test-project" }, ctx)).rejects.toThrow(/Invalid status/);
    }
  });

  it.each([-1, 1.5, Number.NaN, Infinity, 501, "2", null])("rejects an invalid direct list limit: %j", async (limit) => {
    for (const action of ["list", "board", "ready"] as const) {
      await expect(ticketsCommand({ action, project: "test-project", limit: limit as never }, ctx)).rejects.toThrow(/limit/i);
    }
  });

  it("validates every ticket input shape before claiming any file", async () => {
    await createFrozenSpec(ctx);
    for (const invalid of [null, { title: 1 }, { title: "Bad", requiresReview: "true" }, { title: "Bad", blockedBy: [1] }, { title: "Bad", acceptance: null }]) {
      await expect(ticketsCommand({ action: "create", spec: "001", project: "test-project", tickets: [{ title: "Valid" }, invalid as never] }, ctx)).rejects.toThrow(/ticket 2/i);
      expect(await vaultFs.exists("projects/test-project/tickets")).toBe(false);
    }
  });

  it("bounds direct ticket lists, boards, and ready output to 50 by default and permits zero", async () => {
    const paths = Array.from({ length: 51 }, (_, index) => `projects/test-project/tickets/ticket-${String(index + 1).padStart(3, "0")}-ticket.md`);
    await Promise.all(paths.map((path) => vaultFs.write(path, "---\ntype: ticket\nstatus: backlog\n---\n# Ticket\n")));
    expect((await ticketsCommand({ action: "list", project: "test-project" }, ctx)).tickets).toHaveLength(50);
    expect((await ticketsCommand({ action: "board", project: "test-project" }, ctx)).board!.backlog).toHaveLength(50);
    expect((await ticketsCommand({ action: "ready", project: "test-project" }, ctx)).ready).toHaveLength(50);
    expect((await ticketsCommand({ action: "ready", project: "test-project", limit: 0 }, ctx)).ready).toEqual([]);
  });

  describe("create", () => {
    it("maps dependency references to actual IDs after an abandoned reservation", async () => {
      await createFrozenSpec(ctx);
      await vaultFs.write("projects/test-project/tickets/.number-claims/001", "reserved by an interrupted capture");
      const result = await ticketsCommand({ action: "create", spec: "001", project: "test-project", tickets: [
        { title: "First", blockedBy: ["ticket-002"] },
        { title: "Second" },
        { title: "Third", blockedBy: ["ticket-001"] },
      ] }, ctx);
      expect(result.created!.map((entry) => entry.ticket_id)).toEqual(["ticket-002", "ticket-003", "ticket-004"]);
      const listed = await ticketsCommand({ action: "list", project: "test-project" }, ctx);
      expect(listed.tickets!.find((ticket) => ticket.title === "First")!.blocked_by).toEqual(["ticket-003"]);
      expect(listed.tickets!.find((ticket) => ticket.title === "Third")!.blocked_by).toEqual(["ticket-002"]);
    });

    it("keeps each concurrent batch dependency attached to its own claimed ticket", async () => {
      await createFrozenSpec(ctx);
      const results = await Promise.all(["Alpha", "Beta"].map((prefix) => ticketsCommand({ action: "create", spec: "001", project: "test-project", tickets: [
        { title: `${prefix} first` },
        { title: `${prefix} second`, blockedBy: ["ticket-001"] },
      ] }, ctx)));
      const listed = await ticketsCommand({ action: "list", project: "test-project" }, ctx);
      for (const result of results) {
        const first = result.created![0];
        const second = listed.tickets!.find((ticket) => ticket.id === result.created![1].ticket_id)!;
        expect(second.blocked_by).toEqual([first.ticket_id]);
      }
    });

    it("refuses to create tickets from an unfrozen spec", async () => {
      await specCommand(
        { action: "create", title: "Draft", project: "test-project" },
        ctx,
      );
      await expect(
        ticketsCommand(
          { action: "create", spec: "001", tickets: [{ title: "T1" }], project: "test-project" },
          ctx,
        ),
      ).rejects.toThrow("Spec must be frozen before creating tickets");
    });

    it("creates numbered tickets with acceptance and evidence slot", async () => {
      await createFrozenSpec(ctx);

      const result = await ticketsCommand(
        {
          action: "create",
          spec: "001",
          tickets: [
            { title: "First", acceptance: [{ text: "tests pass", command: "npm test" }] },
            {
              title: "Second",
              acceptance: [{ text: "reviewed", manual: "human eyes" }],
              blockedBy: ["ticket-001"],
              requiresReview: true,
            },
          ],
          project: "test-project",
        },
        ctx,
      );

      expect(result.created!.map((t) => t.ticket_id)).toEqual(["ticket-001", "ticket-002"]);
      expect(result.spec).toBe("projects/test-project/specs/001-gates-pipeline.md");
      expect(result.spec_hash).toBeTruthy();

      const content = await vaultFs.read("projects/test-project/tickets/ticket-001-first.md");
      expect(content).toContain("type: ticket");
      expect(content).toContain("spec_hash:");
      expect(content).toContain("requires_review: false");
      expect(content).toContain("command: npm test");
      expect(content).toContain("evidence: []");
      expect(content).toContain("# First");

      const second = await vaultFs.read("projects/test-project/tickets/ticket-002-second.md");
      expect(second).toContain("requires_review: true");
      expect(second).toContain("- ticket-001");
      expect(second).toContain("manual: human eyes");
    });

    it("rejects unknown blockers", async () => {
      await createFrozenSpec(ctx);
      await expect(
        ticketsCommand(
          {
            action: "create",
            spec: "001",
            tickets: [{ title: "Blocked", blockedBy: ["ticket-099"] }],
            project: "test-project",
          },
          ctx,
        ),
      ).rejects.toThrow("blocked_by unknown ticket: ticket-099");
    });

    it("rejects self-blocking tickets", async () => {
      await createFrozenSpec(ctx);
      await expect(
        ticketsCommand(
          {
            action: "create",
            spec: "001",
            tickets: [{ title: "Self", blockedBy: ["ticket-001"] }],
            project: "test-project",
          },
          ctx,
        ),
      ).rejects.toThrow("cannot block itself");
    });

    it("rejects acceptance items without a runner", async () => {
      await createFrozenSpec(ctx);
      await expect(
        ticketsCommand(
          {
            action: "create",
            spec: "001",
            tickets: [{ title: "Bad", acceptance: [{ text: "unmarked" }] }],
            project: "test-project",
          },
          ctx,
        ),
      ).rejects.toThrow("needs an executable command");
    });
  });

  describe("list, board, update", () => {
    it("lists and groups tickets by status", async () => {
      await createFrozenSpec(ctx);
      await ticketsCommand(
        {
          action: "create",
          spec: "001",
          tickets: [{ title: "One" }, { title: "Two" }],
          project: "test-project",
        },
        ctx,
      );

      const list = await ticketsCommand({ action: "list", project: "test-project" }, ctx);
      expect(list.tickets!.map((t) => t.id)).toEqual(["ticket-001", "ticket-002"]);

      const board = await ticketsCommand({ action: "board", project: "test-project" }, ctx);
      expect(board.board!["backlog"]).toHaveLength(2);
      expect(board.board!["done"]).toHaveLength(0);

      await ticketsCommand({ action: "update", ticketId: "ticket-001", status: "done", project: "test-project" }, ctx);
      const after = await ticketsCommand({ action: "board", project: "test-project" }, ctx);
      expect(after.board!["done"]).toHaveLength(1);
      expect(after.board!["backlog"]).toHaveLength(1);
    });

    it("rejects invalid statuses", async () => {
      await createFrozenSpec(ctx);
      await ticketsCommand(
        { action: "create", spec: "001", tickets: [{ title: "One" }], project: "test-project" },
        ctx,
      );
      await expect(
        ticketsCommand(
          { action: "update", ticketId: "ticket-001", status: "weird" as never, project: "test-project" },
          ctx,
        ),
      ).rejects.toThrow('Invalid status "weird"');
    });

    it("limits listed tickets after existing ordering", async () => {
      await createFrozenSpec(ctx);
      await ticketsCommand(
        {
          action: "create",
          spec: "001",
          tickets: [{ title: "One" }, { title: "Two" }, { title: "Three" }],
          project: "test-project",
        },
        ctx,
      );

      const limited = await ticketsCommand({ action: "list", project: "test-project", limit: 2 }, ctx);
      expect(limited.tickets!.map((t) => t.id)).toEqual(["ticket-001", "ticket-002"]);

      const all = await ticketsCommand({ action: "list", project: "test-project" }, ctx);
      expect(all.tickets).toHaveLength(3);
    });
  });

  describe("ready", () => {
    it("respects blockers and returns topological order", async () => {
      await createFrozenSpec(ctx);
      await ticketsCommand(
        {
          action: "create",
          spec: "001",
          tickets: [
            { title: "Root" },
            { title: "Mid", blockedBy: ["ticket-001"] },
            { title: "Leaf", blockedBy: ["ticket-002"] },
          ],
          project: "test-project",
        },
        ctx,
      );

      const initial = await ticketsCommand({ action: "ready", project: "test-project" }, ctx);
      expect(initial.ready!.map((t) => t.id)).toEqual(["ticket-001"]);

      await ticketsCommand({ action: "update", ticketId: "ticket-001", status: "done", project: "test-project" }, ctx);
      const afterRoot = await ticketsCommand({ action: "ready", project: "test-project" }, ctx);
      expect(afterRoot.ready!.map((t) => t.id)).toEqual(["ticket-002"]);

      await ticketsCommand({ action: "update", ticketId: "ticket-002", status: "done", project: "test-project" }, ctx);
      const afterMid = await ticketsCommand({ action: "ready", project: "test-project" }, ctx);
      expect(afterMid.ready!.map((t) => t.id)).toEqual(["ticket-003"]);
    });

    it("limits ready tickets when limit is provided", async () => {
      await createFrozenSpec(ctx);
      await ticketsCommand(
        {
          action: "create",
          spec: "001",
          tickets: [{ title: "First" }, { title: "Second" }],
          project: "test-project",
        },
        ctx,
      );

      const result = await ticketsCommand({ action: "ready", project: "test-project", limit: 1 }, ctx);

      expect(result.ready!.map((t) => t.id)).toEqual(["ticket-001"]);
    });
  });
});
