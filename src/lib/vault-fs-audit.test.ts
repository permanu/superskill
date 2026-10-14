import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { open } from "fs/promises";
import { constants } from "fs";
import { hostname, tmpdir } from "os";
import { basename, join } from "path";
import { VaultFS } from "./vault-fs.js";

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return { ...actual, open: vi.fn(actual.open) };
});

const actual = await vi.importActual<typeof import("fs/promises")>("fs/promises");

describe("VaultFS bounded no-follow IO", () => {
  let home: string;
  let root: string;
  let vaultFs: VaultFS;
  let originalHome: string | undefined;

  beforeEach(async () => {
    originalHome = process.env.HOME;
    home = await actual.mkdtemp(join(tmpdir(), "vault-fs-audit-"));
    home = await actual.realpath(home);
    process.env.HOME = home;
    root = join(home, "vault");
    await actual.mkdir(root);
    vaultFs = new VaultFS(root);
    vi.mocked(open).mockImplementation(actual.open);
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await actual.rm(home, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  it("reads a file exactly at the fixed 10 MiB limit without truncating it", async () => {
    const size = 10 * 1024 * 1024;
    await actual.writeFile(join(root, "maximum.md"), Buffer.alloc(size, "a"));
    const content = await vaultFs.read("maximum.md");
    expect(Buffer.byteLength(content, "utf-8")).toBe(size);
    expect(content.at(0)).toBe("a");
    expect(content.at(-1)).toBe("a");
  });

  it.each(["read", "update"] as const)("rejects oversized files before reading their contents during %s", async (operation) => {
    const path = join(root, "huge.md");
    const file = await actual.open(path, "w");
    await file.truncate(12 * 1024 * 1024);
    await file.close();
    vi.mocked(open).mockImplementation(async (...args) => {
      const handle = await actual.open(...args);
      if (args[0] === path) {
        vi.spyOn(handle, "read").mockRejectedValue(new Error("oversized contents were read"));
        vi.spyOn(handle, "readFile").mockRejectedValue(new Error("oversized contents were read"));
      }
      return handle;
    });
    const operationResult = operation === "read" ? vaultFs.read("huge.md") : vaultFs.update("huge.md", () => "replacement");
    await expect(operationResult).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
    expect((await actual.stat(path)).size).toBe(12 * 1024 * 1024);
  });

  it("bounds reads even when a file grows after the initial handle stat", async () => {
    const path = join(root, "growing.md");
    await actual.writeFile(path, "small");
    const requested: number[] = [];
    vi.mocked(open).mockImplementation(async (...args) => {
      const handle = await actual.open(...args);
      if (args[0] === path) {
        const info = await handle.stat();
        vi.spyOn(handle, "stat").mockImplementationOnce(async () => {
          const writer = await actual.open(path, "r+");
          await writer.truncate(10 * 1024 * 1024 + 1);
          await writer.close();
          return info;
        });
        const read = handle.read.bind(handle);
        vi.spyOn(handle, "read").mockImplementation(async (...readArgs: any[]) => {
          requested.push(typeof readArgs[2] === "number" ? readArgs[2] : readArgs[0].byteLength);
          return Reflect.apply(read, handle, readArgs);
        });
      }
      return handle;
    });
    await expect(vaultFs.read("growing.md")).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
    expect(requested.reduce((sum, bytes) => sum + bytes, 0)).toBeLessThanOrEqual(10 * 1024 * 1024 + 1);
  });

  it("rejects a final-component symlink swapped immediately before open", async () => {
    const path = join(root, "note.md");
    const outside = join(home, "outside.md");
    await actual.writeFile(path, "safe");
    await actual.writeFile(outside, "outside");
    vi.mocked(open).mockImplementation(async (...args) => {
      if (args[0] === path) {
        await actual.unlink(path);
        await actual.symlink(outside, path);
      }
      return await actual.open(...args);
    });
    await expect(vaultFs.read("note.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    expect(await actual.readFile(outside, "utf-8")).toBe("outside");
  });

  it("rechecks canonical ancestry after opening a file", async () => {
    const directory = join(root, "notes");
    const outside = join(home, "outside");
    await actual.mkdir(directory);
    await actual.mkdir(outside);
    await actual.writeFile(join(directory, "note.md"), "safe");
    await actual.writeFile(join(outside, "note.md"), "outside");
    vi.mocked(open).mockImplementation(async (...args) => {
      const handle = await actual.open(...args);
      if (args[0] === join(directory, "note.md")) {
        await actual.rename(directory, `${directory}-old`);
        await actual.symlink(outside, directory);
      }
      return handle;
    });
    await expect(vaultFs.read("notes/note.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("rechecks opened inode identity before returning file content", async () => {
    const path = join(root, "note.md");
    await actual.writeFile(path, "safe");
    await actual.writeFile(`${path}.replacement`, "replacement");
    vi.mocked(open).mockImplementation(async (...args) => {
      const handle = await actual.open(...args);
      if (args[0] === path) await actual.rename(`${path}.replacement`, path);
      return handle;
    });
    await expect(vaultFs.read("note.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("does not follow a lock symlink swapped immediately before inspection open", async () => {
    const lockPath = join(root, ".note.md.lock");
    const outside = join(home, "outside.md");
    await actual.writeFile(join(root, "note.md"), "safe");
    await actual.writeFile(outside, "outside");
    await actual.writeFile(lockPath, "existing-owner");
    vi.mocked(open).mockImplementation(async (...args) => {
      if (args[0] === lockPath && typeof args[1] === "number" && !(args[1] & constants.O_EXCL)) {
        await actual.unlink(lockPath);
        await actual.symlink(outside, lockPath);
      }
      return await actual.open(...args);
    });
    await expect(vaultFs.update("note.md", () => "replacement")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    expect(await actual.readFile(outside, "utf-8")).toBe("outside");
    expect(await actual.readFile(join(root, "note.md"), "utf-8")).toBe("safe");
  });

  it("does not reclaim a foreign lease renewed after the recovery snapshot", async () => {
    const lockPath = join(root, ".note.md.lock");
    const old = Date.now() - 24 * 60 * 60 * 1000;
    const owner = JSON.stringify({ token: "foreign-token", ownerId: "foreign-owner", pid: process.pid, host: `${hostname()}-foreign`, createdAt: old });
    await actual.writeFile(join(root, "note.md"), "safe");
    await actual.writeFile(lockPath, owner);
    await actual.utimes(lockPath, old / 1000, old / 1000);
    let inspections = 0;
    vi.mocked(open).mockImplementation(async (...args) => {
      const handle = await actual.open(...args);
      if (args[0] === lockPath && typeof args[1] === "number" && !(args[1] & constants.O_EXCL) && ++inspections === 2) {
        const close = handle.close.bind(handle);
        vi.spyOn(handle, "close").mockImplementationOnce(async () => {
          await close();
          const now = new Date();
          await actual.utimes(lockPath, now, now);
        });
      }
      return handle;
    });
    await expect(vaultFs.update("note.md", () => "stolen", { timeoutMs: 50 })).rejects.toMatchObject({ code: "LOCK_TIMEOUT" });
    expect(await actual.readFile(lockPath, "utf-8")).toBe(owner);
    expect(await actual.readFile(join(root, "note.md"), "utf-8")).toBe("safe");
  });

  it("renews the lease through the owned handle while a transform is pending", async () => {
    await vaultFs.write("note.md", "safe");
    const lockPath = join(root, ".note.md.lock");
    let entered!: () => void;
    let finish!: () => void;
    let renewed!: () => void;
    const ready = new Promise<void>((resolve) => { entered = resolve; });
    const blocked = new Promise<void>((resolve) => { finish = resolve; });
    const heartbeat = new Promise<void>((resolve) => { renewed = resolve; });
    vi.mocked(open).mockImplementation(async (...args) => {
      const handle = await actual.open(...args);
      if (args[0] === lockPath && typeof args[1] === "number" && (args[1] & constants.O_EXCL)) {
        const touch = handle.utimes.bind(handle);
        vi.spyOn(handle, "utimes").mockImplementation(async (...touchArgs) => {
          await touch(...touchArgs);
          renewed();
        });
      }
      return handle;
    });
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const update = vaultFs.update("note.md", async () => { entered(); await blocked; return "updated"; });
    try {
      await ready;
      const old = Date.now() - 24 * 60 * 60 * 1000;
      await actual.utimes(lockPath, old / 1000, old / 1000);
      await vi.advanceTimersByTimeAsync(100001);
      await heartbeat;
      expect((await actual.stat(lockPath)).mtimeMs).toBeGreaterThan(old + 100000);
    } finally {
      finish();
      await update;
      vi.useRealTimers();
    }
    expect(await vaultFs.read("note.md")).toBe("updated");
  });

  it.each(["create", "update"] as const)("cleans only its own failed temporary file during %s", async (operation) => {
    if (operation === "update") await vaultFs.write("note.md", "original");
    vi.mocked(open).mockImplementation(async (...args) => {
      const handle = await actual.open(...args);
      if (String(args[0]).endsWith(".tmp")) {
        vi.spyOn(handle, "writeFile").mockRejectedValueOnce(Object.assign(new Error("write failed"), { code: "EIO" }));
      }
      return handle;
    });
    const result = operation === "create" ? vaultFs.createExclusive("note.md", "new") : vaultFs.update("note.md", () => "new");
    await expect(result).rejects.toMatchObject({ code: "EIO" });
    expect(await actual.readdir(root)).toEqual(operation === "update" ? ["note.md"] : []);
    if (operation === "update") expect(await vaultFs.read("note.md")).toBe("original");
  });

  it("preserves the original mode and inode when restrictive chmod fails", async () => {
    const path = join(root, "note.md");
    await actual.writeFile(path, "unchanged");
    await actual.chmod(path, 0o644);
    const before = await actual.stat(path);
    vi.mocked(open).mockImplementation(async (...args) => {
      const handle = await actual.open(...args);
      if (String(args[0]).endsWith(".tmp")) {
        vi.spyOn(handle, "chmod").mockRejectedValueOnce(Object.assign(new Error("chmod failed"), { code: "EIO" }));
      }
      return handle;
    });
    await expect(vaultFs.update("note.md", (current) => current, { mode: 0o600 })).rejects.toMatchObject({ code: "EIO" });
    expect((await actual.stat(path)).mode & 0o777).toBe(0o644);
    expect((await actual.stat(path)).ino).toBe(before.ino);
    expect(await actual.readFile(path, "utf-8")).toBe("unchanged");
    expect(await actual.readdir(root)).toEqual(["note.md"]);
  });

  it.each(["create", "update"] as const)("preserves a replacement temporary file after a failed %s", async (operation) => {
    if (operation === "update") await vaultFs.write("note.md", "original");
    let replacement = "";
    vi.mocked(open).mockImplementation(async (...args) => {
      const handle = await actual.open(...args);
      if (String(args[0]).endsWith(".tmp")) {
        replacement = String(args[0]);
        vi.spyOn(handle, "writeFile").mockImplementationOnce(async () => {
          await actual.writeFile(`${replacement}.replacement`, "user work");
          await actual.rename(`${replacement}.replacement`, replacement);
          throw Object.assign(new Error("write failed"), { code: "EIO" });
        });
      }
      return handle;
    });
    const result = operation === "create" ? vaultFs.createExclusive("note.md", "new") : vaultFs.update("note.md", () => "new");
    await expect(result).rejects.toMatchObject({ code: "EIO" });
    expect(await actual.readFile(replacement, "utf-8")).toBe("user work");
    expect((await actual.readdir(root)).sort()).toEqual([basename(replacement), ...(operation === "update" ? ["note.md"] : [])].sort());
  });

  it("does not expose an exclusive create until its entire content is written", async () => {
    let entered!: () => void;
    let finish!: () => void;
    const ready = new Promise<void>((resolve) => { entered = resolve; });
    const blocked = new Promise<void>((resolve) => { finish = resolve; });
    vi.mocked(open).mockImplementation(async (...args) => {
      const handle = await actual.open(...args);
      if (String(args[0]).endsWith(".tmp")) {
        const write = handle.writeFile.bind(handle);
        vi.spyOn(handle, "writeFile").mockImplementation(async (...writeArgs) => {
          entered();
          await blocked;
          return await write(...writeArgs);
        });
      }
      return handle;
    });
    const create = vaultFs.createExclusive("note.md", "complete content");
    try {
      await ready;
      await expect(actual.stat(join(root, "note.md"))).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      finish();
      await create;
    }
    expect(await vaultFs.read("note.md")).toBe("complete content");
  });
});
