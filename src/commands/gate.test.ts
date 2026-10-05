import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { specCommand } from "./spec.js";
import { ticketsCommand } from "./tickets.js";
import { evidenceCommand } from "./evidence.js";
import { gateCommand, classifyGateTarget } from "./gate.js";
import { createTestContext } from "../test-helpers.js";
import { createRegistry } from "../core/registry.js";
import type { CommandContext } from "../core/types.js";
import type { VaultFS } from "../lib/vault-fs.js";

async function createFrozenSpec(ctx: CommandContext): Promise<string> {
  const created = await specCommand(
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
  return created.path!;
}

async function createTicket(ctx: CommandContext, requiresReview = false): Promise<void> {
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

describe("classifyGateTarget", () => {
  it("classifies tickets and specs", () => {
    expect(classifyGateTarget("ticket-001")).toBe("ticket");
    expect(classifyGateTarget("projects/p/tickets/ticket-001-x.md")).toBe("ticket");
    expect(classifyGateTarget("001")).toBe("spec");
    expect(classifyGateTarget("001-gates-pipeline")).toBe("spec");
    expect(classifyGateTarget("projects/p/specs/001-x.md")).toBe("spec");
    expect(classifyGateTarget("spec-anything")).toBe("spec");
  });

  it("throws for unknown targets", () => {
    expect(() => classifyGateTarget("whatever")).toThrow("Cannot determine gate target kind");
  });
});

describe("gateCommand", () => {
  let vaultFs: VaultFS;
  let ctx: CommandContext;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ vaultFs, ctx, cleanup } = await createTestContext({ project: "test-project", setupProject: true }));
  });

  afterEach(async () => {
    await cleanup();
  });

  describe("spec gate", () => {
    it("fails while the spec is not frozen", async () => {
      await specCommand(
        {
          action: "create",
          title: "Draft",
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

      const result = await gateCommand({ target: "001", project: "test-project" }, ctx);
      expect(result.pass).toBe(false);
      expect(result.missing).toContain("spec is not frozen (status: draft)");
    });

    it("passes a frozen, gap-free spec", async () => {
      await createFrozenSpec(ctx);
      const result = await gateCommand({ target: "001", project: "test-project" }, ctx);
      expect(result.pass).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.kind).toBe("spec");
    });

    it("fails when a frozen spec was modified", async () => {
      const path = await createFrozenSpec(ctx);
      const content = await vaultFs.read(path);
      await vaultFs.write(path, content.replace("Ship it", "Tampered"));

      const result = await gateCommand({ target: "001", project: "test-project" }, ctx);
      expect(result.pass).toBe(false);
      expect(result.missing).toContain("spec content hash mismatch (modified after freeze)");
    });
  });

  describe("ticket gate", () => {
    it("fails without evidence", async () => {
      await createFrozenSpec(ctx);
      await createTicket(ctx);

      const result = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(result.pass).toBe(false);
      expect(result.missing).toContain("no evidence recorded");
    });

    it("passes with passing evidence at HEAD", async () => {
      await createFrozenSpec(ctx);
      await createTicket(ctx);
      await evidenceCommand(
        { action: "add", ticket: "ticket-001", command: "npm test", exit: 0, commit: "c1", project: "test-project" },
        ctx,
      );

      const result = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(result.pass).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it("fails when evidence is stale", async () => {
      await createFrozenSpec(ctx);
      await createTicket(ctx);
      await evidenceCommand(
        { action: "add", ticket: "ticket-001", command: "npm test", exit: 0, commit: "c1", project: "test-project" },
        ctx,
      );

      const result = await gateCommand({ target: "ticket-001", project: "test-project", head: "c2" }, ctx);
      expect(result.pass).toBe(false);
      expect(result.missing.some((item) => item.startsWith("evidence is stale"))).toBe(true);
    });

    it("fails when the latest evidence failed", async () => {
      await createFrozenSpec(ctx);
      await createTicket(ctx);
      await evidenceCommand(
        { action: "add", ticket: "ticket-001", command: "npm test", exit: 1, commit: "c1", project: "test-project" },
        ctx,
      );

      const result = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(result.pass).toBe(false);
      expect(result.missing).toContain("latest evidence exit 1 (expected 0)");
    });

    it("requires review evidence for review-gated tickets", async () => {
      await createFrozenSpec(ctx);
      await createTicket(ctx, true);
      await evidenceCommand(
        { action: "add", ticket: "ticket-001", command: "npm test", exit: 0, commit: "c1", project: "test-project" },
        ctx,
      );

      const withoutReview = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(withoutReview.pass).toBe(false);
      expect(withoutReview.missing).toContain("requires review: no passing review evidence at HEAD");

      await evidenceCommand(
        { action: "add", ticket: "ticket-001", command: "review:approved", exit: 0, commit: "c1", project: "test-project" },
        ctx,
      );
      const withReview = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(withReview.pass).toBe(true);
    });

    it("fails when the linked spec was modified", async () => {
      const specPath = await createFrozenSpec(ctx);
      await createTicket(ctx);

      const content = await vaultFs.read(specPath);
      await vaultFs.write(specPath, content.replace("Ship it", "Tampered"));

      const result = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(result.pass).toBe(false);
      expect(result.missing).toContain("spec content hash mismatch (modified after freeze)");
      expect(result.missing).toContain("spec changed since ticket creation (spec_hash mismatch)");
    });

    it("throws for unknown tickets", async () => {
      await expect(
        gateCommand({ target: "ticket-999", project: "test-project", head: "c1" }, ctx),
      ).rejects.toThrow("Ticket not found: ticket-999");
    });
  });
});

describe("registry wiring", () => {
  it("registers spec, tickets, evidence, and gate", () => {
    const registry = createRegistry();
    for (const name of ["spec", "tickets", "evidence", "gate"]) {
      expect(registry.has(name), `Missing tool: ${name}`).toBe(true);
      expect(registry.get(name)!.toolDef.inputSchema).toHaveProperty("type", "object");
    }
  });

  it("adapts snake_case arguments", () => {
    const registry = createRegistry();

    expect(registry.get("spec")!.adaptArgs!({ action: "create", allowed_files: ["a"], non_goals: ["b"] })).toEqual({
      action: "create",
      title: undefined,
      goal: undefined,
      nonGoals: ["b"],
      constraints: undefined,
      context: undefined,
      allowedFiles: ["a"],
      forbiddenFiles: undefined,
      acceptance: undefined,
      risks: undefined,
      rollback: undefined,
      spec: undefined,
      project: undefined,
    });

    expect(registry.get("gate")!.adaptArgs!({ target: "ticket-001", head: "c1" })).toEqual({
      target: "ticket-001",
      project: undefined,
      head: "c1",
      cwd: undefined,
    });

    expect(registry.get("evidence")!.adaptArgs!({ action: "add", ticket: "ticket-001", exit: 0 })).toEqual({
      action: "add",
      ticket: "ticket-001",
      command: undefined,
      exit: 0,
      output: undefined,
      commit: undefined,
      ts: undefined,
      cwd: undefined,
      project: undefined,
    });

    expect(
      registry.get("tickets")!.adaptArgs!({
        action: "create",
        spec: "001",
        tickets: [
          {
            title: "T",
            blocked_by: ["ticket-001"],
            requires_review: true,
            acceptance: [{ text: "x", command: "npm test" }],
          },
        ],
      }),
    ).toEqual({
      action: "create",
      spec: "001",
      tickets: [
        {
          title: "T",
          acceptance: [{ text: "x", command: "npm test" }],
          blockedBy: ["ticket-001"],
          requiresReview: true,
        },
      ],
      ticketId: undefined,
      status: undefined,
      project: undefined,
    });
  });
});
