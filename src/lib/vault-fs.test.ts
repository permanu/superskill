import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, readFile, rm, symlink } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { pathToFileURL } from "url";
import { transpileModule, ModuleKind, ScriptTarget } from "typescript";
import { homedir } from "os";
import { join, dirname } from "path";
import { VaultFS, VaultError } from "./vault-fs.js";

describe("VaultFS", () => {
  let vaultRoot: string;
  let vaultFs: VaultFS;

  beforeEach(async () => {
    vaultRoot = join(homedir(), `.vault-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(vaultRoot, { recursive: true });
    vaultFs = new VaultFS(vaultRoot);
  });

  afterEach(async () => {
    await rm(vaultRoot, { recursive: true, force: true });
  });

  describe("atomic updates", () => {
    it("serializes updates across independent operating system processes", async () => {
      const modules = join(vaultRoot, "worker-modules");
      await mkdir(modules);
      await writeFile(join(modules, "package.json"), '{"type":"module"}');
      for (const name of ["vault-fs", "secret-scanner"]) {
        const source = await readFile(new URL(`./${name}.ts`, import.meta.url), "utf-8");
        await writeFile(join(modules, `${name}.js`), transpileModule(source, { compilerOptions: { module: ModuleKind.ES2022, target: ScriptTarget.ES2022 } }).outputText);
      }
      await vaultFs.write("counter.md", "0");
      const script = `import { VaultFS } from ${JSON.stringify(pathToFileURL(join(modules, "vault-fs.js")).href)};
        const fs = new VaultFS(process.argv[1]);
        for (let i = 0; i < 8; i++) await fs.update("counter.md", async (current) => {
          await new Promise((resolve) => setTimeout(resolve, 3));
          return String(Number(current) + 1);
        });`;
      await Promise.all(Array.from({ length: 4 }, () => promisify(execFile)(process.execPath, ["--input-type=module", "-e", script, vaultRoot])));
      expect(await vaultFs.read("counter.md")).toBe("32");
    }, 15000);

    it("rejects unsafe paths, lock symlinks, invalid timeouts, and missing update targets", async () => {
      await expect(vaultFs.update("../escape.md", () => "bad")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
      await expect(vaultFs.update("missing.md", () => "bad")).rejects.toMatchObject({ code: "FILE_NOT_FOUND" });
      await expect(vaultFs.update("note.md", () => "bad", { timeoutMs: NaN })).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
      await vaultFs.write("note.md", "original");
      await symlink(join(vaultRoot, "note.md"), join(vaultRoot, ".note.md.lock"));
      await expect(vaultFs.update("note.md", () => "bad")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
      expect(await vaultFs.read("note.md")).toBe("original");
    });

    it("preserves concurrent updates from independent VaultFS instances", async () => {
      await vaultFs.write("counter.md", "0");
      await Promise.all(Array.from({ length: 12 }, () => new VaultFS(vaultRoot).update("counter.md", async (current) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return String(Number(current) + 1);
      })));
      expect(await vaultFs.read("counter.md")).toBe("12");
    });

    it("keeps the original and releases its lock after transform or secret rejection", async () => {
      await vaultFs.write("note.md", "original");
      await expect(vaultFs.update("note.md", () => { throw new Error("aborted"); })).rejects.toThrow("aborted");
      await expect(vaultFs.update("note.md", () => `ghp_${"A".repeat(36)}`)).rejects.toMatchObject({ code: "SECRET_REJECTED" });
      expect(await vaultFs.read("note.md")).toBe("original");
      await vaultFs.update("note.md", (current) => current + " updated");
      expect(await vaultFs.read("note.md")).toBe("original updated");
    });

    it.each(["delete", "move"] as const)("coordinates %s with a pending update", async (operation) => {
      await vaultFs.write("note.md", "original");
      let unlock!: () => void;
      let entered!: () => void;
      const ready = new Promise<void>((resolve) => { entered = resolve; });
      const held = new Promise<void>((resolve) => { unlock = resolve; });
      const update = vaultFs.update("note.md", async (current) => { entered(); await held; return current + " updated"; });
      await ready;
      let finished = false;
      const mutation = (operation === "delete" ? vaultFs.delete("note.md") : vaultFs.move("note.md", "moved.md")).then(() => { finished = true; });
      await new Promise((resolve) => setTimeout(resolve, 30));
      const prematurelyFinished = finished;
      unlock();
      await Promise.all([update, mutation]);
      expect(prematurelyFinished).toBe(false);
      expect(await vaultFs.exists("note.md")).toBe(false);
      if (operation === "move") expect(await vaultFs.read("moved.md")).toBe("original updated");
    });

    it("fails closed when ownership is replaced during a transform", async () => {
      await vaultFs.write("note.md", "original");
      const lockPath = join(vaultRoot, ".note.md.lock");
      await expect(vaultFs.update("note.md", async () => {
        await rm(lockPath);
        await writeFile(lockPath, "replacement-owner");
        return "lost ownership";
      })).rejects.toMatchObject({ code: "LOCK_LOST" });
      expect(await vaultFs.read("note.md")).toBe("original");
      expect(await readFile(lockPath, "utf-8")).toBe("replacement-owner");
    });

    it("bounds contention without stealing the owner lock", async () => {
      await vaultFs.write("note.md", "original");
      let unlock!: () => void;
      let entered!: () => void;
      const ready = new Promise<void>((resolve) => { entered = resolve; });
      const held = new Promise<void>((resolve) => { unlock = resolve; });
      const first = vaultFs.update("note.md", async (current) => { entered(); await held; return current + " first"; });
      await ready;
      await expect(new VaultFS(vaultRoot).update("note.md", () => "lost", { timeoutMs: 30 })).rejects.toMatchObject({ code: "LOCK_TIMEOUT" });
      expect(await vaultFs.read("note.md")).toBe("original");
      unlock();
      await first;
      expect(await vaultFs.read("note.md")).toBe("original first");
    });

    it("coordinates append with updates and confined symlink aliases", async () => {
      await vaultFs.write("note.md", "original");
      await symlink(join(vaultRoot, "note.md"), join(vaultRoot, "alias.md"));
      await Promise.all([
        vaultFs.update("note.md", async (current) => { await new Promise((resolve) => setTimeout(resolve, 20)); return current + " updated"; }),
        new VaultFS(vaultRoot).append("alias.md", " appended"),
      ]);
      const content = await vaultFs.read("note.md");
      expect(content).toContain("updated");
      expect(content).toContain("appended");
      expect(await vaultFs.read("alias.md")).toBe(content);
    });
  });

  describe("read", () => {
    it("rejects secret writes and appends without exposing their values", async () => {
      const secret = `ghp_${"A".repeat(36)}`;
      await expect(vaultFs.write("new.md", secret)).rejects.toMatchObject({ code: "SECRET_REJECTED" });
      expect(await vaultFs.exists("new.md")).toBe(false);
      await vaultFs.write("existing.md", "safe");
      try {
        await vaultFs.append("existing.md", secret);
        expect.fail("secret append succeeded");
      } catch (error) {
        expect(error).toMatchObject({ code: "SECRET_REJECTED" });
        expect((error as Error).message).not.toContain(secret);
      }
      expect(await vaultFs.read("existing.md")).toBe("safe");
    });
    it("reads existing file", async () => {
      await writeFile(join(vaultRoot, "test.md"), "content");
      const result = await vaultFs.read("test.md");
      expect(result).toBe("content");
    });

    it("throws FILE_NOT_FOUND for missing file", async () => {
      await expect(vaultFs.read("missing.md")).rejects.toThrow(VaultError);
      await expect(vaultFs.read("missing.md")).rejects.toMatchObject({ code: "FILE_NOT_FOUND" });
    });

    it("rejects traversal attack with ..", async () => {
      await expect(vaultFs.read("../outside.md")).rejects.toThrow(VaultError);
      await expect(vaultFs.read("../outside.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("rejects absolute path starting with /", async () => {
      await expect(vaultFs.read("/etc/passwd")).rejects.toThrow(VaultError);
      await expect(vaultFs.read("/etc/passwd")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("rejects absolute path starting with ~", async () => {
      await expect(vaultFs.read("~/secret")).rejects.toThrow(VaultError);
      await expect(vaultFs.read("~/secret")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("rejects personal vault segment", async () => {
      await expect(vaultFs.read("personal/notes.md")).rejects.toThrow(VaultError);
      await expect(vaultFs.read("personal/notes.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("rejects personal vault segment case-insensitive", async () => {
      await expect(vaultFs.read("Personal/notes.md")).rejects.toThrow(VaultError);
      await expect(vaultFs.read("PERSONAL/notes.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("rejects non-ASCII characters", async () => {
      await expect(vaultFs.read("test-日本語.md")).rejects.toThrow(VaultError);
      await expect(vaultFs.read("test-日本語.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("reads from nested directory", async () => {
      await mkdir(join(vaultRoot, "subdir"), { recursive: true });
      await writeFile(join(vaultRoot, "subdir/nested.md"), "nested content");
      const result = await vaultFs.read("subdir/nested.md");
      expect(result).toBe("nested content");
    });
  });

  describe("write", () => {
    it("creates new file", async () => {
      const result = await vaultFs.write("new.md", "content");
      expect(result.path).toBe("new.md");
      expect(result.bytes).toBe(7);
      const content = await vaultFs.read("new.md");
      expect(content).toBe("content");
    });

    it("creates nested directories", async () => {
      await vaultFs.write("deep/nested/path/file.md", "deep content");
      const content = await vaultFs.read("deep/nested/path/file.md");
      expect(content).toBe("deep content");
    });

    it("overwrites existing file", async () => {
      await vaultFs.write("existing.md", "old");
      await vaultFs.write("existing.md", "new content");
      const content = await vaultFs.read("existing.md");
      expect(content).toBe("new content");
    });

    it("reports correct byte count for UTF-8", async () => {
      const result = await vaultFs.write("utf8.md", "hello");
      expect(result.bytes).toBe(5);
    });
  });

  describe("append", () => {
    it("appends to existing file", async () => {
      await vaultFs.write("append.md", "line1\n");
      const result = await vaultFs.append("append.md", "line2\n");
      expect(result.bytes).toBe(6);
      const content = await vaultFs.read("append.md");
      expect(content).toBe("line1\nline2\n");
    });

    it("throws FILE_NOT_FOUND when appending to missing file", async () => {
      await expect(vaultFs.append("missing.md", "content")).rejects.toMatchObject({ code: "FILE_NOT_FOUND" });
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await vaultFs.write("file1.md", "1");
      await vaultFs.write("file2.md", "2");
      await vaultFs.write("subdir/file3.md", "3");
      await vaultFs.write("subdir/deep/file4.md", "4");
      await writeFile(join(vaultRoot, ".hidden"), "hidden");
    });

    it("lists files at depth 1", async () => {
      const result = await vaultFs.list(".", 1);
      expect(result).toContain("./file1.md");
      expect(result).toContain("./file2.md");
      expect(result).toContain("./subdir/");
      expect(result).not.toContain("./subdir/file3.md");
    });

    it("lists files at depth 2", async () => {
      const result = await vaultFs.list(".", 2);
      expect(result).toContain("./file1.md");
      expect(result).toContain("./subdir/file3.md");
      expect(result).toContain("./subdir/deep/");
      expect(result).not.toContain("./subdir/deep/file4.md");
    });

    it("excludes hidden files", async () => {
      const result = await vaultFs.list(".", 1);
      expect(result).not.toContain(".hidden");
    });

    it("excludes .obsidian directory", async () => {
      await mkdir(join(vaultRoot, ".obsidian"));
      await writeFile(join(vaultRoot, ".obsidian/config"), "config");
      const result = await vaultFs.list(".", 2);
      expect(result.some(p => p.includes(".obsidian"))).toBe(false);
    });

    it("skips symlinks", async () => {
      await symlink(join(vaultRoot, "file1.md"), join(vaultRoot, "link.md"));
      const result = await vaultFs.list(".", 1);
      expect(result).toContain("./file1.md");
      expect(result).not.toContain("./link.md");
    });

    it("throws FILE_NOT_FOUND for missing directory", async () => {
      await expect(vaultFs.list("missing-dir", 1)).rejects.toThrow(VaultError);
      await expect(vaultFs.list("missing-dir", 1)).rejects.toMatchObject({ code: "FILE_NOT_FOUND" });
    });
  });

  describe("delete", () => {
    it("deletes existing file", async () => {
      await vaultFs.write("to-delete.md", "content");
      await vaultFs.delete("to-delete.md");
      expect(await vaultFs.exists("to-delete.md")).toBe(false);
    });

    it("throws FILE_NOT_FOUND for missing file", async () => {
      await expect(vaultFs.delete("missing.md")).rejects.toThrow(VaultError);
      await expect(vaultFs.delete("missing.md")).rejects.toMatchObject({ code: "FILE_NOT_FOUND" });
    });
  });

  describe("move", () => {
    it("moves existing file", async () => {
      await vaultFs.write("old.md", "content");
      const result = await vaultFs.move("old.md", "new.md");
      expect(result.from).toBe("old.md");
      expect(result.to).toBe("new.md");
      expect(await vaultFs.exists("old.md")).toBe(false);
      const content = await vaultFs.read("new.md");
      expect(content).toBe("content");
    });

    it("moves to nested path creating directories", async () => {
      await vaultFs.write("move-me.md", "content");
      await vaultFs.move("move-me.md", "deep/nested/moved.md");
      expect(await vaultFs.exists("move-me.md")).toBe(false);
      const content = await vaultFs.read("deep/nested/moved.md");
      expect(content).toBe("content");
    });

    it("throws FILE_NOT_FOUND for missing source", async () => {
      await expect(vaultFs.move("missing.md", "target.md")).rejects.toThrow(VaultError);
      await expect(vaultFs.move("missing.md", "target.md")).rejects.toMatchObject({ code: "FILE_NOT_FOUND" });
    });
  });

  describe("exists", () => {
    it("returns true for existing file", async () => {
      await vaultFs.write("exists.md", "content");
      expect(await vaultFs.exists("exists.md")).toBe(true);
    });

    it("returns false for missing file", async () => {
      expect(await vaultFs.exists("missing.md")).toBe(false);
    });

    it("returns true for directory", async () => {
      await mkdir(join(vaultRoot, "mydir"));
      expect(await vaultFs.exists("mydir")).toBe(true);
    });
  });

  describe("verifyNoSymlinkEscape", () => {
    it("allows regular file", async () => {
      await writeFile(join(vaultRoot, "regular.md"), "content");
      await expect(vaultFs.verifyNoSymlinkEscape("regular.md")).resolves.toBeUndefined();
    });

    it("allows symlink inside vault", async () => {
      await writeFile(join(vaultRoot, "target.md"), "content");
      await symlink(join(vaultRoot, "target.md"), join(vaultRoot, "link.md"));
      await expect(vaultFs.verifyNoSymlinkEscape("link.md")).resolves.toBeUndefined();
    });

    it("rejects symlink escaping vault", async () => {
      const outsideDir = join(homedir(), `.outside-${Date.now()}`);
      await mkdir(outsideDir, { recursive: true });
      await writeFile(join(outsideDir, "outside.md"), "outside");
      await symlink(join(outsideDir, "outside.md"), join(vaultRoot, "escape.md"));
      
      try {
        await vaultFs.read("escape.md");
        expect.fail("Should have thrown");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(VaultError);
        expect((e as VaultError).code).toBe("PERMISSION_DENIED");
      }
      
      await rm(outsideDir, { recursive: true, force: true });
    });

    it("denies writing a new file through a symlinked directory", async () => {
      const outsideDir = join(homedir(), `.outside-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await mkdir(outsideDir, { recursive: true });
      await symlink(outsideDir, join(vaultRoot, "linkdir"));

      try {
        await expect(vaultFs.write("linkdir/escaped.md", "pwned")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
        await expect(readFile(join(outsideDir, "escaped.md"))).rejects.toMatchObject({ code: "ENOENT" });
      } finally {
        await rm(outsideDir, { recursive: true, force: true });
      }
    });

    it("denies overwriting an existing file through a symlinked directory", async () => {
      const outsideDir = join(homedir(), `.outside-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await mkdir(outsideDir, { recursive: true });
      await writeFile(join(outsideDir, "escaped.md"), "outside");
      await symlink(outsideDir, join(vaultRoot, "linkdir"));

      try {
        await expect(vaultFs.write("linkdir/escaped.md", "pwned")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
        await expect(vaultFs.delete("linkdir/escaped.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
        expect(await readFile(join(outsideDir, "escaped.md"), "utf-8")).toBe("outside");
      } finally {
        await rm(outsideDir, { recursive: true, force: true });
      }
    });

    it("denies a dangling symlink pointing outside the vault", async () => {
      const outsideDir = join(homedir(), `.outside-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await mkdir(outsideDir, { recursive: true });
      await symlink(join(outsideDir, "created-later.md"), join(vaultRoot, "dangling.md"));

      try {
        await expect(vaultFs.write("dangling.md", "pwned")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
        await expect(readFile(join(outsideDir, "created-later.md"))).rejects.toMatchObject({ code: "ENOENT" });
      } finally {
        await rm(outsideDir, { recursive: true, force: true });
      }
    });

    it("denies moving a file into a symlinked directory", async () => {
      const outsideDir = join(homedir(), `.outside-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await mkdir(outsideDir, { recursive: true });
      await symlink(outsideDir, join(vaultRoot, "linkdir"));
      await vaultFs.write("source.md", "content");

      try {
        await expect(vaultFs.move("source.md", "linkdir/escaped.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
        expect(await vaultFs.exists("source.md")).toBe(true);
        await expect(readFile(join(outsideDir, "escaped.md"))).rejects.toMatchObject({ code: "ENOENT" });
      } finally {
        await rm(outsideDir, { recursive: true, force: true });
      }
    });

    it("allows creating a normal nested new file", async () => {
      await vaultFs.write("fresh/nested/new.md", "ok");
      expect(await vaultFs.read("fresh/nested/new.md")).toBe("ok");
    });

    it("allows writes when the vault root itself is a symlink", async () => {
      const actualRoot = join(homedir(), `.vault-actual-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const linkRoot = join(homedir(), `.vault-link-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await mkdir(actualRoot, { recursive: true });
      await symlink(actualRoot, linkRoot);
      const linkedFs = new VaultFS(linkRoot);

      try {
        await linkedFs.write("nested/new.md", "ok");
        expect(await readFile(join(actualRoot, "nested/new.md"), "utf-8")).toBe("ok");
        expect(await linkedFs.read("nested/new.md")).toBe("ok");
      } finally {
        await rm(linkRoot, { recursive: true, force: true });
        await rm(actualRoot, { recursive: true, force: true });
      }
    });
  });

  describe("project isolation", () => {
    it("rewrites relative paths under projects/<slug>/", async () => {
      const scoped = new VaultFS(vaultRoot, { projectSlug: "alpha" });
      await scoped.write("note.md", "alpha-only");
      const raw = await readFile(join(vaultRoot, "projects/alpha/note.md"), "utf-8");
      expect(raw).toBe("alpha-only");
      expect(await scoped.read("note.md")).toBe("alpha-only");
      expect(await scoped.read("projects/alpha/note.md")).toBe("alpha-only");
    });

    it("denies sibling project paths", async () => {
      await mkdir(join(vaultRoot, "projects/beta"), { recursive: true });
      await writeFile(join(vaultRoot, "projects/beta/secret.md"), "leaked");
      const scoped = new VaultFS(vaultRoot, { projectSlug: "alpha" });
      await expect(scoped.read("projects/beta/secret.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
      await expect(scoped.write("projects/beta/x.md", "no")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
      await expect(scoped.list("projects")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
      await expect(scoped.read("project-map.json")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("rejects sibling-project symlinks for reads, writes and listings", async () => {
      await mkdir(join(vaultRoot, "projects/alpha"), { recursive: true });
      await mkdir(join(vaultRoot, "projects/beta"), { recursive: true });
      await writeFile(join(vaultRoot, "projects/beta/secret.md"), "private");
      await symlink("../beta", join(vaultRoot, "projects/alpha/link"));
      const scoped = new VaultFS(vaultRoot, { projectSlug: "alpha" });
      await expect(scoped.read("link/secret.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
      await expect(scoped.write("link/new.md", "no")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
      await expect(scoped.list("link")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("preserves symlinks within the same project", async () => {
      await mkdir(join(vaultRoot, "projects/alpha/notes"), { recursive: true });
      await symlink("notes", join(vaultRoot, "projects/alpha/link"));
      const scoped = new VaultFS(vaultRoot, { projectSlug: "alpha" });
      await scoped.write("link/new.md", "ok");
      expect(await scoped.read("link/new.md")).toBe("ok");
    });

    it("does not treat projects/alpha as prefix of projects/alphabet", async () => {
      await mkdir(join(vaultRoot, "projects/alphabet"), { recursive: true });
      await writeFile(join(vaultRoot, "projects/alphabet/x.md"), "no");
      const scoped = new VaultFS(vaultRoot, { projectSlug: "alpha" });
      await expect(scoped.read("projects/alphabet/x.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("denies projects/ when slug failed to resolve", async () => {
      const locked = new VaultFS(vaultRoot, { projectSlug: null });
      await mkdir(join(vaultRoot, "projects/alpha"), { recursive: true });
      await writeFile(join(vaultRoot, "projects/alpha/x.md"), "no");
      await expect(locked.read("projects/alpha/x.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });
  });
});
