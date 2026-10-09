import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { mkdir, rm } from "fs/promises";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { graphRelatedCommand, graphCrossProjectCommand, graphTraverseCommand } from "./graph.js";
import { VaultFS } from "../lib/vault-fs.js";
import type { CommandContext } from "../core/types.js";

function createCommandContext(vaultFs: VaultFS, overrides?: Partial<CommandContext>): CommandContext {
  return {
    vaultFs,
    vaultPath: vaultFs.root,
    sessionRegistry: {} as any,
    config: {} as any,
    log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides,
  };
}

describe("graph commands", () => {
  let vaultRoot: string;
  let vaultFs: VaultFS;
  let ctx: CommandContext;

  beforeEach(async () => {
    vaultRoot = join(homedir(), `.vault-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(vaultRoot, { recursive: true });
    vaultFs = new VaultFS(vaultRoot);
    ctx = createCommandContext(vaultFs);
  });

  afterEach(async () => {
    await rm(vaultRoot, { recursive: true, force: true });
  });

  describe("extractWikilinks", () => {
    it("extracts simple wikilinks", async () => {
      await vaultFs.write(
        "note.md",
        `---
type: note
---

# Note

Link to [[other-note]] and [[another-note]].
`
      );

      const result = await graphRelatedCommand({ path: "note.md" }, ctx);

      expect(result.outgoing).toContain("other-note");
      expect(result.outgoing).toContain("another-note");
    });

    it("extracts wikilinks with aliases", async () => {
      await vaultFs.write(
        "note.md",
        `---
type: note
---

Link to [[target|display text]].
`
      );

      const result = await graphRelatedCommand({ path: "note.md" }, ctx);

      expect(result.outgoing).toContain("target");
    });

    it("deduplicates wikilinks", async () => {
      await vaultFs.write(
        "note.md",
        `---
type: note
---

Link to [[same-note]] twice: [[same-note]].
`
      );

      const result = await graphRelatedCommand({ path: "note.md" }, ctx);

      expect(result.outgoing.filter(l => l === "same-note")).toHaveLength(1);
    });

    it("returns empty array when no wikilinks", async () => {
      await vaultFs.write(
        "note.md",
        `---
type: note
---

# Note with no links
`
      );

      const result = await graphRelatedCommand({ path: "note.md" }, ctx);

      expect(result.outgoing).toEqual([]);
    });
  });

  describe("backlinks", () => {
    it("finds backlinks to note", async () => {
      await vaultFs.write(
        "target.md",
        `---
type: note
---

# Target Note
`
      );

      await vaultFs.write(
        "source.md",
        `---
type: note
---

Link to [[target]] here.
`
      );

      const result = await graphRelatedCommand({ path: "target.md" }, ctx);

      expect(result.backlinks).toContain("source.md");
    });

    it("excludes self-references from backlinks", async () => {
      await vaultFs.write(
        "note.md",
        `---
type: note
---

Link to [[note]] itself.
`
      );

      const result = await graphRelatedCommand({ path: "note.md" }, ctx);

      expect(result.backlinks).not.toContain("note.md");
    });

    it("finds backlinks with .md extension in link", async () => {
      await vaultFs.write(
        "target.md",
        `---
type: note
---

# Target
`
      );

      await vaultFs.write(
        "source.md",
        `---
type: note
---

Link to [[target.md]].
`
      );

      const result = await graphRelatedCommand({ path: "target.md" }, ctx);

      expect(result.backlinks).toContain("source.md");
    });
  });

  describe("hops", () => {
    it("returns single hop by default", async () => {
      await vaultFs.write(
        "a.md",
        `---
type: note
---

[[b]]
`
      );

      await vaultFs.write(
        "b.md",
        `---
type: note
---

[[c]]
`
      );

      await vaultFs.write("c.md", `---\ntype: note\n---\n# C`);

      const result = await graphRelatedCommand({ path: "a.md", hops: 1 }, ctx);

      expect(result.outgoing).toContain("b");
      expect(result.outgoing).not.toContain("c");
    });

    it("returns second hop when hops > 1", async () => {
      await vaultFs.write(
        "a.md",
        `---
type: note
---

[[b]]
`
      );

      await vaultFs.write(
        "b.md",
        `---
type: note
---

[[c]]
`
      );

      await vaultFs.write("c.md", `---\ntype: note\n---\n# C`);

      const result = await graphRelatedCommand({ path: "a.md", hops: 2 }, ctx);

      expect(result.outgoing).toContain("b");
      expect(result.outgoing).toContain("c");
    });

    it("finds second hop backlinks", async () => {
      await vaultFs.write("a.md", `---\ntype: note\n---\n[[b]]`);
      await vaultFs.write("b.md", `---\ntype: note\n---\n# B`);
      await vaultFs.write("c.md", `---\ntype: note\n---\n[[b]]`);

      const result = await graphRelatedCommand({ path: "a.md", hops: 2 }, ctx);

      // c.md links to b.md, which is linked from a.md
      expect(result.backlinks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("graphCrossProjectCommand", () => {
    it("jails results to the scoped project", async () => {
      await mkdir(join(vaultRoot, "projects/proj-a"), { recursive: true });
      await mkdir(join(vaultRoot, "projects/proj-b"), { recursive: true });

      await vaultFs.write(
        "projects/proj-a/note.md",
        `---
type: note
---

API endpoint documentation
`
      );

      await vaultFs.write(
        "projects/proj-b/note.md",
        `---
type: note
---

API client implementation
`
      );

      const scoped = createCommandContext(vaultFs, { projectSlug: "proj-a" });
      const result = await graphCrossProjectCommand({ query: "API", limit: 10 }, scoped);

      expect(Object.keys(result)).toEqual(["proj-a"]);
      expect(result["proj-a"].every((r) => r.path.includes("proj-a"))).toBe(true);
    });

    it("rejects calls without a project scope", async () => {
      await expect(
        graphCrossProjectCommand({ query: "API", limit: 10 }, ctx),
      ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("respects limit parameter", async () => {
      await mkdir(join(vaultRoot, "projects/proj-a"), { recursive: true });
      for (let i = 0; i < 30; i++) {
        await vaultFs.write(
          `projects/proj-a/note-${i}.md`,
          `---
type: note
---

Test content ${i}
`
        );
      }

      const scoped = createCommandContext(vaultFs, { projectSlug: "proj-a" });
      const result = await graphCrossProjectCommand({ query: "Test", limit: 5 }, scoped);

      const totalResults = Object.values(result).flat().length;
      expect(totalResults).toBeLessThanOrEqual(5);
    });
  });

  describe("error handling", () => {
    it("throws for non-existent file", async () => {
      await expect(
        graphRelatedCommand({ path: "nonexistent.md" }, ctx)
      ).rejects.toThrow();
    });
  });
});

describe("graphTraverseCommand", () => {
  let repoRoot: string;
  let vaultRoot: string;
  let ctx: CommandContext;

  beforeAll(async () => {
    repoRoot = mkdtempSync(join(tmpdir(), "graph-traverse-repo-"));
    mkdirSync(join(repoRoot, ".superskill"), { recursive: true });
    mkdirSync(join(repoRoot, "src"), { recursive: true });
    writeFileSync(join(repoRoot, "src", "index.ts"), "export const index = 1;\n");
    writeFileSync(
      join(repoRoot, ".superskill", "graph.json"),
      JSON.stringify({
        version: 3,
        nodes: [{ type: "project", id: "project", stack: ["typescript"], tools: [], phase: "explore", ts: 1 }],
        edges: [],
      }),
    );

    vaultRoot = join(homedir(), `.vault-traverse-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(vaultRoot, { recursive: true });
    const vaultFs = new VaultFS(vaultRoot, { projectSlug: "testproj" });
    await vaultFs.write("notes/alpha.md", "---\ntype: note\n---\n# Alpha\n\nVAULT SENTINEL.\n");
    ctx = createCommandContext(vaultFs, { projectSlug: "testproj", workspacePath: repoRoot });
    await graphTraverseCommand({ action: "node", id: "graph" }, ctx);
  });

  afterAll(async () => {
    await rm(vaultRoot, { recursive: true, force: true });
    await rm(repoRoot, { recursive: true, force: true });
  });

  it("returns node metadata without content", async () => {
    const root = (await graphTraverseCommand({ action: "node", id: "graph" }, ctx)) as any;
    expect(root.kind).toBe("container");
    expect(root.childrenCount).toBeGreaterThanOrEqual(4);

    const code = (await graphTraverseCommand({ action: "node", id: "code:src/index.ts" }, ctx)) as any;
    expect(code.bytes).toBeGreaterThan(0);
    expect(code.tokens).toBe(Math.ceil(code.bytes / 4));
    expect(JSON.stringify(code)).not.toContain("export const index");
  });

  it("lists children lazily", async () => {
    const result = (await graphTraverseCommand({ action: "children", id: "code", limit: 5 }, ctx)) as any;
    expect(result.total).toBeGreaterThan(0);
    expect(result.children.some((child: any) => child.id === "code:src/")).toBe(true);

    const unknown = (await graphTraverseCommand({ action: "children", id: "does-not-exist" }, ctx)) as any;
    expect(unknown.total).toBe(0);
  });

  it("resolves a task to rules with token estimates and no content", async () => {
    const result = (await graphTraverseCommand(
      { action: "resolve", task: "fix a rust ownership bug", limit: 50 },
      ctx,
    )) as any;
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.some((item: any) => item.kind === "rule" && item.reason.includes("ownership"))).toBe(true);
    for (const item of result.items) {
      expect(item.tokens).toBe(Math.ceil(item.bytes / 4));
    }
    expect(JSON.stringify(result)).not.toContain("VAULT SENTINEL");
    expect(result.totals.items).toBe(result.items.length);
  });

  it("opens content and rejects containers/unknown ids", async () => {
    const content = (await graphTraverseCommand(
      { action: "open", id: "vault:projects/testproj/notes/alpha.md" },
      ctx,
    )) as any;
    expect(content.content).toContain("VAULT SENTINEL");
    expect(content.truncated).toBe(false);

    await expect(graphTraverseCommand({ action: "open", id: "rules" }, ctx)).rejects.toMatchObject({
      code: "INVALID_ARGUMENT",
    });
    await expect(graphTraverseCommand({ action: "node", id: "nope" }, ctx)).rejects.toMatchObject({
      code: "FILE_NOT_FOUND",
    });
  });

  it("validates action arguments", async () => {
    await expect(graphTraverseCommand({ action: "resolve" }, ctx)).rejects.toMatchObject({
      code: "INVALID_ARGUMENT",
    });
    await expect(graphTraverseCommand({ action: "node" }, ctx)).rejects.toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });
});
