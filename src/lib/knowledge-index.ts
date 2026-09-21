// SPDX-License-Identifier: AGPL-3.0-or-later

import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseFrontmatter, type Frontmatter } from "./frontmatter.js";
import { validateProjectSlug } from "../config.js";

export const INDEX_FILENAME = ".knowledge-index.sqlite";

export interface IndexedNote {
  path: string;
  type: string;
  title: string;
  body: string;
  related: string[];
}

export interface KnowledgeHit {
  path: string;
  snippet: string;
  title: string;
  rank: number;
}

const WIKILINK_RE = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;

const openDbs = new Map<string, KnowledgeIndex>();

export function extractKnowledgeLinks(data: Frontmatter, body: string): string[] {
  const out: string[] = [];
  if (Array.isArray(data.related)) {
    for (const r of data.related) {
      if (typeof r === "string" && r.trim()) out.push(r.trim());
    }
  }
  WIKILINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WIKILINK_RE.exec(body)) !== null) {
    out.push(m[1].trim());
  }
  return [...new Set(out)];
}

export function indexPathFor(vaultRoot: string, slug: string): string {
  return join(vaultRoot, "projects", validateProjectSlug(slug), INDEX_FILENAME);
}

function toMatchQuery(q: string): string {
  return q
    .replace(/["*^(){}[\]:]+/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !/^(and|or|not|near)$/i.test(t))
    .join(" ");
}

function titleFrom(body: string, path: string): string {
  const heading = body.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.md$/, "");
}

export class KnowledgeIndex {
  private constructor(
    private readonly db: DatabaseSync,
    private readonly dbPath: string,
  ) {}

  static open(dbPath: string): KnowledgeIndex {
    const existing = openDbs.get(dbPath);
    if (existing) return existing;
    mkdirSync(dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);
    db.exec("PRAGMA journal_mode = DELETE");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        path TEXT PRIMARY KEY,
        type TEXT,
        title TEXT,
        body TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title,
        body,
        content='notes',
        content_rowid='rowid',
        tokenize='porter unicode61'
      );
      CREATE TABLE IF NOT EXISTS edges (
        "from" TEXT NOT NULL,
        "to" TEXT NOT NULL,
        type TEXT NOT NULL,
        PRIMARY KEY ("from", "to", type)
      );
      CREATE INDEX IF NOT EXISTS idx_edges_to ON edges("to");
    `);
    ensureFtsTriggers(db);
    const idx = new KnowledgeIndex(db, dbPath);
    openDbs.set(dbPath, idx);
    return idx;
  }

  static openForProject(vaultRoot: string, slug: string): KnowledgeIndex {
    return KnowledgeIndex.open(indexPathFor(vaultRoot, slug));
  }

  upsert(note: IndexedNote): void {
    const type = note.type || "note";
    const title = note.title || titleFrom(note.body, note.path);
    this.db.exec("BEGIN");
    try {
      this.db.prepare(
        `INSERT INTO notes(path, type, title, body) VALUES (?, ?, ?, ?)
         ON CONFLICT(path) DO UPDATE SET type=excluded.type, title=excluded.title, body=excluded.body`,
      ).run(note.path, type, title, note.body);
      this.db.prepare(`DELETE FROM edges WHERE "from" = ?`).run(note.path);
      const insertEdge = this.db.prepare(
        `INSERT OR IGNORE INTO edges("from", "to", type) VALUES (?, ?, ?)`,
      );
      for (const target of note.related) {
        if (!target || target === note.path) continue;
        insertEdge.run(note.path, target, "related");
      }
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }

  remove(path: string): void {
    this.db.prepare(`DELETE FROM notes WHERE path = ?`).run(path);
    this.db.prepare(`DELETE FROM edges WHERE "from" = ? OR "to" = ?`).run(path, path);
  }

  search(query: string, limit = 10): KnowledgeHit[] {
    const match = toMatchQuery(query);
    if (!match) return [];
    const rows = this.db.prepare(
      `SELECT n.path AS path, n.title AS title,
              snippet(notes_fts, 1, '', '', '…', 24) AS snippet,
              bm25(notes_fts) AS rank
       FROM notes_fts
       JOIN notes n ON n.rowid = notes_fts.rowid
       WHERE notes_fts MATCH ?
       ORDER BY rank
       LIMIT ?`,
    ).all(match, limit) as Array<{ path: string; title: string; snippet: string; rank: number }>;
    return rows.map((r) => ({
      path: r.path,
      title: r.title,
      snippet: String(r.snippet ?? "").replace(/\s+/g, " ").trim(),
      rank: r.rank,
    }));
  }

  neighbors(path: string, hops = 1): string[] {
    const depth = Math.max(1, Math.min(8, Math.floor(hops)));
    const rows = this.db.prepare(
      `WITH RECURSIVE hop(id, d) AS (
         SELECT ?, 0
         UNION
         SELECT CASE WHEN e."from" = hop.id THEN e."to" ELSE e."from" END, hop.d + 1
         FROM hop
         JOIN edges e ON e."from" = hop.id OR e."to" = hop.id
         WHERE hop.d < ?
       )
       SELECT DISTINCT id FROM hop WHERE d > 0`,
    ).all(path, depth) as Array<{ id: string }>;
    return rows.map((r) => r.id);
  }

  outgoing(path: string): string[] {
    const rows = this.db.prepare(`SELECT "to" AS id FROM edges WHERE "from" = ?`).all(path) as Array<{ id: string }>;
    return rows.map((r) => r.id);
  }

  incoming(path: string): string[] {
    const rows = this.db.prepare(`SELECT "from" AS id FROM edges WHERE "to" = ?`).all(path) as Array<{ id: string }>;
    return rows.map((r) => r.id);
  }

  noteDocs(): Array<{ id: string; title: string; type: string; body: string }> {
    return this.db.prepare(`SELECT path AS id, title, type, body FROM notes`).all() as Array<{
      id: string;
      title: string;
      type: string;
      body: string;
    }>;
  }

  graphDump(): { nodes: Array<{ id: string; title: string; type: string }>; edges: Array<{ from: string; to: string; type: string }> } {
    const nodes = this.db.prepare(`SELECT path AS id, title, type FROM notes`).all() as Array<{
      id: string;
      title: string;
      type: string;
    }>;
    const edges = this.db.prepare(`SELECT "from" AS "from", "to" AS "to", type FROM edges`).all() as Array<{
      from: string;
      to: string;
      type: string;
    }>;
    return { nodes, edges };
  }

  clear(): void {
    this.db.exec("DELETE FROM edges; DELETE FROM notes;");
  }

  close(): void {
    openDbs.delete(this.dbPath);
    this.db.close();
  }
}

function ensureFtsTriggers(db: DatabaseSync): void {
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
    END;
    CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
      INSERT INTO notes_fts(notes_fts, rowid, title, body) VALUES('delete', old.rowid, old.title, old.body);
    END;
    CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
      INSERT INTO notes_fts(notes_fts, rowid, title, body) VALUES('delete', old.rowid, old.title, old.body);
      INSERT INTO notes_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
    END;
  `);
}

