import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { specCommand } from "./spec.js";
import { ticketsCommand } from "./tickets.js";
import { evidenceCommand } from "./evidence.js";
import { gateCommand } from "./gate.js";
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

  it("keeps all concurrent evidence references alongside a ticket status change", async () => {
    await createTicket(ctx);
    await Promise.all([
      ...Array.from({ length: 8 }, (_, i) => evidenceCommand({ action: "add", ticket: "ticket-001", command: `check-${i}`, commit: "c1", project: "test-project" }, ctx)),
      ticketsCommand({ action: "update", ticketId: "ticket-001", status: "in-progress", project: "test-project" }, ctx),
    ]);
    const ticket = await vaultFs.read("projects/test-project/tickets/ticket-001-implement.md");
    expect(ticket).toContain("status: in-progress");
    for (let i = 0; i < 8; i++) expect(ticket).toContain(`command: check-${i}`);
    const evidence = await evidenceCommand({ action: "list", ticket: "ticket-001", project: "test-project" }, ctx);
    expect(evidence.count).toBe(8);
  });

  it("cannot pass a ticket gate using another ticket's evidence", async () => {
    await createTicket(ctx);
    await vaultFs.write("projects/test-project/evidence/ticket-001.jsonl", `${JSON.stringify({ ticket: "ticket-999", command: "npm test", exit: 0, output: "ok", commit: "c1", ts: "2026-01-01T00:00:00.000Z" })}\n`);
    await expect(gateCommand({ target: "ticket-001", head: "c1", project: "test-project" }, ctx)).rejects.toThrow(/Malformed evidence/i);
  });

  describe("add", () => {
    it.each([null, "0", "", false, Number.NaN, Infinity, -Infinity, 0.5])("rejects a supplied non-integer exit instead of recording success: %j", async (exit) => {
      await createTicket(ctx);
      const path = "projects/test-project/tickets/ticket-001-implement.md";
      const before = await vaultFs.read(path);
      await expect(evidenceCommand({ action: "add", ticket: "ticket-001", command: "npm test", commit: "c1", exit: exit as never, project: "test-project" }, ctx)).rejects.toThrow(/exit.*finite integer/i);
      expect(await vaultFs.exists("projects/test-project/evidence/ticket-001.jsonl")).toBe(false);
      expect(await vaultFs.read(path)).toBe(before);
    });

    it("keeps the default exit only when it was omitted", async () => {
      await createTicket(ctx);
      const result = await evidenceCommand({ action: "add", ticket: "ticket-001", command: "npm test", commit: "c1", project: "test-project" }, ctx);
      expect(result.record!.exit).toBe(0);
    });

    it.each(["", "not-a-date", null, 7])("rejects invalid supplied timestamps: %j", async (ts) => {
      await createTicket(ctx);
      await expect(evidenceCommand({ action: "add", ticket: "ticket-001", command: "npm test", commit: "c1", ts: ts as never, project: "test-project" }, ctx)).rejects.toThrow(/timestamp/i);
      expect(await vaultFs.exists("projects/test-project/evidence/ticket-001.jsonl")).toBe(false);
    });

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
    it.each([-1, 1.5, Number.NaN, Infinity, 501, "2", null])("rejects an invalid direct list limit: %j", async (limit) => {
      await expect(evidenceCommand({ action: "list", ticket: "ticket-001", project: "test-project", limit: limit as never }, ctx)).rejects.toThrow(/limit/i);
    });

    it("bounds direct evidence lists to 50 by default and permits zero", async () => {
      await createTicket(ctx);
      const records = Array.from({ length: 51 }, (_, index) => JSON.stringify({ ticket: "ticket-001", command: `check-${index}`, exit: 0, output: "ok", commit: "c1", ts: "2026-01-01T00:00:00.000Z" }));
      await vaultFs.write("projects/test-project/evidence/ticket-001.jsonl", records.join("\n") + "\n");
      expect((await evidenceCommand({ action: "list", ticket: "ticket-001", project: "test-project" }, ctx)).count).toBe(50);
      expect((await evidenceCommand({ action: "list", ticket: "ticket-001", project: "test-project", limit: 0 }, ctx)).count).toBe(0);
    });

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

    it("limits listed evidence after existing order", async () => {
      await createTicket(ctx);
      for (const command of ["first", "second", "third"]) {
        await evidenceCommand(
          { action: "add", ticket: "ticket-001", command, commit: "c1", project: "test-project" },
          ctx,
        );
      }

      const limited = await evidenceCommand(
        { action: "list", ticket: "ticket-001", project: "test-project", limit: 2 },
        ctx,
      );
      expect(limited.evidence!.map((record) => record.command)).toEqual(["first", "second"]);
      expect(limited.count).toBe(2);

      const all = await evidenceCommand({ action: "list", ticket: "ticket-001", project: "test-project" }, ctx);
      expect(all.count).toBe(3);
    });

    it("returns an empty list when nothing was recorded", async () => {
      await createTicket(ctx);
      const result = await evidenceCommand({ action: "list", ticket: "ticket-001", project: "test-project" }, ctx);
      expect(result.evidence).toEqual([]);
    });
  });
});
