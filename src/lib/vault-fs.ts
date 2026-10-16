// SPDX-License-Identifier: Apache-2.0
import { appendFile, open, mkdir, readdir, stat, lstat, realpath, readlink, unlink, rename, link, type FileHandle } from "fs/promises";
import { constants, type Stats } from "fs";
import { join, resolve, relative, dirname, basename, isAbsolute, sep } from "path";
import { randomUUID } from "crypto";
import { homedir, hostname } from "os";
import { scanForSecrets, formatSecretWarnings } from "./secret-scanner.js";
import { logDiagnostic } from "./safe-diagnostics.js";

const VAULT_AUDIT_MAX_BYTES = 5 * 1024 * 1024;
const VAULT_READ_MAX_BYTES = 10 * 1024 * 1024;
const MUTATION_LOCK_MAX_BYTES = 4096;
const MUTATION_LOCK_LEASE_MS = 5 * 60 * 1000;
const MUTATION_LOCK_OWNER_ID = randomUUID();

interface MutationLockIdentity {
  pid: number;
  host: string;
  createdAt?: number;
}

interface MutationLockOwner extends MutationLockIdentity {
  token: string;
  ownerId: string;
  createdAt: number;
}

interface MutationLockSnapshot {
  info: Stats;
  content: string;
  owner: MutationLockIdentity | null;
}

interface VaultWriteAuditEntry {
  ts: string;
  op: "create" | "update" | "delete" | "move";
  path: string;
  bytes: number;
  secretScan: "clean" | "rejected";
  projectSlug?: string;
  from?: string;
}

/** Best-effort audit trail; failures are logged and never break a vault write. */
async function appendVaultWriteAudit(entry: VaultWriteAuditEntry): Promise<void> {
  try {
    const dir = join(homedir(), ".superskill", "audit");
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const file = join(dir, "vault-writes.jsonl");
    try {
      const info = await stat(file);
      if (info.size >= VAULT_AUDIT_MAX_BYTES) await rename(file, `${file}.1`);
    } catch (e: any) {
      if (e.code !== "ENOENT") logDiagnostic("vault.audit-rotation-failed", e);
    }
    await appendFile(file, `${JSON.stringify(entry)}\n`, { encoding: "utf-8", mode: 0o600 });
  } catch (e) {
    logDiagnostic("vault.audit-write-failed", e);
  }
}

/**
 * Safe filesystem operations on the vault.
 * Every path is resolved against the vault root and validated.
 */
export interface VaultFsOptions {
  projectSlug?: string | null;
}

export class VaultFS {
  private readonly _projectSlug: string | null | undefined;

  constructor(private readonly _root: string, options: VaultFsOptions = {}) {
    this._projectSlug = options.projectSlug;
  }

  get root(): string {
    return this._root;
  }

  get projectSlug(): string | null | undefined {
    return this._projectSlug;
  }

  /**
   * Resolve a relative vault path to an absolute path.
   * Rejects traversal attacks, absolute paths, and personal vault access.
   */
  private resolve(relativePath: string): string {
    const jailed = this.jailPath(relativePath);

    // Reject non-ASCII characters (prevents Unicode homoglyph attacks on APFS)
    if (/[^\x20-\x7E]/.test(jailed)) {
      throw new VaultError("PERMISSION_DENIED", `Non-ASCII characters not allowed in paths: ${relativePath}`);
    }

    // Reject absolute paths
    if (jailed.startsWith("/") || jailed.startsWith("~")) {
      throw new VaultError("PERMISSION_DENIED", `Absolute paths not allowed: ${relativePath}`);
    }

    // Reject traversal
    if (jailed.includes("..")) {
      throw new VaultError("PERMISSION_DENIED", `Path traversal not allowed: ${relativePath}`);
    }

    // Reject personal vault references (case-insensitive, segment-level match)
    const segments = jailed.toLowerCase().split("/");
    if (segments.some((seg) => seg === "personal")) {
      throw new VaultError("PERMISSION_DENIED", `Cannot access personal vault: ${relativePath}`);
    }

    const resolved = resolve(this._root, jailed);

    // Double-check the resolved path is within vault
    const rel = relative(this._root, resolved);
    if (rel.startsWith("..")) {
      throw new VaultError("PERMISSION_DENIED", `Path escapes vault: ${relativePath}`);
    }

    return resolved;
  }

