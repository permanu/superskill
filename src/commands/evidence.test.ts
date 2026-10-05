import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { specCommand } from "./spec.js";
import { ticketsCommand } from "./tickets.js";
import { evidenceCommand } from "./evidence.js";
import { createTestContext } from "../test-helpers.js";
import type { CommandContext } from "../core/types.js";
import type { VaultFS } from "../lib/vault-fs.js";

async function createTicket(ctx: CommandContext, requiresReview = false): Promise<void> {
  await specCommand(
    {
      action: "create",
      title: "Gates Pipeline",
      goal: "Ship it",
      nonGoals: ["No UI"],
      constraints: ["Node 22"],
      context: "Context.",
      allowedFiles: ["src/**"],
      forbiddenFiles: ["README.md"],
      acceptance: [{ text: "tsc clean", command: "npx tsc --noEmit" }],
      risks: ["Risks"],
      rollback: "Revert.",
      project: "test-project",
    },
    ctx,
  );
  await specCommand({ action: "approve", spec: "001", project: "test-project" }, ctx);
  await specCommand({ action: "freeze", spec: "001", project: "test-project" }, ctx);
  await ticketsCommand(
    {
      action: "create",
      spec: "001",
      tickets: [{ title: "Implement", acceptance: [{ text: "tests pass", command: "npm test" }], requiresReview }],
      project: "test-project",
    },
    ctx,
  );
}

describe("evidenceCommand", () => {
  let vaultRoot: string;
  let vaultFs: VaultFS;
  let ctx: CommandContext;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ vaultRoot, vaultFs, ctx, cleanup } = await createTestContext({ project: "test-project", setupProject: true }));
  });

  afterEach(async () => {
    await cleanup();
  });

  describe("add", () => {
    it("appends a record to the jsonl file and the ticket evidence slot", async () => {
      await createTicket(ctx);

      const result = await evidenceCommand(
        {
          action: "add",
          ticket: "ticket-001",
          command: "npm test",
          exit: 0,
          output: "all green",
          commit: "c1",
          ts: "2026-01-01T00:00:00.000Z",
          project: "test-project",
        },
        ctx,
      );

      expect(result.ticket).toBe("ticket-001");
      expect(result.path).toBe("projects/test-project/evidence/ticket-001.jsonl");
      expect(result.count).toBe(1);

      const jsonl = await vaultFs.read(result.path!);
      const parsed = JSON.parse(jsonl.trim());
      expect(parsed).toEqual({
        ticket: "ticket-001",
        command: "npm test",
        exit: 0,
        output: "all green",
        commit: "c1",
        ts: "2026-01-01T00:00:00.000Z",
      });

      const ticket = await vaultFs.read("projects/test-project/tickets/ticket-001-implement.md");
      expect(ticket).toContain("commit: c1");
      expect(ticket).toContain("command: npm test");
    });

    it("truncates long output", async () => {
      await createTicket(ctx);
      const result = await evidenceCommand(
        {
          action: "add",
          ticket: "ticket-001",
          command: "npm test",
          output: "x".repeat(5000),
          commit: "c1",
          project: "test-project",
        },
        ctx,
      );

      expect(result.record!.output.endsWith("...[truncated 1000 chars]")).toBe(true);
      expect(result.record!.output.length).toBeLessThan(5000);
    });

    it("fails when HEAD cannot be determined and no commit is given", async () => {
      await createTicket(ctx);
      await expect(
        evidenceCommand(
          {
            action: "add",
            ticket: "ticket-001",
            command: "npm test",
            cwd: vaultRoot,
            project: "test-project",
          },
          ctx,
        ),
      ).rejects.toThrow("Could not determine git HEAD commit");
    });

    it("requires a command", async () => {
      await createTicket(ctx);
      await expect(
        evidenceCommand({ action: "add", ticket: "ticket-001", project: "test-project" }, ctx),
      ).rejects.toThrow("Command required for evidence add");
    });

    it("rejects unknown tickets", async () => {
      await expect(
        evidenceCommand(
          { action: "add", ticket: "ticket-999", command: "npm test", commit: "c1", project: "test-project" },
          ctx,
        ),
      ).rejects.toThrow("Ticket not found: ticket-999");
    });
  });

  describe("list", () => {
    it("reads recorded evidence in order", async () => {
      await createTicket(ctx);
      await evidenceCommand(
        { action: "add", ticket: "ticket-001", command: "npm test", commit: "c1", project: "test-project" },
        ctx,
      );
      await evidenceCommand(
        { action: "add", ticket: "ticket-001", command: "review", commit: "c1", project: "test-project" },
        ctx,
      );

      const result = await evidenceCommand({ action: "list", ticket: "ticket-001", project: "test-project" }, ctx);
      expect(result.count).toBe(2);
      expect(result.evidence!.map((record) => record.command)).toEqual(["npm test", "review"]);
    });

    it("returns an empty list when nothing was recorded", async () => {
      await createTicket(ctx);
      const result = await evidenceCommand({ action: "list", ticket: "ticket-001", project: "test-project" }, ctx);
      expect(result.evidence).toEqual([]);
    });
  });
});