function walkMarkdown(dir: string, acc: string[]): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist") continue;
      walkMarkdown(full, acc);
    } else if (e.isFile() && e.name.endsWith(".md")) {
      acc.push(full);
    }
  }
}

function resolveEdgeTarget(slug: string, raw: string, paths: Set<string>): string {
  let t = raw.replace(/\\/g, "/").replace(/^\.\/+/, "");
  if (!t.endsWith(".md") && !t.includes(".")) t = `${t}.md`;
  if (t.startsWith("projects/")) return t;
  const prefixed = `projects/${slug}/${t}`;
  if (paths.has(prefixed)) return prefixed;
  const base = t.split("/").pop()!;
  for (const p of paths) {
    if (p.endsWith("/" + base) || p.endsWith("/" + t)) return p;
  }
  return prefixed;
}

export function rebuildProjectIndex(vaultRoot: string, slug: string): { notes: number; edges: number } {
  const safe = validateProjectSlug(slug);
  const projectDir = join(vaultRoot, "projects", safe);
  const files: string[] = [];
  if (existsSync(projectDir) && statSync(projectDir).isDirectory()) {
    walkMarkdown(projectDir, files);
  }

  const parsed: IndexedNote[] = [];
  const pathSet = new Set<string>();
  for (const abs of files) {
    const rel = abs.slice(vaultRoot.length).replace(/^[\\/]+/, "").replace(/\\/g, "/");
    let raw: string;
    try {
      raw = readFileSync(abs, "utf-8");
    } catch {
      continue;
    }
    const { data, content } = parseFrontmatter(raw);
    const type = typeof data.type === "string" ? data.type : "note";
    parsed.push({
      path: rel,
      type,
      title: titleFrom(content, rel),
      body: content,
      related: extractKnowledgeLinks(data, content),
    });
    pathSet.add(rel);
  }

  for (const n of parsed) {
    n.related = n.related.map((t) => resolveEdgeTarget(safe, t, pathSet));
  }

  const idx = KnowledgeIndex.openForProject(vaultRoot, safe);
  idx.clear();
  for (const n of parsed) idx.upsert(n);
  const dump = idx.graphDump();
  return { notes: dump.nodes.length, edges: dump.edges.length };
}

export function ensureProjectIndex(vaultRoot: string, slug: string): KnowledgeIndex {
  const path = indexPathFor(vaultRoot, slug);
  if (!existsSync(path)) {
    rebuildProjectIndex(vaultRoot, slug);
  }
  return KnowledgeIndex.openForProject(vaultRoot, slug);
}

export function upsertVaultFile(vaultRoot: string, vaultRelPath: string, content: string): void {
  const m = vaultRelPath.replace(/\\/g, "/").match(/^projects\/([^/]+)\//);
  if (!m) return;
  const slug = m[1];
  const { data, content: body } = parseFrontmatter(content);
  const idx = KnowledgeIndex.openForProject(vaultRoot, slug);
  const related = extractKnowledgeLinks(data, body).map((t) => {
    const paths = new Set(idx.graphDump().nodes.map((n) => n.id));
    paths.add(vaultRelPath);
    return resolveEdgeTarget(slug, t, paths);
  });
  idx.upsert({
    path: vaultRelPath,
    type: typeof data.type === "string" ? data.type : "note",
    title: titleFrom(body, vaultRelPath),
    body,
    related,
  });
}
