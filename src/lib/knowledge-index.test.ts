import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  KnowledgeIndex,
  extractKnowledgeLinks,
  rebuildProjectIndex,
} from "./knowledge-index.js";

describe("extractKnowledgeLinks", () => {
  it("reads related frontmatter and wikilinks", () => {
    const links = extractKnowledgeLinks(
      { related: ["projects/p/adr.md", "auth"] },
      "See [[sessions/2026-01-01]] and [[auth]].",
    );
    expect(links).toEqual(expect.arrayContaining(["projects/p/adr.md", "auth", "sessions/2026-01-01"]));
  });
});

describe("KnowledgeIndex", () => {
  let dir: string;
  let index: KnowledgeIndex;

  beforeEach(async () => {
    dir = join(tmpdir(), `ki-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(dir, { recursive: true });
    index = KnowledgeIndex.open(join(dir, "index.sqlite"));
  });

  afterEach(() => {
    index.close();
    return rm(dir, { recursive: true, force: true });
  });

  it("treats hyphenated queries as tokens, not FTS operators", () => {
    index.upsert({
      path: "projects/p/n.md",
      type: "note",
      title: "N",
      body: "unique-needle-alpha in the body",
      related: [],
    });
    expect(index.search("unique-needle", 10).map((h) => h.path)).toContain("projects/p/n.md");
    expect(index.search("zzz-nonexistent-xyzzy", 10)).toEqual([]);
  });

  it("ranks stemmed FTS matches (authorize ~ authorization)", () => {
    index.upsert({
      path: "projects/p/security.md",
      type: "adr",
      title: "Authz",
      body: "Tenant authorization on every mutating endpoint.",
      related: [],
    });
    const hits = index.search("authorize", 10);
    expect(hits.map((h) => h.path)).toContain("projects/p/security.md");
  });

  it("walks related edges for two hops", () => {
    index.upsert({
      path: "projects/p/a.md",
      type: "note",
      title: "A",
      body: "root",
      related: ["projects/p/b.md"],
    });
    index.upsert({
      path: "projects/p/b.md",
      type: "note",
      title: "B",
      body: "mid",
      related: ["projects/p/c.md"],
    });
    index.upsert({
      path: "projects/p/c.md",
      type: "note",
      title: "C",
      body: "leaf",
      related: [],
    });
    expect(index.neighbors("projects/p/a.md", 1)).toContain("projects/p/b.md");
    expect(index.neighbors("projects/p/a.md", 1)).not.toContain("projects/p/c.md");
    expect(index.neighbors("projects/p/a.md", 2)).toEqual(
      expect.arrayContaining(["projects/p/b.md", "projects/p/c.md"]),
    );
  });

  it("rebuilds from markdown on disk", async () => {
    const vault = join(dir, "vault");
    const proj = join(vault, "projects", "alpha");
    await mkdir(proj, { recursive: true });
    await writeFile(
      join(proj, "one.md"),
      "---\ntype: adr\nrelated:\n  - two.md\n---\n\n# Decision\n\nUse parameterized queries.\n",
    );
    await writeFile(
      join(proj, "two.md"),
      "---\ntype: learning\n---\n\n# Learning\n\nSee [[one]].\n",
    );
    const rebuilt = rebuildProjectIndex(vault, "alpha");
    expect(rebuilt.notes).toBe(2);
    const idx = KnowledgeIndex.openForProject(vault, "alpha");
    try {
      expect(idx.search("parameterized", 5)[0].path).toContain("one.md");
      expect(idx.neighbors("projects/alpha/one.md", 1).some((p) => p.includes("two"))).toBe(true);
    } finally {
      idx.close();
    }
  });
});
