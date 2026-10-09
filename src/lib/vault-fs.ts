// SPDX-License-Identifier: Apache-2.0
import { readFile, open, mkdir, readdir, stat, lstat, realpath, readlink, unlink, rename } from "fs/promises";
import { join, resolve, relative, dirname, basename, isAbsolute } from "path";
import { randomUUID } from "crypto";
import { scanForSecrets, formatSecretWarnings } from "./secret-scanner.js";

/**
 * Safe filesystem operations on the vault.
 * Every path is resolved against the vault root and validated.
 */
export interface VaultFsOptions {
  /** Jail all IO under projects/<slug>/. null denies every projects/ path. */
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
      if (n === "projects" || n.startsWith("projects/") || n === "project-map.json" || n === "" || n === ".") {
        throw new VaultError("PERMISSION_DENIED", `Project vault access denied without a resolved project: ${relativePath}`);
      }
      return n;
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

  async read(relativePath: string): Promise<string> {
    const abs = this.resolve(relativePath);
    await this.verifyNoSymlinkEscape(relativePath);
    try {
      return await readFile(abs, "utf-8");
    } catch (e: any) {
      if (e.code === "ENOENT") {
        throw new VaultError("FILE_NOT_FOUND", `Not found: ${relativePath}`);
      }
      throw e;
    }
  }

  async write(relativePath: string, content: string): Promise<{ path: string; bytes: number }> {
    const { path, bytes } = await this.update(relativePath, () => content, { create: true });
    return { path, bytes };
  }

  async append(relativePath: string, content: string): Promise<{ path: string; bytes: number }> {
    await this.update(relativePath, (current) => current + content);
    return { path: relativePath, bytes: Buffer.byteLength(content, "utf-8") };
  }

  async update(
    relativePath: string,
    transform: (current: string) => string | Promise<string>,
    options: { create?: boolean; timeoutMs?: number } = {},
  ): Promise<{ path: string; bytes: number; content: string }> {
    const timeoutMs = options.timeoutMs ?? 5000;
    if (!Number.isFinite(timeoutMs) || timeoutMs < 0 || timeoutMs > 60000) {
      throw new VaultError("INVALID_ARGUMENT", "Lock timeout must be between 0 and 60000 milliseconds");
    }
    const abs = await this.mutationPath(relativePath);
    const lock = await this.acquireMutationLock(abs, timeoutMs);
    const temp = join(dirname(abs), `.${basename(abs)}.${randomUUID()}.tmp`);
    try {
      await this.verifyNoSymlinkEscape(relativePath);
      if (await this.mutationPath(relativePath) !== abs) {
        throw new VaultError("PERMISSION_DENIED", `Path changed while acquiring lock: ${relativePath}`);
      }
      let current = "";
      let mode = 0o600;
      let existed = false;
      try {
        current = await readFile(abs, "utf-8");
        existed = true;
        mode = (await stat(abs)).mode & 0o777;
      } catch (e: any) {
        if (e.code !== "ENOENT") throw e;
        if (!options.create) throw new VaultError("FILE_NOT_FOUND", `Not found: ${relativePath}`);
      }
      const content = await transform(current);
      if (existed && content === current) return { path: relativePath, bytes: Buffer.byteLength(content, "utf-8"), content };
      assertSafeVaultContent(content);
      const handle = await open(temp, "wx", mode);
      try {
        await handle.writeFile(content, "utf-8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      await this.verifyNoSymlinkEscape(relativePath);
      if (await this.mutationPath(relativePath) !== abs) {
        throw new VaultError("PERMISSION_DENIED", `Path changed while updating: ${relativePath}`);
      }
      await lock.assertOwned();
      await rename(temp, abs);
      return { path: relativePath, bytes: Buffer.byteLength(content, "utf-8"), content };
    } finally {
      try {
        await unlink(temp);
      } catch (e: any) {
        if (e.code !== "ENOENT") console.error("[vault-fs] Could not remove temporary file:", e);
      }
      await lock.release();
    }
  }

  private async mutationPath(relativePath: string): Promise<string> {
    const abs = this.resolve(relativePath);
    await this.verifyNoSymlinkEscape(relativePath);
    await mkdir(dirname(abs), { recursive: true });
    try {
      return await realpath(abs);
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
      try {
        if ((await lstat(abs)).isSymbolicLink()) {
          throw new VaultError("PERMISSION_DENIED", `Cannot mutate a dangling symlink: ${relativePath}`);
        }
      } catch (entryError: any) {
        if (entryError.code !== "ENOENT") throw entryError;
      }
      return join(await realpath(dirname(abs)), basename(abs));
    }
  }

  private async acquireMutationLock(abs: string, timeoutMs: number): Promise<{ release: () => Promise<void>; assertOwned: () => Promise<void> }> {
    const lockPath = join(dirname(abs), `.${basename(abs)}.lock`);
    const token = randomUUID();
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      let handle;
      try {
        handle = await open(lockPath, "wx", 0o600);
      } catch (e: any) {
        if (e.code !== "EEXIST") throw e;
        try {
          if ((await lstat(lockPath)).isSymbolicLink()) {
            throw new VaultError("PERMISSION_DENIED", `Symlink lock refused: ${lockPath}`);
          }
        } catch (entryError: any) {
          if (entryError.code === "ENOENT") continue;
          throw entryError;
        }
        if (Date.now() >= deadline) {
          throw new VaultError("LOCK_TIMEOUT", `Timed out waiting for vault lock: ${lockPath}. Remove abandoned locks only after confirming the owner has stopped.`);
        }
        await new Promise((resolve) => setTimeout(resolve, Math.min(20, Math.max(1, deadline - Date.now()))));
        continue;
      }
      try {
        await handle.writeFile(token, "utf-8");
      } catch (e) {
        await handle.close();
        await unlink(lockPath);
        throw e;
      }
      await handle.close();
      const owned = async (): Promise<boolean> => {
        try {
          const entry = await lstat(lockPath);
          return !entry.isSymbolicLink() && await readFile(lockPath, "utf-8") === token;
        } catch (e: any) {
          if (e.code === "ENOENT") return false;
          throw e;
        }
      };
      return {
        assertOwned: async () => {
          if (!await owned()) throw new VaultError("LOCK_LOST", `Vault lock ownership changed: ${lockPath}`);
        },
        release: async () => {
          if (await owned()) await unlink(lockPath);
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

  async delete(relativePath: string): Promise<void> {
    const abs = this.resolve(relativePath);
    const canonical = await this.mutationPath(relativePath);
    const lock = await this.acquireMutationLock(canonical, 5000);
    try {
      await this.verifyNoSymlinkEscape(relativePath);
      if (await this.mutationPath(relativePath) !== canonical) throw new VaultError("PERMISSION_DENIED", `Path changed while deleting: ${relativePath}`);
      await lock.assertOwned();
      await unlink(abs);
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
      await stat(abs);
      return true;
    } catch (e) {
      if (e instanceof VaultError) throw e;
      return false;
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
    while (this.isWithin(root, current)) {
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
  }
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
