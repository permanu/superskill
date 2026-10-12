import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, writeFile, rm, rename, utimes, symlink } from "node:fs/promises";
import { existsSync } from "node:fs";
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
  removeVaultFileFromIndex,
} from "./knowledge-index.js";

describe("extractKnowledgeLinks", () => {
  it("reads related frontmatter and wikilinks", () => {
    const links = extractKnowledgeLinks(
      { related: ["projects/p/adr.md", "auth"] },
      "See [[sessions/2026-01-01]] and [[auth]].",
    );
    expect(links).toEqual(expect.arrayContaining(["projects/p/adr.md", "auth", "sessions/2026-01-01"]));
  });

  it("normalizes bracketed property links to bare targets", () => {
    const links = extractKnowledgeLinks(
      {
        related: [
          "[[projects/p/adr.md]]",
          "[[auth|Auth note]]",
          "[[sessions/2026-01-01#Notes]]",
          "[[code/src/lib/foo.ts|foo]]",
          "plain-target",
        ],
      },
      "",
    );
    expect(links).toEqual([
      "projects/p/adr.md",
      "auth",
      "sessions/2026-01-01",
      "code/src/lib/foo.ts",
      "plain-target",
    ]);
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

  it("falls back to OR matching when the AND query is too narrow", () => {
    index.upsert({ path: "projects/p/partial.md", type: "note", title: "Partial", body: "auth migration guide", related: [] });
    index.upsert({ path: "projects/p/other.md", type: "note", title: "Other", body: "tenant retry logging", related: [] });
    expect(index.search("auth migration tenant retry", 10).map((hit) => hit.path)).toEqual(
      expect.arrayContaining(["projects/p/partial.md", "projects/p/other.md"]),
    );
    const hits = index.search("auth migration tenant retry", 10);
    expect(new Set(hits.map((hit) => hit.path)).size).toBe(hits.length);
    expect(index.search("auth migration tenant retry", 1)).toHaveLength(1);
  });

  it("ranks newer notes above older notes with equal bm25", () => {
    const now = Date.now();
    const body = "zqxwce shared ranking text";
    index.upsert({ path: "projects/p/old.md", type: "note", title: "Shared", body, related: [], ts: now - 365 * 86_400_000 });
    index.upsert({ path: "projects/p/new.md", type: "note", title: "Shared", body, related: [], ts: now });
    expect(index.search("zqxwce", 10).map((hit) => hit.path)).toEqual(["projects/p/new.md", "projects/p/old.md"]);
  });

  it("closes the least recently used handle once the cache exceeds 32 databases", () => {
    const opened: KnowledgeIndex[] = [];
    try {
      for (let i = 0; i < 33; i++) opened.push(KnowledgeIndex.open(join(dir, `lru-${i}.sqlite`)));
      expect(() => opened[0].noteDocs()).toThrow();
      expect(opened[32].noteDocs()).toEqual([]);
    } finally {
      for (const idx of opened) idx.close();
    }
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
    const stamps = index.fileStamps();
    const connection = new DatabaseSync(indexPathFor(vault, slug));
    connection.exec(`CREATE TRIGGER fail_rebuild BEFORE INSERT ON notes WHEN new.title = 'Rejectneedle' BEGIN SELECT RAISE(ABORT, 'forced rebuild failure'); END`);
    await writeFile(join(project, "a.md"), "# Replacementneedle");
    await writeFile(join(project, "z.md"), "# Rejectneedle");
    try {
      expect(() => rebuildProjectIndex(vault, slug)).toThrow("forced rebuild failure");
      expect(index.graphDump()).toEqual(original);
      expect(index.search("Originalneedle")).toHaveLength(1);
      expect(index.search("Replacementneedle")).toEqual([]);
      expect(index.filesCount()).toBe(2);
      expect(index.fileStamps()).toEqual(stamps);
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
    expect(idx.filesCount()).toBe(2);
    idx.close();
  });

  it("does not re-parse untouched files during incremental ensure", async () => {
    const project = join(vault, "projects", slug);
    await writeFile(join(project, "untouched.md"), "# Untouchedneedle\n\noriginal body");
    await writeFile(join(project, "changed.md"), "# Changedneedle\n\nfirst body");
    const first = ensureProjectIndex(vault, slug);
    expect(first.filesCount()).toBe(2);
    first.close();

    const connection = new DatabaseSync(indexPathFor(vault, slug));
    connection.exec(`UPDATE notes SET body = 'vandalized marker body' WHERE path = 'projects/${slug}/untouched.md'`);
    connection.close();

    await writeFile(join(project, "changed.md"), "# Changedneedle\n\nsecond body with more text");

    const second = ensureProjectIndex(vault, slug);
    try {
      expect(second.search("vandalized").map((hit) => hit.path)).toEqual([`projects/${slug}/untouched.md`]);
      expect(second.noteDocs().find((doc) => doc.id === `projects/${slug}/untouched.md`)?.body).toContain("vandalized");
      expect(second.search("Changedneedle").map((hit) => hit.path)).toEqual([`projects/${slug}/changed.md`]);
    } finally {
      second.close();
    }
  });

  it("drops removed files from notes, edges and the files table", async () => {
    const project = join(vault, "projects", slug);
    await writeFile(join(project, "keep.md"), "# Keepneedle\n\n[[gone]]");
    await writeFile(join(project, "gone.md"), "# Goneneedle\n\ndoomed");
    ensureProjectIndex(vault, slug).close();
    await rm(join(project, "gone.md"));
    const idx = ensureProjectIndex(vault, slug);
    try {
      expect(idx.search("Goneneedle")).toEqual([]);
      expect(idx.filesCount()).toBe(1);
      expect(idx.incoming(`projects/${slug}/gone.md`)).toEqual([]);
      expect(idx.outgoing(`projects/${slug}/keep.md`)).toEqual([]);
    } finally {
      idx.close();
    }
  });

  it("does one full rebuild for a legacy stamped index and removes the stamp", async () => {
    const project = join(vault, "projects", slug);
    await writeFile(join(project, "legacy.md"), "# Legacyneedle");
    const stampPath = `${indexPathFor(vault, slug)}.stamp`;
    await writeFile(stampPath, "legacy-fingerprint");
    const idx = ensureProjectIndex(vault, slug);
    try {
      expect(idx.search("Legacyneedle")).toHaveLength(1);
      expect(idx.filesCount()).toBe(1);
      expect(existsSync(stampPath)).toBe(false);
    } finally {
      idx.close();
    }
  });

  it("removes a deleted note, its file row and its edges via removeVaultFileFromIndex", async () => {
    const project = join(vault, "projects", slug);
    await writeFile(join(project, "keep.md"), "---\nrelated:\n  - gone.md\n---\n\n# Keepneedle");
    await writeFile(join(project, "gone.md"), "# Goneneedle");
    const idx = ensureProjectIndex(vault, slug);
    expect(idx.outgoing(`projects/${slug}/keep.md`)).toContain(`projects/${slug}/gone.md`);
    idx.close();
    await rm(join(project, "gone.md"));
    removeVaultFileFromIndex(vault, `projects/${slug}/gone.md`);
    const next = ensureProjectIndex(vault, slug);
    try {
      expect(next.search("Goneneedle")).toEqual([]);
      expect(next.incoming(`projects/${slug}/gone.md`)).toEqual([]);
      expect(next.outgoing(`projects/${slug}/keep.md`)).toEqual([]);
      expect(next.filesCount()).toBe(1);
    } finally {
      next.close();
    }
  });

  it("ignores non-project paths in removeVaultFileFromIndex", () => {
    expect(() => removeVaultFileFromIndex(vault, "sessions/2026-01-01.md")).not.toThrow();
  });
});

describe("edge resolution and code-note bodies", () => {
  const slug = "app";
  let vault: string;

  function codeNote(file: string, links: string[], source: string): string {
    return `---\ntype: code\n---\n\n<!-- superskill:generated -->\n\n# code/${file}\n\n${links.map((link) => `- [[${link}]]`).join("\n")}\n\n## Source\n\n\`\`\`ts\n${source}\n\`\`\`\n`;
  }

  beforeEach(async () => {
    vault = join(tmpdir(), `ki-code-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const project = join(vault, "projects", slug);
    await mkdir(join(project, "code", "src", "lib"), { recursive: true });
    await mkdir(join(project, "notes"), { recursive: true });
    await writeFile(
      join(project, "code", "src", "lib", "foo.ts.md"),
      codeNote("src/lib/foo.ts", ["projects/app/code/src/lib/other.ts"], 'export const fooNeedle = "FOO_SOURCE_TEXT";'),
    );
    await writeFile(
      join(project, "code", "src", "lib", "other.ts.md"),
      codeNote("src/lib/other.ts", [], 'export const otherNeedle = "OTHER_SOURCE_TEXT";'),
    );
    await writeFile(
      join(project, "notes", "main.md"),
      "---\ntype: note\n---\n\n# Main\n\n[[projects/app/code/src/lib/foo.ts]]\n[[foo.ts]]\n",
    );
    await writeFile(
      join(project, "notes", "via-property.md"),
      '---\ntype: note\nrelated:\n  - "[[projects/app/code/src/lib/other.ts]]"\n---\n\n# Via property\n',
    );
    await writeFile(
      join(project, "notes", "basename.md"),
      "---\ntype: note\n---\n\n# Basename\n\n[[other.ts]]\n",
    );
  });

  afterEach(() => rm(vault, { recursive: true, force: true }));

  it("resolves source-extension targets to the generated markdown note", () => {
    rebuildProjectIndex(vault, slug);
    const idx = KnowledgeIndex.openForProject(vault, slug);
    try {
      const foo = `projects/${slug}/code/src/lib/foo.ts.md`;
      const other = `projects/${slug}/code/src/lib/other.ts.md`;
      expect(idx.outgoing(foo)).toEqual([other]);
      expect(idx.outgoing(`projects/${slug}/notes/via-property.md`)).toEqual([other]);
      expect(idx.incoming(foo)).toEqual([`projects/${slug}/notes/main.md`]);
      expect(idx.outgoing(`projects/${slug}/notes/main.md`)).toEqual([foo]);
    } finally {
      idx.close();
    }
  });

  it("falls back to a unique basename", () => {
    rebuildProjectIndex(vault, slug);
    const idx = KnowledgeIndex.openForProject(vault, slug);
    try {
      expect(idx.outgoing(`projects/${slug}/notes/basename.md`)).toEqual([
        `projects/${slug}/code/src/lib/other.ts.md`,
      ]);
    } finally {
      idx.close();
    }
  });

  it("strips fenced source from code note bodies while import edges stay indexed", () => {
    rebuildProjectIndex(vault, slug);
    const idx = KnowledgeIndex.openForProject(vault, slug);
    try {
      const foo = `projects/${slug}/code/src/lib/foo.ts.md`;
      expect(idx.search("FOO_SOURCE_TEXT")).toEqual([]);
      expect(idx.search("OTHER_SOURCE_TEXT")).toEqual([]);
      expect(idx.search("foo.ts").map((hit) => hit.path)).toContain(foo);
      const body = idx.noteDocs().find((doc) => doc.id === foo)?.body ?? "";
      expect(body).not.toContain("FOO_SOURCE_TEXT");
      expect(body).toContain("## Source");
      expect(idx.outgoing(foo)).toEqual([`projects/${slug}/code/src/lib/other.ts.md`]);
    } finally {
      idx.close();
    }
  });

  it("applies the same stripping and resolution through upsertVaultFile", async () => {
    ensureProjectIndex(vault, slug);
    const rel = `projects/${slug}/code/src/lib/fresh.ts.md`;
    const content = codeNote("src/lib/fresh.ts", ["projects/app/code/src/lib/foo.ts"], 'export const freshNeedle = "FRESH_SOURCE_TEXT";');
    await writeFile(join(vault, rel), content, "utf-8");
    upsertVaultFile(vault, rel, content);
    const idx = ensureProjectIndex(vault, slug);
    try {
      expect(idx.search("FRESH_SOURCE_TEXT")).toEqual([]);
      expect(idx.outgoing(rel)).toEqual([`projects/${slug}/code/src/lib/foo.ts.md`]);
    } finally {
      idx.close();
    }
  });
});

