import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { specCommand, type SpecCommandArgs } from "./spec.js";
import { createTestContext } from "../test-helpers.js";
import type { CommandContext } from "../core/types.js";
import type { VaultFS } from "../lib/vault-fs.js";

function fullSpecArgs(): SpecCommandArgs {
  return {
    action: "create",
    title: "Gates Pipeline",
    goal: "Ship the gates pipeline",
    nonGoals: ["No UI"],
    constraints: ["Node 22"],
    context: "Agents drift without machine-checkable intent.",
    allowedFiles: ["src/lib/gates/**"],
    forbiddenFiles: ["src/rules/**"],
    acceptance: [
      { text: "tsc is clean", command: "npx tsc --noEmit" },
      { text: "Looks right", manual: "visual inspection" },
    ],
    risks: ["Over-strict gates"],
    rollback: "Revert the commit.",
    project: "test-project",
  };
}

describe("specCommand", () => {
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
    it("creates a draft spec with frontmatter and fixed headers", async () => {
      const result = await specCommand(fullSpecArgs(), ctx);

      expect(result.spec_id).toBe("001");
      expect(result.path).toBe("projects/test-project/specs/001-gates-pipeline.md");
      expect(result.status).toBe("draft");
      expect(result.gaps).toEqual([]);

      const content = await vaultFs.read(result.path!);
      expect(content).toContain("type: spec");
      expect(content).toContain("status: draft");
      expect(content).toContain("hash:");
      expect(content).toContain("# Gates Pipeline");
      expect(content).toContain("## Goal");
      expect(content).toContain("Ship the gates pipeline");
    });

    it("increments spec numbers", async () => {
      const first = await specCommand(fullSpecArgs(), ctx);
      const second = await specCommand({ ...fullSpecArgs(), title: "Second Spec" }, ctx);
      expect(first.spec_id).toBe("001");
      expect(second.spec_id).toBe("002");
    });

    it("allows a partial skeleton and reports gaps", async () => {
      const result = await specCommand({ action: "create", title: "Partial", project: "test-project" }, ctx);
      const fields = result.gaps!.map((gap) => gap.field);
      expect(fields).toContain("goal");
      expect(fields).toContain("acceptance");
      expect(fields).toContain("rollback");
    });

    it("requires a title", async () => {
      await expect(specCommand({ action: "create", project: "test-project" }, ctx)).rejects.toThrow(
        "Title required for spec create",
      );
    });

    it("rejects acceptance items without a runner", async () => {
      await expect(
        specCommand(
          { action: "create", title: "Bad", acceptance: [{ text: "no runner" }], project: "test-project" },
          ctx,
        ),
      ).rejects.toThrow("needs an executable command");
    });
  });

  describe("status", () => {
    it("reports gaps and hash state", async () => {
      await specCommand(fullSpecArgs(), ctx);
      const result = await specCommand({ action: "status", spec: "001", project: "test-project" }, ctx);

      expect(result.status).toBe("draft");
      expect(result.valid).toBe(true);
      expect(result.gaps).toEqual([]);
      expect(result.hash_matches).toBe(true);
      expect(result.frozen).toBe(false);
    });

    it("reports gaps for a partial spec", async () => {
      await specCommand({ action: "create", title: "Partial", project: "test-project" }, ctx);
      const result = await specCommand({ action: "status", spec: "001", project: "test-project" }, ctx);
      expect(result.gaps!.length).toBeGreaterThan(0);
    });

    it("throws for unknown specs", async () => {
      await expect(specCommand({ action: "status", spec: "999", project: "test-project" }, ctx)).rejects.toThrow(
        "Spec not found: 999",
      );
    });
  });

  describe("approve and freeze", () => {
    it("blocks approval while gaps remain", async () => {
      await specCommand({ action: "create", title: "Partial", project: "test-project" }, ctx);
      await expect(specCommand({ action: "approve", spec: "001", project: "test-project" }, ctx)).rejects.toThrow(
        "Spec has unresolved gaps",
      );
    });

    it("approves a gap-free spec and freezes it", async () => {
      await specCommand(fullSpecArgs(), ctx);

      const approved = await specCommand({ action: "approve", spec: "001", project: "test-project" }, ctx);
      expect(approved.status).toBe("approved");

      const frozen = await specCommand({ action: "freeze", spec: "001", project: "test-project" }, ctx);
      expect(frozen.status).toBe("frozen");
      expect(frozen.already_frozen).toBe(false);

      const status = await specCommand({ action: "status", spec: "001", project: "test-project" }, ctx);
      expect(status.status).toBe("frozen");
      expect(status.frozen).toBe(true);
      expect(status.hash_matches).toBe(true);
    });

    it("refuses to freeze an unapproved spec", async () => {
      await specCommand(fullSpecArgs(), ctx);
      await expect(specCommand({ action: "freeze", spec: "001", project: "test-project" }, ctx)).rejects.toThrow(
        "Spec must be approved before freezing",
      );
    });

    it("treats a repeated freeze as idempotent", async () => {
      await specCommand(fullSpecArgs(), ctx);
      await specCommand({ action: "approve", spec: "001", project: "test-project" }, ctx);
      await specCommand({ action: "freeze", spec: "001", project: "test-project" }, ctx);

      const again = await specCommand({ action: "freeze", spec: "001", project: "test-project" }, ctx);
      expect(again.already_frozen).toBe(true);
    });

    it("makes frozen specs immutable to approve", async () => {
      await specCommand(fullSpecArgs(), ctx);
      await specCommand({ action: "approve", spec: "001", project: "test-project" }, ctx);
      await specCommand({ action: "freeze", spec: "001", project: "test-project" }, ctx);

      await expect(specCommand({ action: "approve", spec: "001", project: "test-project" }, ctx)).rejects.toThrow(
        "frozen and immutable",
      );
    });

    it("rejects freezing after the approved content changed", async () => {
      const created = await specCommand(fullSpecArgs(), ctx);
      await specCommand({ action: "approve", spec: "001", project: "test-project" }, ctx);

      const content = await vaultFs.read(created.path!);
      await vaultFs.write(created.path!, content.replace("Ship the gates pipeline", "Ship the gates pipeline NOW"));

      await expect(specCommand({ action: "freeze", spec: "001", project: "test-project" }, ctx)).rejects.toThrow(
        "changed after approval",
      );

      await specCommand({ action: "approve", spec: "001", project: "test-project" }, ctx);
      const frozen = await specCommand({ action: "freeze", spec: "001", project: "test-project" }, ctx);
      expect(frozen.status).toBe("frozen");
    });

    it("detects edits to a frozen spec", async () => {
      const created = await specCommand(fullSpecArgs(), ctx);
      await specCommand({ action: "approve", spec: "001", project: "test-project" }, ctx);
      await specCommand({ action: "freeze", spec: "001", project: "test-project" }, ctx);

      const content = await vaultFs.read(created.path!);
      await vaultFs.write(created.path!, content.replace("Ship the gates pipeline", "Tampered"));

      const status = await specCommand({ action: "status", spec: "001", project: "test-project" }, ctx);
      expect(status.hash_matches).toBe(false);

      await expect(specCommand({ action: "freeze", spec: "001", project: "test-project" }, ctx)).rejects.toThrow(
        "was modified",
      );
    });
  });

  describe("list", () => {
    it("lists specs sorted by id", async () => {
      await specCommand(fullSpecArgs(), ctx);
      await specCommand({ ...fullSpecArgs(), title: "Second Spec" }, ctx);

      const result = await specCommand({ action: "list", project: "test-project" }, ctx);
      expect(result.specs).toHaveLength(2);
      expect(result.specs!.map((spec) => spec.spec_id)).toEqual(["001", "002"]);
      expect(result.specs![0].title).toBe("Gates Pipeline");
    });

    it("returns an empty list when there are no specs", async () => {
      const result = await specCommand({ action: "list", project: "test-project" }, ctx);
      expect(result.specs).toEqual([]);
    });
  });
});
