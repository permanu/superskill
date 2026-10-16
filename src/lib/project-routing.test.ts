// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import { symlink } from "node:fs/promises";
import { createTestContext } from "../test-helpers.js";
import { bankingApplies, loadProjectRouting } from "./project-routing.js";
import { VaultFS } from "./vault-fs.js";

describe("project routing metadata", () => {
  let fixture: Awaited<ReturnType<typeof createTestContext>>;
  beforeEach(async () => { fixture = await createTestContext({ project: "general" }); });
  afterEach(async () => { await fixture.cleanup(); });

  it("does not infer a domain from body prose or another project", async () => {
    await fixture.vaultFs.write("projects/bank/context.md", "---\nrouting:\n  domains: [banking]\n---\nBank context");
    await fixture.vaultFs.write("projects/general/context.md", "# General-purpose tool\nCan review banking projects.");
    expect(await loadProjectRouting(fixture.ctx)).toEqual({ domains: [] });
  });

  it("reads current-project frontmatter on each activation without returning its body", async () => {
    const path = "projects/general/context.md";
    await fixture.vaultFs.write(path, "---\nrouting:\n  domains: [banking, banking]\n---\nprivate-context-canary");
    expect(await loadProjectRouting(fixture.ctx)).toEqual({ domains: ["banking"] });
    await fixture.vaultFs.write(path, "---\nrouting:\n  domains: []\n---\nprivate-context-canary");
    expect(await loadProjectRouting(fixture.ctx)).toEqual({ domains: [] });
  });

  it("defaults to general-purpose routing for absent context or unmapped scope", async () => {
    expect(await loadProjectRouting(fixture.ctx)).toEqual({ domains: [] });
    expect(await loadProjectRouting({ ...fixture.ctx, projectSlug: null })).toEqual({ domains: [] });
  });

  it("refuses cross-project context symlinks", async () => {
    await fixture.vaultFs.write("projects/bank/context.md", "---\nrouting:\n  domains: [banking]\n---\nprivate-context-canary");
    await symlink(join(fixture.vaultRoot, "projects/bank/context.md"), join(fixture.vaultRoot, "projects/general/context.md"));
    await expect(loadProjectRouting(fixture.ctx)).rejects.toThrow("could not be read safely");
  });

  it("rejects a context whose declared project differs from its vault jail", async () => {
    await expect(loadProjectRouting({ ...fixture.ctx, vaultFs: new VaultFS(fixture.vaultRoot, { projectSlug: "other" }) })).rejects.toThrow("does not match the vault scope");
  });

  it.each(["routing: banking", "routing:\n  domains: banking", "routing:\n  domains: [../banking]", `routing:\n  domains: [${"banking,".repeat(17)}banking]`])("rejects invalid metadata without echoing it", async header => {
    await fixture.vaultFs.write("projects/general/context.md", `---\n${header}\n---\nprivate-context-canary`);
    await expect(loadProjectRouting(fixture.ctx)).rejects.toThrow("Invalid project routing metadata");
  });

  it("bounds frontmatter parsing", async () => {
    await fixture.vaultFs.write("projects/general/context.md", `---\nsummary: ${"x".repeat(17000)}\n---\n`);
    await expect(loadProjectRouting(fixture.ctx)).rejects.toThrow("16384");
  });
});

describe("banking applicability", () => {
  it.each(["fix a typo", "implement ecommerce payments", "render a river bank", "parse financial CSV", "add ledger reconciliation", "this is not a banking project", "build a non-banking application"])("keeps general tasks lazy: %s", task => {
    expect(bankingApplies(task)).toBe(false);
  });
  it.each(["review banking authorization", "audit Indian banks", "implement bank payments", "review DORA controls", "load security/banking"])("allows explicit task scope: %s", task => {
    expect(bankingApplies(task)).toBe(true);
  });
  it("uses explicit project context but avoids unrelated documentation work", () => {
    expect(bankingApplies("review this handler", { domains: ["banking"] })).toBe(true);
    expect(bankingApplies("fix a typo", { domains: ["banking"] })).toBe(false);
    expect(bankingApplies("update installation instructions", { domains: ["banking"], files: ["README.md"] })).toBe(false);
    expect(bankingApplies("review security requirements", { domains: ["banking"], files: ["requirements.md"] })).toBe(true);
  });
});