  /**
   * When project-scoped, rewrite paths into projects/<slug>/ and deny siblings.
   */
  jailPath(relativePath: string): string {
    const n = relativePath.replace(/\\/g, "/").replace(/^\.\/+/, "");
    const slug = this._projectSlug;

    if (slug === undefined) return n;

    if (slug === null) {
      throw new VaultError("PERMISSION_DENIED", `Vault access denied without a resolved project: ${relativePath}`);
    }

    const prefix = `projects/${slug}`;
    if (n === prefix || n.startsWith(prefix + "/")) return n;
    if (n === "projects" || n.startsWith("projects/")) {
      throw new VaultError("PERMISSION_DENIED", `Cross-project vault access denied: ${relativePath}`);
    }
    if (n === "project-map.json" || n === "" || n === ".") {
      throw new VaultError("PERMISSION_DENIED", `Vault root is not readable from project ${slug}`);
    }
    return `${prefix}/${n}`;
  }

  private auditEntry(
    op: VaultWriteAuditEntry["op"],
    path: string,
    bytes: number,
    secretScan: "clean" | "rejected",
  ): VaultWriteAuditEntry {
    return {
      ts: new Date().toISOString(),
      op,
      path,
      bytes,
      secretScan,
      ...(typeof this._projectSlug === "string" ? { projectSlug: this._projectSlug } : {}),
    };
  }

  async read(relativePath: string): Promise<string> {
    return (await this.readSnapshot(relativePath)).content;
  }

  private async readSnapshot(relativePath: string, expectedPath?: string): Promise<{ content: string; mode: number; info: Stats }> {
    const abs = this.resolve(relativePath);
    try {
      await this.verifyNoSymlinkEscape(relativePath);
      const canonical = await realpath(abs);
      await this.assertCanonicalPath(canonical, relativePath);
      if (expectedPath !== undefined && canonical !== expectedPath) {
        throw new VaultError("PERMISSION_DENIED", `Path changed while reading: ${relativePath}`);
      }
      const handle = await open(canonical, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        const info = await handle.stat();
        await this.assertReadIdentity(relativePath, canonical, info);
        const content = await readBoundedFile(handle, info, VAULT_READ_MAX_BYTES, relativePath);
        await this.assertReadIdentity(relativePath, canonical, info);
        if (!sameFileVersion(info, await handle.stat())) throw new VaultError("FILE_CHANGED", `File changed while reading: ${relativePath}`);
        return { content, mode: info.mode & 0o777, info };
      } finally {
        await handle.close();
      }
    } catch (e: any) {
      if (e.code === "ENOENT") {
        throw new VaultError("FILE_NOT_FOUND", `Not found: ${relativePath}`);
      }
      if (e.code === "ELOOP") throw new VaultError("PERMISSION_DENIED", `Symlink changed while reading: ${relativePath}`);
      throw e;
    }
  }

  private async assertReadIdentity(relativePath: string, canonical: string, info: Stats): Promise<void> {
    await this.verifyNoSymlinkEscape(relativePath);
    await this.assertCanonicalPath(canonical, relativePath);
    const current = await realpath(this.resolve(relativePath));
    const entry = await lstat(canonical);
    if (current !== canonical || entry.isSymbolicLink() || !sameInode(info, entry)) {
      throw new VaultError("PERMISSION_DENIED", `Path changed while reading: ${relativePath}`);
    }
  }

