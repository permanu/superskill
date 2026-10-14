// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { closeSync, constants, existsSync, fstatSync, lstatSync, mkdirSync, openSync, readSync, readdirSync, realpathSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve, isAbsolute } from "node:path";
import { parseFrontmatter, type Frontmatter } from "./frontmatter.js";
import { validateProjectSlug } from "../config.js";

export const INDEX_FILENAME = ".knowledge-index.sqlite";

const SCHEMA_VERSION = 1;
const OPEN_DB_LIMIT = 32;
const MAX_GRAPH_ROWS = 1000;
const MAX_NOTE_BYTES = 8 * 1024 * 1024;
const MAX_INDEX_BYTES = 64 * 1024 * 1024;
const MAX_PROJECT_FILES = 50_000;
const SNAPSHOT_FRESH_MS = 500;
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
const SOLE_WIKILINK_RE = /^\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]$/;

const openDbs = new Map<string, KnowledgeIndex>();
const busyDbs = new Set<KnowledgeIndex>();
const snapshots = new WeakMap<KnowledgeIndex, { checkedAt: number; entries: Map<string, string> }>();

function boundedInteger(value: number, name: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) throw new RangeError(`${name} must be an integer between ${min} and ${max}`);
  return value;
}

function schemaVersion(db: DatabaseSync): number {
  const version = (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
  if (!Number.isInteger(version) || version < 0 || version > SCHEMA_VERSION) throw new Error(`Unsupported knowledge index schema version ${version}; supported version is ${SCHEMA_VERSION}`);
  return version;
}

function stampOf(path: string): string {
  const stat = lstatSync(path);
  return JSON.stringify([stat.mode, stat.ino, stat.dev, stat.size, stat.mtimeMs, stat.ctimeMs]);
}

function snapshotFresh(idx: KnowledgeIndex): boolean {
  const snapshot = snapshots.get(idx);
  if (!snapshot || Date.now() - snapshot.checkedAt > SNAPSHOT_FRESH_MS) return false;
  for (const [path, stamp] of snapshot.entries) {
    try {
      if (stampOf(path) !== stamp) return false;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error(`[knowledge-index] cannot validate ${path}: ${String(error)}`);
      return false;
    }
  }
  return true;
}

function normalizeRelatedValue(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(SOLE_WIKILINK_RE);
  return match ? match[1].trim() : trimmed;
}

export function extractKnowledgeLinks(data: Frontmatter, body: string): string[] {
  const out: string[] = [];
  if (Array.isArray(data.related)) {
    for (const r of data.related) {
      if (typeof r === "string" && r.trim()) out.push(normalizeRelatedValue(r));
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
      if (rel === ".." || rel.startsWith("../") || isAbsolute(rel) || rel.split(/[\\/]/).some(part => part.toLowerCase() === "personal")) throw new Error(`Index path escapes project ${slug}: ${target}`);
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
    private readonly identity: string,
  ) {}

  static open(dbPath: string): KnowledgeIndex {
    dbPath = resolve(dbPath);
    mkdirSync(dirname(dbPath), { recursive: true });
    try {
      dbPath = realpathSync(dbPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      try {
        if (lstatSync(dbPath).isSymbolicLink()) throw new Error(`Dangling index symlink: ${dbPath}`);
      } catch (statError) {
        if ((statError as NodeJS.ErrnoException).code !== "ENOENT") throw statError;
      }
      dbPath = join(realpathSync(dirname(dbPath)), basename(dbPath));
    }
    const existing = openDbs.get(dbPath);
    if (existing) {
      const stat = statSync(dbPath);
      if (existing.identity === `${stat.dev}:${stat.ino}`) {
        schemaVersion(existing.db);
        openDbs.delete(dbPath);
        openDbs.set(dbPath, existing);
        return existing;
      }
      if (busyDbs.has(existing)) throw new Error(`Knowledge index replaced during a transaction: ${dbPath}`);
      existing.close();
    }
    const db = new DatabaseSync(dbPath);
    try {
      const capability = db.prepare("SELECT sqlite_compileoption_used('ENABLE_FTS5') AS enabled").get() as { enabled: number };
      if (capability.enabled !== 1) {
        throw new Error("SuperSkill requires Node.js 22.16+ or 24+ with SQLite FTS5 enabled. Install an official supported Node.js runtime and retry.");
      }
      const version = schemaVersion(db);
      db.exec("PRAGMA busy_timeout = 2000");
      db.exec("PRAGMA journal_mode = WAL");
      db.exec("PRAGMA foreign_keys = ON");
      if (version < SCHEMA_VERSION) {
        db.exec("BEGIN IMMEDIATE");
        try {
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
          db.exec("INSERT INTO notes_fts(notes_fts) VALUES ('rebuild')");
          db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      }
    } catch (error) {
      db.close();
      throw error;
    }
    const stat = statSync(dbPath);
    const idx = new KnowledgeIndex(db, dbPath, `${stat.dev}:${stat.ino}`);
    cacheDb(dbPath, idx);
    return idx;
  }

  static openForProject(vaultRoot: string, slug: string): KnowledgeIndex {
    const path = indexPathFor(vaultRoot, slug);
    for (const suffix of ["-wal", "-shm"]) assertProjectPath(vaultRoot, slug, `${path}${suffix}`);
    return KnowledgeIndex.open(path);
  }

  upsert(note: IndexedNote): void {
    const type = note.type || "note";
    const body = indexedBody(type, note.body);
    const title = note.title || titleFrom(body, note.path);
    const ts = typeof note.ts === "number" && Number.isFinite(note.ts) ? note.ts : Date.now();
    this.db.exec("SAVEPOINT knowledge_note");
    try {
      this.db.prepare(
        `INSERT INTO notes(path, type, title, body, ts) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(path) DO UPDATE SET type=excluded.type, title=excluded.title, body=excluded.body, ts=excluded.ts`,
      ).run(note.path, type, title, body, ts);
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
    boundedInteger(limit, "limit", 0, MAX_GRAPH_ROWS);
    if (limit === 0) return [];
    if (query.length > 4096) throw new RangeError("query must not exceed 4096 characters");
    const tokens = tokenizeQuery(query).slice(0, 64);
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
    const depth = boundedInteger(hops, "hops", 1, 8);
    const seen = new Set([path]);
    let frontier = [path];
    const adjacent = this.db.prepare(`SELECT DISTINCT CASE WHEN "from" = ? THEN "to" ELSE "from" END AS id FROM edges WHERE "from" = ? OR "to" = ? ORDER BY id LIMIT ?`);
    for (let hop = 0; hop < depth && frontier.length > 0 && seen.size <= MAX_GRAPH_ROWS; hop++) {
      const next: string[] = [];
      for (const id of frontier) {
        const rows = adjacent.all(id, id, id, MAX_GRAPH_ROWS + 1) as Array<{ id: string }>;
        for (const row of rows) {
          if (seen.has(row.id)) continue;
          seen.add(row.id);
          next.push(row.id);
          if (seen.size > MAX_GRAPH_ROWS) break;
        }
        if (seen.size > MAX_GRAPH_ROWS) break;
      }
      frontier = next;
    }
    seen.delete(path);
    return [...seen];
  }

  outgoing(path: string): string[] {
    const rows = this.db.prepare(`SELECT DISTINCT "to" AS id FROM edges WHERE "from" = ? ORDER BY id LIMIT ?`).all(path, MAX_GRAPH_ROWS) as Array<{ id: string }>;
    return rows.map((r) => r.id);
  }

  incoming(path: string): string[] {
    const rows = this.db.prepare(`SELECT DISTINCT "from" AS id FROM edges WHERE "to" = ? ORDER BY id LIMIT ?`).all(path, MAX_GRAPH_ROWS) as Array<{ id: string }>;
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
    busyDbs.add(this);
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
    } finally {
      busyDbs.delete(this);
      if (!this.closed) {
        openDbs.delete(this.dbPath);
        openDbs.set(this.dbPath, this);
      }
      trimDbCache(this);
    }
  }

  clear(): void {
    this.db.exec("DELETE FROM edges; DELETE FROM notes; DELETE FROM files;");
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    snapshots.delete(this);
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
  trimDbCache(index);
}

function trimDbCache(keep?: KnowledgeIndex): void {
  while (openDbs.size > OPEN_DB_LIMIT) {
    const oldest = [...openDbs.keys()].find(path => openDbs.get(path) !== keep && !busyDbs.has(openDbs.get(path)!));
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

function walkMarkdown(dir: string, acc: string[], stamps: Map<string, string>, depth = 0): void {
  if (depth > 128 || stamps.size >= MAX_PROJECT_FILES * 2) throw new Error("Knowledge index directory limit exceeded");
  let entries;
  try {
    const stat = lstatSync(dir);
    if (!stat.isDirectory()) return;
    stamps.set(dir, stampOf(dir));
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`[knowledge-index] cannot list ${dir}: ${String(error)}`);
      throw error;
    }
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name.toLowerCase() === "personal") continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist") continue;
      walkMarkdown(full, acc, stamps, depth + 1);
    } else if (e.isFile() && e.name.endsWith(".md")) {
      if (acc.length >= MAX_PROJECT_FILES) throw new Error("Knowledge index file limit exceeded");
      acc.push(full);
      try { stamps.set(full, stampOf(full)); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    }
  }
}

function buildBasenameIndex(paths: Iterable<string>): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const path of [...paths].sort()) {
    const base = path.split("/").pop();
    if (!base) continue;
    const list = index.get(base);
    if (list) list.push(path);
    else index.set(base, [path]);
  }
  return index;
}

function resolveEdgeTarget(slug: string, raw: string, paths: Set<string>, basenames: Map<string, string[]>): string | null {
  const target = raw.replace(/\\/g, "/").replace(/^\.\/+/, "");
  if (!target || isAbsolute(target) || target.includes("\0") || target.split("/").some(part => part === "." || part === "..") || (target.startsWith("projects/") && !target.startsWith(`projects/${slug}/`))) return null;
  const prefixed = `projects/${slug}/${target}`;
  const candidates = target.startsWith("projects/")
    ? [target, `${target}.md`]
    : [target, `${target}.md`, prefixed, `${prefixed}.md`];
  for (const candidate of candidates) {
    if (paths.has(candidate)) return candidate;
  }
  const base = target.split("/").pop() ?? target;
  const basenameMatch = basenames.get(base) ?? basenames.get(`${base}.md`);
  if (basenameMatch && basenameMatch.length > 0) return basenameMatch[0];
  if (target.startsWith("projects/")) return target;
  return target.includes(".") ? prefixed : `${prefixed}.md`;
}

function stripFencedCodeBlocks(body: string): string {
  const lines = body.split("\n");
  const kept: string[] = [];
  let fence: string | null = null;
  for (const line of lines) {
    const match = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence === null) {
      if (match) fence = match[1];
      else kept.push(line);
      continue;
    }
    if (match && match[1][0] === fence[0] && match[1].length >= fence.length && line.slice(match[0].length).trim() === "") fence = null;
  }
  return kept.join("\n");
}

function indexedBody(type: string, body: string): string {
  return type === "code" ? stripFencedCodeBlocks(body) : body;
}

function markdownFiles(projectDir: string, stamps: Map<string, string>): string[] {
  const files: string[] = [];
  walkMarkdown(projectDir, files, stamps);
  return files;
}

function readProjectNote(absPath: string, boundary: string): string {
  const canonical = realpathSync(absPath);
  const rel = relative(boundary, canonical);
  if (rel === "" || rel === ".." || rel.startsWith("../") || isAbsolute(rel)) throw new Error(`Index path escapes project: ${absPath}`);
  const fd = openSync(canonical, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    const current = lstatSync(canonical);
    if (!stat.isFile() || stat.ino !== current.ino || stat.dev !== current.dev || realpathSync(absPath) !== canonical) throw new Error(`Index note is not a stable regular file: ${absPath}`);
    if (stat.size > MAX_NOTE_BYTES) throw new Error(`Knowledge note exceeds ${MAX_NOTE_BYTES} bytes: ${absPath}`);
    const buffer = Buffer.alloc(stat.size + 1);
    let used = 0;
    while (used < buffer.length) {
      const count = readSync(fd, buffer, used, buffer.length - used, used);
      if (count === 0) break;
      used += count;
    }
    if (used > stat.size) throw new Error(`Knowledge note grew during read: ${absPath}`);
    const after = fstatSync(fd);
    const currentAfter = lstatSync(canonical);
    if (after.size !== stat.size || after.mtimeMs !== stat.mtimeMs || after.ctimeMs !== stat.ctimeMs || currentAfter.ino !== stat.ino || currentAfter.dev !== stat.dev || realpathSync(absPath) !== canonical) throw new Error(`Knowledge note changed during read: ${absPath}`);
    return buffer.subarray(0, used).toString("utf8");
  } finally { closeSync(fd); }
}

function parseNote(absPath: string, relPath: string, stat: { size: number; mtime_ms: number; ctime_ms: number }, boundary: string): { note: IndexedNote; stamp: IndexedFileStamp } | null {
  if (stat.size > MAX_NOTE_BYTES) throw new Error(`Knowledge note exceeds ${MAX_NOTE_BYTES} bytes: ${relPath}`);
  let raw: string;
  try {
    raw = readProjectNote(absPath, boundary);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return null;
  }
  const { data, content } = parseFrontmatter(raw);
  const type = typeof data.type === "string" ? data.type : "note";
  const body = indexedBody(type, content);
  return {
    note: {
      path: relPath,
      type,
      title: titleFrom(body, relPath),
      body,
      related: extractKnowledgeLinks(data, body),
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
  const snapshot = new Map<string, string>();
  const pathSet = new Set<string>();
  let totalBytes = 0;
  for (const abs of markdownFiles(projectDir, snapshot)) {
    assertProjectPath(vaultRoot, safe, abs);
    const rel = vaultRelPath(vaultRoot, abs);
    let fileStat;
    try {
      fileStat = statSync(abs);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      continue;
    }
    totalBytes += fileStat.size;
    if (totalBytes > MAX_INDEX_BYTES) throw new Error(`Knowledge project exceeds ${MAX_INDEX_BYTES} indexed bytes: ${safe}`);
    const entry = parseNote(abs, rel, { size: fileStat.size, mtime_ms: fileStat.mtimeMs, ctime_ms: fileStat.ctimeMs }, join(realpathSync(vaultRoot), "projects", safe));
    if (!entry) continue;
    parsed.push(entry.note);
    stamps.push(entry.stamp);
    pathSet.add(rel);
  }

  const basenames = buildBasenameIndex(pathSet);
  for (const n of parsed) {
    n.related = n.related.map((t) => resolveEdgeTarget(safe, t, pathSet, basenames)).filter((target): target is string => target !== null);
  }

  const idx = KnowledgeIndex.openForProject(vaultRoot, safe);
  idx.replaceAll(parsed, stamps);
  removeIndexStamp(vaultRoot, safe);
  snapshots.set(idx, { checkedAt: Date.now(), entries: snapshot });
  const dump = idx.graphDump();
  return { notes: dump.nodes.length, edges: dump.edges.length };
}

function syncProjectIndexFiles(vaultRoot: string, slug: string, idx: KnowledgeIndex): void {
  const projectDir = join(vaultRoot, "projects", slug);
  assertProjectPath(vaultRoot, slug, projectDir);

  const current = new Map<string, { abs: string; size: number; mtime_ms: number; ctime_ms: number }>();
  const snapshot = new Map<string, string>();
  let totalBytes = 0;
  for (const abs of markdownFiles(projectDir, snapshot)) {
    assertProjectPath(vaultRoot, slug, abs);
    try {
      const stat = statSync(abs);
      totalBytes += stat.size;
      if (totalBytes > MAX_INDEX_BYTES) throw new Error(`Knowledge project exceeds ${MAX_INDEX_BYTES} indexed bytes: ${slug}`);
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
  if (changed.size === 0 && removed.length === 0) {
    snapshots.set(idx, { checkedAt: Date.now(), entries: snapshot });
    return;
  }

  const parsed: IndexedNote[] = [];
  const stamps: IndexedFileStamp[] = [];
  for (const [rel, stat] of changed) {
    const entry = parseNote(stat.abs, rel, stat, join(realpathSync(vaultRoot), "projects", slug));
    if (!entry) continue;
    parsed.push(entry.note);
    stamps.push(entry.stamp);
  }
  const pathSet = new Set(current.keys());
  const basenames = buildBasenameIndex(pathSet);
  for (const n of parsed) {
    n.related = n.related.map((t) => resolveEdgeTarget(slug, t, pathSet, basenames)).filter((target): target is string => target !== null);
  }
  idx.applyFileChanges(parsed, stamps, removed);
  snapshots.set(idx, { checkedAt: Date.now(), entries: snapshot });
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
  if (!stampExists && snapshotFresh(idx)) return idx;
  syncProjectIndexFiles(vaultRoot, safe, idx);
  return idx;
}

export function upsertVaultFile(vaultRoot: string, vaultRelPath: string, content: string): void {
  const rel = vaultRelPath.replace(/\\/g, "/");
  const m = rel.match(/^projects\/([^/]+)\//);
  if (!m) return;
  const slug = m[1];
  assertProjectPath(vaultRoot, validateProjectSlug(slug), join(vaultRoot, rel));
  if (Buffer.byteLength(content, "utf8") > MAX_NOTE_BYTES) throw new Error(`Knowledge note exceeds ${MAX_NOTE_BYTES} bytes: ${rel}`);
  const { data, content: rawBody } = parseFrontmatter(content);
  const type = typeof data.type === "string" ? data.type : "note";
  const body = indexedBody(type, rawBody);
  const idx = ensureProjectIndex(vaultRoot, slug);
  const paths = new Set(idx.graphDump().nodes.map((n) => n.id));
  paths.add(rel);
  const basenames = buildBasenameIndex(paths);
  const related = extractKnowledgeLinks(data, body).map((t) => resolveEdgeTarget(slug, t, paths, basenames)).filter((target): target is string => target !== null);
  const ts = frontmatterTimestamp(data) ?? statMtimeMs(vaultRoot, rel) ?? Date.now();
  idx.applyFileChanges(
    [{
      path: rel,
      type,
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
  assertProjectPath(vaultRoot, validateProjectSlug(slug), join(vaultRoot, rel));
  const dbPath = indexPathFor(vaultRoot, slug);
  if (!existsSync(dbPath)) return;
  KnowledgeIndex.open(dbPath).remove(rel);
}
