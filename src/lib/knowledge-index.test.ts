import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, writeFile, readFile, rm, rename, utimes, symlink } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  KnowledgeIndex,
  indexPathFor,
  extractKnowledgeLinks,
  rebuildProjectIndex,
  ensureProjectIndex,
  upsertVaultFile,
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

  it("fails clearly before schema writes and closes SQLite when FTS5 is unavailable", () => {
    const path = join(dir, "unsupported.sqlite");
    const prepare = DatabaseSync.prototype.prepare;
    const capability = vi.spyOn(DatabaseSync.prototype, "prepare").mockImplementation(function(this: DatabaseSync, sql: string) {
      return prepare.call(this, sql.includes("sqlite_compileoption_used") ? "SELECT 0 AS enabled" : sql);
    });
    const writes = vi.spyOn(DatabaseSync.prototype, "exec");
    const closed = vi.spyOn(DatabaseSync.prototype, "close");
    let opened: KnowledgeIndex | undefined;
    try {
      expect(() => { opened = KnowledgeIndex.open(path); }).toThrow(/Node\.js 22\.16.*24.*FTS5/);
      expect(writes).not.toHaveBeenCalled();
      expect(closed).toHaveBeenCalledTimes(1);
    } finally {
      capability.mockRestore();
      writes.mockRestore();
      closed.mockRestore();
      opened?.close();
    }
    KnowledgeIndex.open(path).close();
  });

  it("closes SQLite and preserves the error when schema initialization fails", () => {
    const path = join(dir, "broken.sqlite");
    const exec = DatabaseSync.prototype.exec;
    const failure = new Error("schema initialization failed");
    const writes = vi.spyOn(DatabaseSync.prototype, "exec").mockImplementation(function(this: DatabaseSync, sql: string) {
      if (sql.includes("CREATE TABLE")) throw failure;
      return exec.call(this, sql);
    });
    const closed = vi.spyOn(DatabaseSync.prototype, "close");
    try {
      expect(() => KnowledgeIndex.open(path)).toThrow(failure);
      expect(closed).toHaveBeenCalledTimes(1);
    } finally {
      writes.mockRestore();
      closed.mockRestore();
    }
    KnowledgeIndex.open(path).close();
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

  it("treats path punctuation as search text", () => {
    index.upsert({ path: "projects/p/path.md", title: "Path", type: "note", body: "src/lib/auth.ts authorize_payment foo@bar", related: [] });
    expect(index.search("src/lib/auth.ts")).toHaveLength(1);
    expect(index.search("foo@bar")).toHaveLength(1);
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

describe("index freshness", () => {
  const slug = "fresh";
  let vault: string;

  beforeEach(async () => {
    vault = join(tmpdir(), `ki-fresh-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(join(vault, "projects", slug), { recursive: true });
  });

  afterEach(() => rm(vault, { recursive: true, force: true }));

  it("rejects an index project root symlinked into another project", async () => {
    await mkdir(join(vault, "projects", "beta"));
    await writeFile(join(vault, "projects", "beta", "secret.md"), "private");
    await rm(join(vault, "projects", slug), { recursive: true });
    await symlink("beta", join(vault, "projects", slug));
    expect(() => ensureProjectIndex(vault, slug)).toThrow(/escapes project/);
  });

  it("rolls back the entire rebuild when an insert fails", async () => {
    const project = join(vault, "projects", slug);
    await writeFile(join(project, "a.md"), "# Originalneedle\n[[z]]");
    await writeFile(join(project, "z.md"), "# Oldtarget");
    const index = ensureProjectIndex(vault, slug);
    const original = index.graphDump();
    const stampPath = `${indexPathFor(vault, slug)}.stamp`;
    const stamp = await readFile(stampPath, "utf8");
    const connection = new DatabaseSync(indexPathFor(vault, slug));
    connection.exec(`CREATE TRIGGER fail_rebuild BEFORE INSERT ON notes WHEN new.title = 'Rejectneedle' BEGIN SELECT RAISE(ABORT, 'forced rebuild failure'); END`);
    await writeFile(join(project, "a.md"), "# Replacementneedle");
    await writeFile(join(project, "z.md"), "# Rejectneedle");
    try {
      expect(() => rebuildProjectIndex(vault, slug)).toThrow("forced rebuild failure");
      expect(index.graphDump()).toEqual(original);
      expect(index.search("Originalneedle")).toHaveLength(1);
      expect(index.search("Replacementneedle")).toEqual([]);
      expect(await readFile(stampPath, "utf8")).toBe(stamp);
      connection.exec("DROP TRIGGER fail_rebuild");
      expect(rebuildProjectIndex(vault, slug).notes).toBe(2);
      expect(index.search("Replacementneedle")).toHaveLength(1);
    } finally {
      connection.close();
      index.close();
    }
  });

  it("rebuilds when a note appears outside the write tool", async () => {
    await writeFile(join(vault, "projects", slug, "a.md"), "---\ntype: note\n---\n\nfirst", "utf-8");
    const first = ensureProjectIndex(vault, slug);
    expect(JSON.stringify(first.graphDump())).toContain("a.md");
    first.close();

    await writeFile(join(vault, "projects", slug, "b.md"), "---\ntype: note\n---\n\nsecond", "utf-8");
    const second = ensureProjectIndex(vault, slug);
    expect(JSON.stringify(second.graphDump())).toContain("b.md");
    second.close();
  });

  it("refreshes deletions and renames even when modification times do not increase", async () => {
    const project = join(vault, "projects", slug);
    const source = join(project, "a.md");
    await writeFile(source, "# Retainedneedle");
    ensureProjectIndex(vault, slug);
    await rename(source, join(project, "renamed.md"));
    expect(ensureProjectIndex(vault, slug).search("Retainedneedle").map(hit => hit.path)).toEqual([`projects/${slug}/renamed.md`]);
    await rm(join(project, "renamed.md"));
    expect(ensureProjectIndex(vault, slug).search("Retainedneedle")).toEqual([]);
  });

  it("discovers files with older timestamps", async () => {
    const project = join(vault, "projects", slug);
    await writeFile(join(project, "new.md"), "Newestneedle");
    ensureProjectIndex(vault, slug);
    const older = join(project, "old.md");
    await writeFile(older, "Olderneedle");
    await utimes(older, new Date(0), new Date(0));
    expect(ensureProjectIndex(vault, slug).search("Olderneedle")).toHaveLength(1);
  });

  it("keeps incremental upserts fresh without waiting for a rebuild", async () => {
    await writeFile(join(vault, "projects", slug, "a.md"), "---\ntype: note\n---\n\nfirst", "utf-8");
    ensureProjectIndex(vault, slug).close();

    const content = "---\ntype: note\n---\n\nthird";
    await writeFile(join(vault, "projects", slug, "c.md"), content, "utf-8");
    upsertVaultFile(vault, `projects/${slug}/c.md`, content);

    const idx = ensureProjectIndex(vault, slug);
    expect(JSON.stringify(idx.graphDump())).toContain("c.md");
    idx.close();
  });
});