  private async assertCanonicalPath(path: string, display: string): Promise<void> {
    const root = await realpath(this._root);
    const canonical = await realpath(path);
    this.assertInsideVault(root, canonical, display);
    if (typeof this._projectSlug === "string") this.assertInsideVault(join(root, "projects", this._projectSlug), canonical, display);
    if (canonical !== path) throw new VaultError("PERMISSION_DENIED", `Canonical path changed: ${display}`);
  }

  async write(relativePath: string, content: string): Promise<{ path: string; bytes: number }> {
    const { path, bytes } = await this.update(relativePath, () => content, { create: true });
    return { path, bytes };
  }

  async createExclusive(relativePath: string, content: string): Promise<{ path: string; bytes: number }> {
    this.resolve(relativePath);
    const bytes = Buffer.byteLength(content, "utf-8");
    try {
      assertSafeVaultContent(content);
    } catch (e) {
      if (e instanceof VaultError && e.code === "SECRET_REJECTED") {
        await appendVaultWriteAudit(this.auditEntry("create", relativePath, bytes, "rejected"));
      }
      throw e;
    }
    const abs = await this.creationPath(relativePath);
    const lock = await this.acquireMutationLock(abs, 5000);
    const temp = join(dirname(abs), `.${basename(abs)}.${randomUUID()}.tmp`);
    let tempInfo: Stats | undefined;
    try {
      const handle = await open(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      try {
        tempInfo = await handle.stat();
        await this.assertCanonicalPath(temp, relativePath);
        await handle.writeFile(content, "utf-8");
        await handle.sync();
        await this.verifyNoSymlinkEscape(relativePath);
        if (await this.creationPath(relativePath) !== abs || !sameInode(tempInfo, await lstat(temp))) {
          throw new VaultError("PERMISSION_DENIED", `Path changed while creating: ${relativePath}`);
        }
        await lock.assertOwned();
        await link(temp, abs);
      } finally {
        await handle.close();
      }
      await appendVaultWriteAudit(this.auditEntry("create", relativePath, bytes, "clean"));
      return { path: relativePath, bytes };
    } finally {
      try {
        if (tempInfo) await this.unlinkSameInode(temp, tempInfo);
      } catch (e) {
        logDiagnostic("vault.temp-cleanup-failed", e);
      }
      await lock.release();
    }
  }

  async append(relativePath: string, content: string): Promise<{ path: string; bytes: number }> {
    await this.update(relativePath, (current) => current + content);
    return { path: relativePath, bytes: Buffer.byteLength(content, "utf-8") };
  }

  async update(
    relativePath: string,
    transform: (current: string) => string | Promise<string>,
    options: { create?: boolean; timeoutMs?: number; mode?: number } = {},
  ): Promise<{ path: string; bytes: number; content: string }> {
    const timeoutMs = options.timeoutMs ?? 5000;
    if (!Number.isFinite(timeoutMs) || timeoutMs < 0 || timeoutMs > 60000) {
      throw new VaultError("INVALID_ARGUMENT", "Lock timeout must be between 0 and 60000 milliseconds");
    }
    const requestedMode = options.mode;
    if (requestedMode !== undefined && (!Number.isSafeInteger(requestedMode) || requestedMode < 0 || requestedMode > 0o600 || (requestedMode & ~0o600) !== 0)) {
      throw new VaultError("INVALID_ARGUMENT", "Explicit file mode must contain only owner read/write permissions");
    }
    const abs = await this.mutationPath(relativePath);
    const lock = await this.acquireMutationLock(abs, timeoutMs);
    const temp = join(dirname(abs), `.${basename(abs)}.${randomUUID()}.tmp`);
    let tempInfo: Stats | undefined;
    try {
      await this.verifyNoSymlinkEscape(relativePath);
      if (await this.mutationPath(relativePath) !== abs) {
        throw new VaultError("PERMISSION_DENIED", `Path changed while acquiring lock: ${relativePath}`);
      }
      let current = "";
      let mode = requestedMode ?? 0o600;
      let existingMode: number | undefined;
      let existed = false;
      try {
        const snapshot = await this.readSnapshot(relativePath, abs);
        current = snapshot.content;
        existed = true;
        existingMode = snapshot.mode;
        mode = requestedMode ?? snapshot.mode;
      } catch (e: any) {
        if (e.code !== "FILE_NOT_FOUND") throw e;
        if (!options.create) throw new VaultError("FILE_NOT_FOUND", `Not found: ${relativePath}`);
      }
      const content = await transform(current);
      if (existed && content === current && mode === existingMode) return { path: relativePath, bytes: Buffer.byteLength(content, "utf-8"), content };
      const bytes = Buffer.byteLength(content, "utf-8");
      try {
        assertSafeVaultContent(content);
      } catch (e) {
        if (e instanceof VaultError && e.code === "SECRET_REJECTED") {
          await appendVaultWriteAudit(this.auditEntry("update", relativePath, bytes, "rejected"));
        }
        throw e;
      }
      const handle = await open(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      try {
        tempInfo = await handle.stat();
        await this.assertCanonicalPath(temp, relativePath);
        await handle.writeFile(content, "utf-8");
        await handle.chmod(mode);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await this.verifyNoSymlinkEscape(relativePath);
      if (await this.mutationPath(relativePath) !== abs) {
        throw new VaultError("PERMISSION_DENIED", `Path changed while updating: ${relativePath}`);
      }
      if (!sameInode(tempInfo, await lstat(temp))) throw new VaultError("PERMISSION_DENIED", `Temporary file changed while updating: ${relativePath}`);
      await lock.assertOwned();
      await rename(temp, abs);
      await appendVaultWriteAudit(this.auditEntry("update", relativePath, bytes, "clean"));
      return { path: relativePath, bytes, content };
    } finally {
      try {
        if (tempInfo) await this.unlinkSameInode(temp, tempInfo);
      } catch (e) {
        logDiagnostic("vault.temp-cleanup-failed", e);
      }
      await lock.release();
    }
  }

  private async mutationPath(relativePath: string): Promise<string> {
    const abs = this.resolve(relativePath);
    await this.verifyNoSymlinkEscape(relativePath);
    await mkdir(dirname(abs), { recursive: true, mode: 0o700 });
    await this.verifyNoSymlinkEscape(relativePath);
    try {
      const canonical = await realpath(abs);
      await this.assertCanonicalPath(canonical, relativePath);
      return canonical;
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
      try {
        if ((await lstat(abs)).isSymbolicLink()) {
          throw new VaultError("PERMISSION_DENIED", `Cannot mutate a dangling symlink: ${relativePath}`);
        }
      } catch (entryError: any) {
        if (entryError.code !== "ENOENT") throw entryError;
      }
      const parent = await realpath(dirname(abs));
      await this.assertCanonicalPath(parent, relativePath);
      return join(parent, basename(abs));
    }
  }

  private async creationPath(relativePath: string): Promise<string> {
    const abs = this.resolve(relativePath);
    await this.verifyNoSymlinkEscape(relativePath);
    await mkdir(dirname(abs), { recursive: true, mode: 0o700 });
    await this.verifyNoSymlinkEscape(relativePath);
    const parent = await realpath(dirname(abs));
    await this.assertCanonicalPath(parent, relativePath);
    return join(parent, basename(abs));
  }

  private async unlinkSameInode(path: string, info: Stats, expectedMtime?: number): Promise<boolean> {
    try {
      await this.assertCanonicalPath(dirname(path), path);
      const current = await lstat(path);
      if (current.isSymbolicLink() || !sameInode(info, current)) return false;
      if (expectedMtime !== undefined && current.mtimeMs !== expectedMtime) return false;
      await unlink(path);
      return true;
    } catch (e: any) {
      if (e.code === "ENOENT") return false;
      throw e;
    }
  }

  private async readMutationLock(lockPath: string): Promise<MutationLockSnapshot | undefined> {
    try {
      const entry = await lstat(lockPath);
      if (entry.isSymbolicLink()) throw new VaultError("PERMISSION_DENIED", `Symlink lock refused: ${lockPath}`);
      await this.assertCanonicalPath(lockPath, lockPath);
      const handle = await open(lockPath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        const info = await handle.stat();
        if (!sameInode(entry, info)) return undefined;
        await this.assertCanonicalPath(lockPath, lockPath);
        const content = await readBoundedFile(handle, info, MUTATION_LOCK_MAX_BYTES, lockPath);
        const current = await lstat(lockPath);
        if (current.isSymbolicLink() || !sameInode(info, current)) return undefined;
        await this.assertCanonicalPath(lockPath, lockPath);
        return { info: await handle.stat(), content, owner: parseMutationLockOwner(content) };
      } finally {
        await handle.close();
      }
    } catch (e: any) {
      if (e.code === "ENOENT" || e.code === "FILE_CHANGED") return undefined;
      if (e.code === "ELOOP") throw new VaultError("PERMISSION_DENIED", `Symlink lock refused: ${lockPath}`);
      throw e;
    }
  }

  private mutationLockExpired(snapshot: MutationLockSnapshot): boolean {
    if (snapshot.owner?.host === hostname()) {
      try {
        process.kill(snapshot.owner.pid, 0);
        return false;
      } catch (e: any) {
        if (e.code === "ESRCH") return true;
        if (e.code !== "EPERM") logDiagnostic("vault.lock-probe-failed", e);
        return false;
      }
    }
    return Date.now() - Math.max(snapshot.info.mtimeMs, snapshot.owner?.createdAt ?? snapshot.info.mtimeMs) > MUTATION_LOCK_LEASE_MS;
  }

  private async recoverMutationLock(lockPath: string): Promise<boolean> {
    const snapshot = await this.readMutationLock(lockPath);
    if (!snapshot) return true;
    if (!this.mutationLockExpired(snapshot)) return false;
    const current = await this.readMutationLock(lockPath);
    if (!current) return true;
    if (!sameInode(snapshot.info, current.info) || snapshot.content !== current.content || snapshot.info.mtimeMs !== current.info.mtimeMs) return false;
    if (!this.mutationLockExpired(current)) return false;
    return this.unlinkSameInode(lockPath, current.info, current.info.mtimeMs);
  }

  private async acquireMutationLock(abs: string, timeoutMs: number): Promise<{ release: () => Promise<void>; assertOwned: () => Promise<void> }> {
    const lockPath = join(dirname(abs), `.${basename(abs)}.lock`);
    const token = randomUUID();
    const content = JSON.stringify({ token, ownerId: MUTATION_LOCK_OWNER_ID, pid: process.pid, host: hostname(), createdAt: Date.now() } satisfies MutationLockOwner);
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      let handle: FileHandle;
      await this.assertCanonicalPath(dirname(lockPath), lockPath);
      try {
        handle = await open(lockPath, constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      } catch (e: any) {
        if (e.code === "ELOOP") throw new VaultError("PERMISSION_DENIED", `Symlink lock refused: ${lockPath}`);
        if (e.code !== "EEXIST") throw e;
        const recovered = await this.recoverMutationLock(lockPath);
        if (Date.now() >= deadline) {
          throw new VaultError("LOCK_TIMEOUT", `Timed out waiting for vault lock: ${lockPath}`);
        }
        if (recovered) continue;
        await new Promise((resolve) => setTimeout(resolve, Math.min(20, Math.max(1, deadline - Date.now()))));
        continue;
      }
      const info = await handle.stat().catch(async (e: unknown) => {
        await handle.close();
        throw e;
      });
      try {
        await this.assertCanonicalPath(lockPath, lockPath);
        if (!sameInode(info, await lstat(lockPath))) throw new VaultError("LOCK_LOST", `Vault lock ownership changed: ${lockPath}`);
        await handle.writeFile(content, "utf-8");
        await handle.sync();
      } catch (e) {
        try {
          await this.unlinkSameInode(lockPath, info);
        } finally {
          await handle.close();
        }
        throw e;
      }
      const owned = async (): Promise<boolean> => {
        try {
          const current = await this.readMutationLock(lockPath);
          return current !== undefined && sameInode(info, current.info) && current.content === content;
        } catch (e: any) {
          if (e.code === "PERMISSION_DENIED") return false;
          throw e;
        }
      };
      let heartbeat = Promise.resolve();
      const timer = setInterval(() => {
        heartbeat = heartbeat.then(async () => {
          if (await owned()) {
            const now = new Date();
            await handle.utimes(now, now);
          }
        }).catch((e) => { logDiagnostic("vault.heartbeat-failed", e); });
      }, MUTATION_LOCK_LEASE_MS / 3);
      timer.unref();
      return {
        assertOwned: async () => {
          if (!await owned()) throw new VaultError("LOCK_LOST", `Vault lock ownership changed: ${lockPath}`);
        },
        release: async () => {
          clearInterval(timer);
          await heartbeat;
          try {
            if (await owned()) await this.unlinkSameInode(lockPath, info);
          } finally {
            await handle.close();
          }
        },
      };
    }
  }

  async list(relativePath: string, depth: number = 1): Promise<string[]> {
    const abs = this.resolve(relativePath);
    await this.verifyNoSymlinkEscape(relativePath);
    const results: string[] = [];
    await this.listRecursive(abs, relativePath, depth, 0, results);
    return results;
  }

  private async listRecursive(
    absDir: string,
    relDir: string,
    maxDepth: number,
    currentDepth: number,
    results: string[]
  ): Promise<void> {
    if (currentDepth >= maxDepth) return;

    let entries;
    try {
      entries = await readdir(absDir, { withFileTypes: true });
    } catch (e: any) {
      if (e.code === "ENOENT") {
        throw new VaultError("FILE_NOT_FOUND", `Directory not found: ${relDir}`);
      }
      throw e;
    }

    for (const entry of entries) {
      // Skip hidden files/dirs (.obsidian, .git, etc.)
      if (entry.name.startsWith(".")) continue;

      // Skip symlinks to prevent following links outside the vault
      if (entry.isSymbolicLink()) continue;

      const entryRel = relDir ? `${relDir}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        results.push(`${entryRel}/`);
        await this.listRecursive(join(absDir, entry.name), entryRel, maxDepth, currentDepth + 1, results);
      } else {
        results.push(entryRel);
      }
    }
  }

  async deleteIf(relativePath: string, predicate: (current: string) => boolean | Promise<boolean>): Promise<boolean> {
    const abs = this.resolve(relativePath);
    let evaluatingPredicate = false;
    try {
      await this.verifyNoSymlinkEscape(relativePath);
      const canonical = await realpath(abs);
      await this.assertCanonicalPath(canonical, relativePath);
      const lock = await this.acquireMutationLock(canonical, 5000);
      try {
        await this.verifyNoSymlinkEscape(relativePath);
        if (await realpath(abs) !== canonical) return false;
        const entry = await lstat(abs);
        const snapshot = await this.readSnapshot(relativePath, canonical);
        evaluatingPredicate = true;
        const matches = await predicate(snapshot.content);
        evaluatingPredicate = false;
        if (matches !== true) return false;
        await this.verifyNoSymlinkEscape(relativePath);
        if (await realpath(abs) !== canonical) return false;
        await this.assertCanonicalPath(canonical, relativePath);
        await lock.assertOwned();
        if (!sameFileVersion(snapshot.info, await lstat(canonical)) || !sameFileVersion(entry, await lstat(abs))) return false;
        await unlink(abs);
        await appendVaultWriteAudit(this.auditEntry("delete", relativePath, snapshot.info.size, "clean"));
        return true;
      } finally {
        await lock.release();
      }
    } catch (e: any) {
      if (!evaluatingPredicate && (e.code === "ENOENT" || e.code === "FILE_NOT_FOUND" || e.code === "FILE_CHANGED")) return false;
      throw e;
    }
  }

  async delete(relativePath: string): Promise<void> {
    const abs = this.resolve(relativePath);
    const canonical = await this.mutationPath(relativePath);
    const lock = await this.acquireMutationLock(canonical, 5000);
    try {
      await this.verifyNoSymlinkEscape(relativePath);
      if (await this.mutationPath(relativePath) !== canonical) throw new VaultError("PERMISSION_DENIED", `Path changed while deleting: ${relativePath}`);
      await lock.assertOwned();
      let bytes = 0;
      try {
        bytes = (await stat(abs)).size;
      } catch (e: any) {
        if (e.code !== "ENOENT") logDiagnostic("vault.delete-size-failed", e);
      }
      await unlink(abs);
      await appendVaultWriteAudit(this.auditEntry("delete", relativePath, bytes, "clean"));
    } catch (e: any) {
      if (e.code === "ENOENT") throw new VaultError("FILE_NOT_FOUND", `Not found: ${relativePath}`);
      throw e;
    } finally {
      await lock.release();
    }
  }

  async move(relativePath: string, newRelativePath: string): Promise<{ from: string; to: string }> {
    const absFrom = this.resolve(relativePath);
    const absTo = this.resolve(newRelativePath);
    const from = await this.mutationPath(relativePath);
    const to = await this.mutationPath(newRelativePath);
    const locks: Array<{ release: () => Promise<void>; assertOwned: () => Promise<void> }> = [];
    try {
      for (const path of [...new Set([from, to])].sort()) locks.push(await this.acquireMutationLock(path, 5000));
      await this.verifyNoSymlinkEscape(relativePath);
      await this.verifyNoSymlinkEscape(newRelativePath);
      if (await this.mutationPath(relativePath) !== from || await this.mutationPath(newRelativePath) !== to) {
        throw new VaultError("PERMISSION_DENIED", `Path changed while moving: ${relativePath}`);
      }
      for (const lock of locks) await lock.assertOwned();
      await rename(absFrom, absTo);
      let bytes = 0;
      try {
        bytes = (await stat(absTo)).size;
      } catch (e: any) {
        if (e.code !== "ENOENT") logDiagnostic("vault.move-size-failed", e);
      }
      await appendVaultWriteAudit({ ...this.auditEntry("move", newRelativePath, bytes, "clean"), from: relativePath });
    } catch (e: any) {
      if (e.code === "ENOENT") throw new VaultError("FILE_NOT_FOUND", `Not found: ${relativePath}`);
      throw e;
    } finally {
      for (const lock of locks.reverse()) await lock.release();
    }
    return { from: relativePath, to: newRelativePath };
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      const abs = this.resolve(relativePath);
      await this.verifyNoSymlinkEscape(relativePath);
      await stat(abs);
      return true;
    } catch (e: any) {
      if (e instanceof VaultError) throw e;
      if (e.code === "ENOENT" || e.code === "ENOTDIR") return false;
      throw e;
    }
  }

  /**
   * Verify a path doesn't follow symlinks outside the vault.
   *
   * Checks the target if it exists, then walks up to the deepest existing
   * ancestor (lstat) and verifies its realpath stays inside the vault. This
   * also covers new files created through a symlinked directory and dangling
   * symlinks, which would otherwise be followed on write.
   */
  async verifyNoSymlinkEscape(relativePath: string): Promise<void> {
    const abs = this.resolve(relativePath);
    const root = resolve(this._root);

    let realRoot: string;
    try {
      realRoot = await realpath(root);
    } catch (e: any) {
      if (e.code === "ENOENT") realRoot = root;
      else throw e;
    }

    await this.verifyPathInsideVault(relativePath, abs, realRoot, root);
    if (this._projectSlug) {
      const scopedRoot = resolve(root, "projects", this._projectSlug);
      const realScopedRoot = resolve(realRoot, "projects", this._projectSlug);
      await this.verifyPathInsideVault(relativePath, abs, realScopedRoot, scopedRoot);
    }
  }

  private async verifyPathInsideVault(
    display: string,
    absPath: string,
    realRoot: string,
    root: string,
    depth = 0
  ): Promise<void> {
    if (depth > 32) {
      throw new VaultError("PERMISSION_DENIED", `Symlink chain too deep: ${display}`);
    }

    let current = absPath;
    while (this.isWithin(root, current) || this.isWithin(realRoot, current)) {
      this.assertNoPersonalSegment(this.isWithin(root, current) ? root : realRoot, current, display);
      let entry;
      try {
        entry = await lstat(current);
      } catch (e: any) {
        if (e.code === "ENOENT") {
          current = dirname(current);
          continue;
        }
        throw e;
      }

      if (entry.isSymbolicLink()) {
        const linkTarget = resolve(dirname(current), await readlink(current));
        if (!this.isWithin(root, linkTarget) && !this.isWithin(realRoot, linkTarget)) {
          throw new VaultError("PERMISSION_DENIED", `Symlink escapes vault: ${display}`);
        }
        return this.verifyPathInsideVault(display, linkTarget, realRoot, root, depth + 1);
      }

      const realCurrent = await realpath(current);
      this.assertInsideVault(realRoot, realCurrent, display);
      return;
    }
  }

  private isWithin(parent: string, child: string): boolean {
    const rel = relative(parent, child);
    return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  }

  private assertInsideVault(realRoot: string, realTarget: string, display: string): void {
    if (!this.isWithin(realRoot, realTarget)) {
      throw new VaultError("PERMISSION_DENIED", `Symlink escapes vault: ${display}`);
    }
    this.assertNoPersonalSegment(realRoot, realTarget, display);
  }

  private assertNoPersonalSegment(root: string, target: string, display: string): void {
    if (relative(root, target).split(sep).some((segment) => segment.toLowerCase() === "personal")) {
      throw new VaultError("PERMISSION_DENIED", `Cannot access personal vault: ${display}`);
    }
  }
}

function sameInode(left: Stats, right: Stats): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function sameFileVersion(left: Stats, right: Stats): boolean {
  return sameInode(left, right) && left.size === right.size && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs;
}

async function readBoundedFile(handle: FileHandle, info: Stats, maxBytes: number, display: string): Promise<string> {
  if (!info.isFile()) throw new VaultError("INVALID_ARGUMENT", `Not a regular file: ${display}`);
  if (info.size > maxBytes) throw new VaultError("FILE_TOO_LARGE", `File exceeds ${maxBytes} bytes: ${display}`);
  const buffer = Buffer.alloc(info.size + 1);
  let total = 0;
  while (total < buffer.length) {
    const { bytesRead } = await handle.read(buffer, total, buffer.length - total, total);
    if (bytesRead === 0) break;
    total += bytesRead;
  }
  const after = await handle.stat();
  if (after.size > maxBytes || total > maxBytes) throw new VaultError("FILE_TOO_LARGE", `File exceeds ${maxBytes} bytes: ${display}`);
  if (after.size !== info.size || total !== info.size) throw new VaultError("FILE_CHANGED", `File changed while reading: ${display}`);
  return buffer.toString("utf-8", 0, total);
}

function parseMutationLockOwner(content: string): MutationLockIdentity | null {
  try {
    const owner = JSON.parse(content);
    if (owner && Number.isSafeInteger(owner.pid) && owner.pid > 0 && typeof owner.host === "string" && owner.host.length > 0) {
      return { pid: owner.pid, host: owner.host, ...(Number.isFinite(owner.createdAt) && owner.createdAt > 0 ? { createdAt: owner.createdAt } : {}) };
    }
  } catch (e) {
    if (!(e instanceof SyntaxError)) throw e;
  }
  return null;
}

export class VaultError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "VaultError";
  }
}

export function assertSafeVaultContent(content: string): void {
  const matches = scanForSecrets(content);
  if (matches.length > 0) throw new VaultError("SECRET_REJECTED", formatSecretWarnings(matches));
}
