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
  });
});
