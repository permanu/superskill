import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { specCommand } from "./spec.js";
import { ticketsCommand } from "./tickets.js";
import { evidenceCommand } from "./evidence.js";
import { gateCommand, classifyGateTarget } from "./gate.js";
import { createTestContext } from "../test-helpers.js";
import { createRegistry } from "../core/registry.js";
import type { CommandContext } from "../core/types.js";
import type { VaultFS } from "../lib/vault-fs.js";
import { parseFrontmatter, serializeFrontmatter } from "../lib/frontmatter.js";
import { hashSpec, parseSpec, type AcceptanceInput } from "../lib/gates/spec.js";

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

async function createTicket(ctx: CommandContext, requiresReview = false, acceptance: AcceptanceInput[] = [{ text: "tests pass", command: "npm test" }]): Promise<string> {
  const created = await ticketsCommand(
    {
      action: "create",
      spec: "001",
      tickets: [{ title: "Implement", acceptance, requiresReview }],
      project: "test-project",
    },
    ctx,
  );
  return created.created![0].path;
}

async function recordEvidence(ctx: CommandContext, command: string, exit = 0, commit = "c1"): Promise<void> {
  await evidenceCommand({ action: "add", ticket: "ticket-001", command, exit, commit, project: "test-project" }, ctx);
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

    it.each(["echo verified", "npm test -- unrelated", "npm test && npm run lint"])("does not let unrelated successful evidence satisfy required commands: %s", async (command) => {
      await createFrozenSpec(ctx);
      await createTicket(ctx, false, [
        { text: "tests pass", command: "npm test" },
        { text: "lint passes", command: "npm run lint" },
      ]);
      await recordEvidence(ctx, command);

      const result = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(result.pass).toBe(false);
      expect(result.missing).toContain('acceptance A1: no evidence for command "npm test"');
      expect(result.missing).toContain('acceptance A2: no evidence for command "npm run lint"');
    });

    it("requires evidence for every explicit ticket command, not just one or the latest command", async () => {
      await createFrozenSpec(ctx);
      await createTicket(ctx, false, [
        { text: "tests pass", command: "npm test" },
        { text: "lint passes", command: "npm run lint" },
      ]);
      await recordEvidence(ctx, "npm test");
      const incomplete = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(incomplete.pass).toBe(false);
      expect(incomplete.missing).toEqual(['acceptance A2: no evidence for command "npm run lint"']);

      await recordEvidence(ctx, "npm run lint");
      await recordEvidence(ctx, "echo additional check");
      const complete = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(complete.pass).toBe(true);
      expect(complete.missing).toEqual([]);
    });

    it("checks each command's commit even when the latest unrelated evidence is at HEAD", async () => {
      await createFrozenSpec(ctx);
      await createTicket(ctx);
      await recordEvidence(ctx, "npm test", 0, "old-commit");
      await recordEvidence(ctx, "echo verified");

      const result = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(result.pass).toBe(false);
      expect(result.missing).toContain('acceptance A1: evidence for "npm test" is stale: at old-commit, HEAD is c1');
    });

    it("does not let an older command success mask a newer failure followed by an unrelated success", async () => {
      await createFrozenSpec(ctx);
      await createTicket(ctx);
      await recordEvidence(ctx, "npm test");
      await recordEvidence(ctx, "npm test", 1);
      await recordEvidence(ctx, "echo verified");

      const failed = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(failed.pass).toBe(false);
      expect(failed.missing).toContain('acceptance A1: latest evidence for "npm test" exit 1 (expected 0)');

      await recordEvidence(ctx, "npm test");
      const recovered = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(recovered.pass).toBe(true);
    });

    it("keeps the latest overall failure blocking even when all required commands previously passed", async () => {
      await createFrozenSpec(ctx);
      await createTicket(ctx);
      await recordEvidence(ctx, "npm test");
      await recordEvidence(ctx, "additional check", 1);

      const result = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(result.pass).toBe(false);
      expect(result.missing).toEqual(["latest evidence exit 1 (expected 0)"]);
    });

    it("allows one successful command to support multiple criteria that explicitly name that same command", async () => {
      await createFrozenSpec(ctx);
      await createTicket(ctx, false, [
        { text: "unit tests pass", command: "npm test" },
        { text: "integration tests pass", command: " npm test " },
      ]);
      await recordEvidence(ctx, " npm test ");
      expect((await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx)).pass).toBe(true);
    });

    it("preserves mixed command and free-text manual criteria without treating manual reasons as commands", async () => {
      await createFrozenSpec(ctx);
      await createTicket(ctx, false, [
        { text: "tests pass", command: "npm test" },
        { text: "copy matches the design", manual: "Human inspection of the signed-off design" },
      ]);
      await recordEvidence(ctx, "npm test");
      const result = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(result.pass).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it("preserves manual-only review workflows without inventing an executable acceptance command", async () => {
      await createFrozenSpec(ctx);
      await createTicket(ctx, true, [{ text: "copy reviewed", manual: "Design review with human eyes" }]);
      await recordEvidence(ctx, "review:approved");
      const result = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(result.pass).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it("cannot treat command and review evidence as current when HEAD cannot be determined", async () => {
      await createFrozenSpec(ctx);
      await createTicket(ctx, true);
      await recordEvidence(ctx, "npm test");
      await recordEvidence(ctx, "review:approved");

      const result = await gateCommand({ target: "ticket-001", project: "test-project", cwd: ctx.vaultPath }, ctx);
      expect(result.pass).toBe(false);
      expect(result.details.head).toBeNull();
      expect(result.missing).toContain("could not determine HEAD commit for evidence check");
      expect(result.missing).toContain("requires review: no passing review evidence at HEAD");
    });

    it.each([undefined, "", " ", null])("cannot pass without a recorded spec_hash despite valid evidence: %j", async (hash) => {
      await createFrozenSpec(ctx);
      const path = await createTicket(ctx);
      await recordEvidence(ctx, "npm test");
      await vaultFs.update(path, (current) => {
        const { data, content } = parseFrontmatter(current);
        if (hash === undefined) delete data.spec_hash;
        else data.spec_hash = hash;
        return serializeFrontmatter(data, content);
      });

      const result = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(result.pass).toBe(false);
      expect(result.missing).toEqual(["ticket has no spec_hash"]);
    });

    it("cannot pass with a changed ticket spec_hash despite valid evidence", async () => {
      await createFrozenSpec(ctx);
      const path = await createTicket(ctx);
      await recordEvidence(ctx, "npm test");
      await vaultFs.update(path, (current) => {
        const { data, content } = parseFrontmatter(current);
        return serializeFrontmatter({ ...data, spec_hash: "0".repeat(64) }, content);
      });

      const result = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(result.pass).toBe(false);
      expect(result.missing).toEqual(["spec changed since ticket creation (spec_hash mismatch)"]);
    });

    it("rejects changed spec content even when its own frozen hash was updated to match", async () => {
      const specPath = await createFrozenSpec(ctx);
      await createTicket(ctx);
      await recordEvidence(ctx, "npm test");
      await vaultFs.update(specPath, (current) => {
        const { data, content } = parseFrontmatter(current);
        const body = content.replace("Ship it", "Revised goal");
        return serializeFrontmatter({ ...data, hash: hashSpec(parseSpec(body)) }, body);
      });

      expect((await gateCommand({ target: "001", project: "test-project" }, ctx)).pass).toBe(true);
      const result = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(result.pass).toBe(false);
      expect(result.missing).toEqual(["spec changed since ticket creation (spec_hash mismatch)"]);
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

    it("does not reuse an older successful review after a newer failed review", async () => {
      await createFrozenSpec(ctx);
      await createTicket(ctx, true);
      await recordEvidence(ctx, "npm test");
      await recordEvidence(ctx, "review:approved");
      await recordEvidence(ctx, "review:changes-requested", 1);
      await recordEvidence(ctx, "npm test");

      const failed = await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx);
      expect(failed.pass).toBe(false);
      expect(failed.missing).toEqual(["requires review: no passing review evidence at HEAD"]);

      await recordEvidence(ctx, "review approved");
      expect((await gateCommand({ target: "ticket-001", project: "test-project", head: "c1" }, ctx)).pass).toBe(true);
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
