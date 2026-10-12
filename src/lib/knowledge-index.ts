// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, isAbsolute } from "node:path";
import { parseFrontmatter, type Frontmatter } from "./frontmatter.js";
import { validateProjectSlug } from "../config.js";

export const INDEX_FILENAME = ".knowledge-index.sqlite";

const SCHEMA_VERSION = 1;
const OPEN_DB_LIMIT = 32;
const RECENCY_LAMBDA = 0.1;
const RECENCY_DECAY_DAYS = 90;
const MS_PER_DAY = 86_400_000;

export interface IndexedNote {
  path: string;
  type: string;
  title: string;
  body: string;
  related: string[];
  ts?: number;
}

export interface IndexedFileStamp {
  path: string;
  size: number;
  mtime_ms: number;
  ctime_ms: number;
  content_hash: string;
  indexed_at: string;
}

export interface KnowledgeHit {
  path: string;
  snippet: string;
  title: string;
  rank: number;
}

interface RankedRow {
  path: string;
  title: string;
  snippet: string;
  rank: number;
  ts: number | null;
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

function assertProjectPath(vaultRoot: string, slug: string, target: string): void {
  let realVault: string;
  try { realVault = realpathSync(vaultRoot); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    realVault = resolve(vaultRoot);
  }
  const boundary = join(realVault, "projects", slug);
  let ancestor = resolve(target);
  const suffix: string[] = [];
  while (true) {
    try {
      const resolved = resolve(realpathSync(ancestor), ...suffix);
      const rel = relative(boundary, resolved);
      if (rel === ".." || rel.startsWith("../") || isAbsolute(rel)) throw new Error(`Index path escapes project ${slug}: ${target}`);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      try {
        if (lstatSync(ancestor).isSymbolicLink()) throw new Error(`Index path escapes project ${slug}: dangling symlink ${ancestor}`);
      } catch (statError) {
        if ((statError as NodeJS.ErrnoException).code !== "ENOENT") throw statError;
      }
      const parent = dirname(ancestor);
      if (parent === ancestor) throw error;
      suffix.unshift(relative(parent, ancestor));
      ancestor = parent;
    }
  }
}

export function indexPathFor(vaultRoot: string, slug: string): string {
  const safe = validateProjectSlug(slug);
  const path = join(vaultRoot, "projects", safe, INDEX_FILENAME);
  assertProjectPath(vaultRoot, safe, path);
  return path;
}

function indexStampFor(vaultRoot: string, slug: string): string {
  const path = `${indexPathFor(vaultRoot, slug)}.stamp`;
  assertProjectPath(vaultRoot, slug, path);
  return path;
}

function removeIndexStamp(vaultRoot: string, slug: string): void {
  try {
    rmSync(indexStampFor(vaultRoot, slug), { force: true });
  } catch (err) {
    console.error(`[knowledge-index] cannot remove index stamp for ${slug}: ${String(err)}`);
  }
}

function tokenizeQuery(q: string): string[] {
  return (q.match(/[\p{L}\p{N}_]+/gu) ?? [])
    .map(token => token.replace(/"/g, ""))
    .filter(token => token.length > 1 && !/^(and|or|not|near)$/i.test(token));
}

function rankHits(rows: RankedRow[], limit: number): KnowledgeHit[] {
  const now = Date.now();
  return rows
    .map((row) => {
      const ts = typeof row.ts === "number" && Number.isFinite(row.ts) ? row.ts : 0;
      const ageDays = Math.max(0, (now - ts) / MS_PER_DAY);
      return {
        path: row.path,
        title: row.title,
        snippet: String(row.snippet ?? "").replace(/\s+/g, " ").trim(),
        rank: row.rank - RECENCY_LAMBDA * Math.exp(-ageDays / RECENCY_DECAY_DAYS),
      };
    })
    .sort((a, b) => a.rank - b.rank || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .slice(0, limit);
}

function titleFrom(body: string, path: string): string {
  const heading = body.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.md$/, "");
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function vaultRelPath(vaultRoot: string, absPath: string): string {
  return absPath.slice(vaultRoot.length).replace(/^[\\/]+/, "").replace(/\\/g, "/");
}

function frontmatterTimestamp(data: Frontmatter): number | null {
  for (const key of ["updated", "created"] as const) {
    const value: unknown = data[key];
    if (typeof value === "object" && value !== null && value instanceof Date && Number.isFinite(value.getTime())) return value.getTime();
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function statMtimeMs(vaultRoot: string, relPath: string): number | null {
  try {
    return statSync(join(vaultRoot, relPath)).mtimeMs;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return null;
  }
}

function fileStampFor(vaultRoot: string, relPath: string, content: string): IndexedFileStamp {
  const indexed_at = new Date().toISOString();
  const content_hash = hashContent(content);
  try {
    const stat = statSync(join(vaultRoot, relPath));
    return { path: relPath, size: stat.size, mtime_ms: stat.mtimeMs, ctime_ms: stat.ctimeMs, content_hash, indexed_at };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const now = Date.now();
    return { path: relPath, size: Buffer.byteLength(content, "utf-8"), mtime_ms: now, ctime_ms: now, content_hash, indexed_at };
  }
}

export class KnowledgeIndex {
  private closed = false;

  private constructor(
    private readonly db: DatabaseSync,
    private readonly dbPath: string,
  ) {}

  static open(dbPath: string): KnowledgeIndex {
    const existing = openDbs.get(dbPath);
    if (existing) {
      openDbs.delete(dbPath);
      openDbs.set(dbPath, existing);
      return existing;
    }
    mkdirSync(dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);
    try {
      const capability = db.prepare("SELECT sqlite_compileoption_used('ENABLE_FTS5') AS enabled").get() as { enabled: number };
      if (capability.enabled !== 1) {
        throw new Error("SuperSkill requires Node.js 22.16+ or 24+ with SQLite FTS5 enabled. Install an official supported Node.js runtime and retry.");
      }
      db.exec("PRAGMA busy_timeout = 2000");
      db.exec("PRAGMA journal_mode = WAL");
      db.exec("PRAGMA foreign_keys = ON");
      db.exec(`
        CREATE TABLE IF NOT EXISTS notes (
          path TEXT PRIMARY KEY,
          type TEXT,
          title TEXT,
          body TEXT NOT NULL,
          ts REAL
        );
        CREATE TABLE IF NOT EXISTS files (
          path TEXT PRIMARY KEY,
          size INTEGER NOT NULL,
          mtime_ms REAL NOT NULL,
          ctime_ms REAL NOT NULL,
          content_hash TEXT NOT NULL,
          indexed_at TEXT NOT NULL
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
      upgradeNotesSchema(db);
      ensureFtsTriggers(db);
      db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    } catch (error) {
      db.close();
      throw error;
    }
    const idx = new KnowledgeIndex(db, dbPath);
    cacheDb(dbPath, idx);
    return idx;
  }

  static openForProject(vaultRoot: string, slug: string): KnowledgeIndex {
    return KnowledgeIndex.open(indexPathFor(vaultRoot, slug));
  }

  upsert(note: IndexedNote): void {
    const type = note.type || "note";
    const title = note.title || titleFrom(note.body, note.path);
    const ts = typeof note.ts === "number" && Number.isFinite(note.ts) ? note.ts : Date.now();
    this.db.exec("SAVEPOINT knowledge_note");
    try {
      this.db.prepare(
        `INSERT INTO notes(path, type, title, body, ts) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(path) DO UPDATE SET type=excluded.type, title=excluded.title, body=excluded.body, ts=excluded.ts`,
      ).run(note.path, type, title, note.body, ts);
      this.db.prepare(`DELETE FROM edges WHERE "from" = ?`).run(note.path);
      const insertEdge = this.db.prepare(
        `INSERT OR IGNORE INTO edges("from", "to", type) VALUES (?, ?, ?)`,
      );
      for (const target of note.related) {
        if (!target || target === note.path) continue;
        insertEdge.run(note.path, target, "related");
      }
      this.db.exec("RELEASE knowledge_note");
    } catch (e) {
      this.db.exec("ROLLBACK TO knowledge_note; RELEASE knowledge_note");
      throw e;
    }
  }

  replaceAll(notes: IndexedNote[], files: IndexedFileStamp[] = []): void {
    this.transaction(() => {
      this.clear();
      for (const note of notes) this.upsert(note);
      this.replaceFileRows(files);
    });
  }

  applyFileChanges(notes: IndexedNote[], files: IndexedFileStamp[], removed: string[]): void {
    this.transaction(() => {
      for (const path of removed) this.deletePath(path);
      for (const note of notes) this.upsert(note);
      for (const file of files) this.upsertFileRow(file);
    });
  }

  remove(path: string): void {
    this.transaction(() => this.deletePath(path));
  }

  search(query: string, limit = 10): KnowledgeHit[] {
    const tokens = tokenizeQuery(query);
    if (tokens.length === 0) return [];
    const quoted = tokens.map((token) => `"${token}"`);
    let rows: RankedRow[] = [];
    try {
      rows = this.matchRows(quoted.join(" "), limit);
    } catch (error) {
      console.error(`[knowledge-index] FTS AND query failed: ${String(error)}`);
    }
    if (rows.length < limit) {
      try {
        const orRows = this.matchRows(quoted.join(" OR "), limit);
        const seen = new Set(rows.map((row) => row.path));
        for (const row of orRows) {
          if (seen.has(row.path)) continue;
          seen.add(row.path);
          rows.push(row);
        }
      } catch (error) {
        console.error(`[knowledge-index] FTS OR fallback failed: ${String(error)}`);
      }
    }
    return rankHits(rows, limit);
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

  fileStamps(): Map<string, IndexedFileStamp> {
    const rows = this.db.prepare(`SELECT path, size, mtime_ms, ctime_ms, content_hash, indexed_at FROM files`).all() as unknown as IndexedFileStamp[];
    return new Map(rows.map((row) => [row.path, row]));
  }

  filesCount(): number {
    return (this.db.prepare(`SELECT COUNT(*) AS count FROM files`).get() as { count: number }).count;
  }

  noteCount(): number {
    return (this.db.prepare(`SELECT COUNT(*) AS count FROM notes`).get() as { count: number }).count;
  }

  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      try {
        this.db.exec("ROLLBACK");
      } catch (rollbackError) {
        console.error(`[knowledge-index] rollback failed: ${String(rollbackError)}`);
      }
      throw error;
    }
  }

  clear(): void {
    this.db.exec("DELETE FROM edges; DELETE FROM notes; DELETE FROM files;");
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (openDbs.get(this.dbPath) === this) openDbs.delete(this.dbPath);
    this.db.close();
  }

  private matchRows(match: string, limit: number): RankedRow[] {
    return this.db.prepare(
      `SELECT n.path AS path, n.title AS title,
              snippet(notes_fts, 1, '', '', '…', 24) AS snippet,
              bm25(notes_fts) AS rank,
              n.ts AS ts
       FROM notes_fts
       JOIN notes n ON n.rowid = notes_fts.rowid
       WHERE notes_fts MATCH ?
       ORDER BY rank
       LIMIT ?`,
    ).all(match, limit) as unknown as RankedRow[];
  }

  private deletePath(path: string): void {
    this.db.prepare(`DELETE FROM notes WHERE path = ?`).run(path);
    this.db.prepare(`DELETE FROM edges WHERE "from" = ? OR "to" = ?`).run(path, path);
    this.db.prepare(`DELETE FROM files WHERE path = ?`).run(path);
  }

  private upsertFileRow(file: IndexedFileStamp): void {
    this.db.prepare(
      `INSERT INTO files(path, size, mtime_ms, ctime_ms, content_hash, indexed_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET size=excluded.size, mtime_ms=excluded.mtime_ms, ctime_ms=excluded.ctime_ms, content_hash=excluded.content_hash, indexed_at=excluded.indexed_at`,
    ).run(file.path, file.size, file.mtime_ms, file.ctime_ms, file.content_hash, file.indexed_at);
  }

  private replaceFileRows(files: IndexedFileStamp[]): void {
    this.db.exec("DELETE FROM files");
    for (const file of files) this.upsertFileRow(file);
  }
}

function cacheDb(dbPath: string, index: KnowledgeIndex): void {
  openDbs.set(dbPath, index);
  while (openDbs.size > OPEN_DB_LIMIT) {
    const oldest = openDbs.keys().next().value;
    if (oldest === undefined) break;
    const evicted = openDbs.get(oldest);
    openDbs.delete(oldest);
    evicted?.close();
  }
}

function upgradeNotesSchema(db: DatabaseSync): void {
  const columns = db.prepare("PRAGMA table_info(notes)").all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "ts")) {
    db.exec("ALTER TABLE notes ADD COLUMN ts REAL");
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

function markdownFiles(projectDir: string): string[] {
  const files: string[] = [];
  if (existsSync(projectDir) && statSync(projectDir).isDirectory()) {
    walkMarkdown(projectDir, files);
  }
  return files;
}

function parseNote(absPath: string, relPath: string, stat: { size: number; mtime_ms: number; ctime_ms: number }): { note: IndexedNote; stamp: IndexedFileStamp } | null {
  let raw: string;
  try {
    raw = readFileSync(absPath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return null;
  }
  const { data, content } = parseFrontmatter(raw);
  return {
    note: {
      path: relPath,
      type: typeof data.type === "string" ? data.type : "note",
      title: titleFrom(content, relPath),
      body: content,
      related: extractKnowledgeLinks(data, content),
      ts: frontmatterTimestamp(data) ?? stat.mtime_ms,
    },
    stamp: {
      path: relPath,
      size: stat.size,
      mtime_ms: stat.mtime_ms,
      ctime_ms: stat.ctime_ms,
      content_hash: hashContent(raw),
      indexed_at: new Date().toISOString(),
    },
  };
}

export function rebuildProjectIndex(vaultRoot: string, slug: string): { notes: number; edges: number } {
  const safe = validateProjectSlug(slug);
  const projectDir = join(vaultRoot, "projects", safe);
  assertProjectPath(vaultRoot, safe, projectDir);

  const parsed: IndexedNote[] = [];
  const stamps: IndexedFileStamp[] = [];
  const pathSet = new Set<string>();
  for (const abs of markdownFiles(projectDir)) {
    const rel = vaultRelPath(vaultRoot, abs);
    let fileStat;
    try {
      fileStat = statSync(abs);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      continue;
    }
    const entry = parseNote(abs, rel, { size: fileStat.size, mtime_ms: fileStat.mtimeMs, ctime_ms: fileStat.ctimeMs });
    if (!entry) continue;
    parsed.push(entry.note);
    stamps.push(entry.stamp);
    pathSet.add(rel);
  }

  for (const n of parsed) {
    n.related = n.related.map((t) => resolveEdgeTarget(safe, t, pathSet));
  }

  const idx = KnowledgeIndex.openForProject(vaultRoot, safe);
  idx.replaceAll(parsed, stamps);
  removeIndexStamp(vaultRoot, safe);
  const dump = idx.graphDump();
  return { notes: dump.nodes.length, edges: dump.edges.length };
}

function syncProjectIndexFiles(vaultRoot: string, slug: string, idx: KnowledgeIndex): void {
  const projectDir = join(vaultRoot, "projects", slug);
  assertProjectPath(vaultRoot, slug, projectDir);

  const current = new Map<string, { abs: string; size: number; mtime_ms: number; ctime_ms: number }>();
  for (const abs of markdownFiles(projectDir)) {
    try {
      const stat = statSync(abs);
      current.set(vaultRelPath(vaultRoot, abs), { abs, size: stat.size, mtime_ms: stat.mtimeMs, ctime_ms: stat.ctimeMs });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  const known = idx.fileStamps();
  const changed = new Map<string, { abs: string; size: number; mtime_ms: number; ctime_ms: number }>();
  for (const [rel, stat] of current) {
    const prev = known.get(rel);
    if (prev && prev.size === stat.size && prev.mtime_ms === stat.mtime_ms && prev.ctime_ms === stat.ctime_ms) continue;
    changed.set(rel, stat);
  }
  const removed: string[] = [];
  for (const rel of known.keys()) {
    if (!current.has(rel)) removed.push(rel);
  }
  if (changed.size === 0 && removed.length === 0) return;

  const parsed: IndexedNote[] = [];
  const stamps: IndexedFileStamp[] = [];
  for (const [rel, stat] of changed) {
    const entry = parseNote(stat.abs, rel, stat);
    if (!entry) continue;
    parsed.push(entry.note);
    stamps.push(entry.stamp);
  }
  const pathSet = new Set(current.keys());
  for (const n of parsed) {
    n.related = n.related.map((t) => resolveEdgeTarget(slug, t, pathSet));
  }
  idx.applyFileChanges(parsed, stamps, removed);
}

export function ensureProjectIndex(vaultRoot: string, slug: string): KnowledgeIndex {
  const safe = validateProjectSlug(slug);
  const idx = KnowledgeIndex.openForProject(vaultRoot, safe);
  const stampExists = existsSync(indexStampFor(vaultRoot, safe));
  if (stampExists && idx.filesCount() === 0) {
    rebuildProjectIndex(vaultRoot, safe);
    return idx;
  }
  if (idx.filesCount() === 0 && idx.noteCount() > 0) {
    rebuildProjectIndex(vaultRoot, safe);
    return idx;
  }
  if (stampExists) removeIndexStamp(vaultRoot, safe);
  syncProjectIndexFiles(vaultRoot, safe, idx);
  return idx;
}

export function upsertVaultFile(vaultRoot: string, vaultRelPath: string, content: string): void {
  const rel = vaultRelPath.replace(/\\/g, "/");
  const m = rel.match(/^projects\/([^/]+)\//);
  if (!m) return;
  const slug = m[1];
  const { data, content: body } = parseFrontmatter(content);
  const idx = ensureProjectIndex(vaultRoot, slug);
  const paths = new Set(idx.graphDump().nodes.map((n) => n.id));
  paths.add(rel);
  const related = extractKnowledgeLinks(data, body).map((t) => resolveEdgeTarget(slug, t, paths));
  const ts = frontmatterTimestamp(data) ?? statMtimeMs(vaultRoot, rel) ?? Date.now();
  idx.applyFileChanges(
    [{
      path: rel,
      type: typeof data.type === "string" ? data.type : "note",
      title: titleFrom(body, rel),
      body,
      related,
      ts,
    }],
    [fileStampFor(vaultRoot, rel, content)],
    [],
  );
}

export function removeVaultFileFromIndex(vaultRoot: string, vaultRelPath: string): void {
  const rel = vaultRelPath.replace(/\\/g, "/");
  const m = rel.match(/^projects\/([^/]+)\//);
  if (!m) return;
  const slug = m[1];
  const dbPath = indexPathFor(vaultRoot, slug);
  if (!existsSync(dbPath)) return;
  KnowledgeIndex.open(dbPath).remove(rel);
}
