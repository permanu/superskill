import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as crypto from "node:crypto";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { createEmptyGraph, loadGraph, MAX_GRAPH_BYTES, mutateGraph, writeGraph } from "./store.js";

vi.mock("node:fs/promises", async importOriginal => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, open: vi.fn(actual.open), link: vi.fn(actual.link), unlink: vi.fn(actual.unlink), rename: vi.fn(actual.rename) };
});

vi.mock("node:crypto", async importOriginal => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, randomUUID: vi.fn(actual.randomUUID) };
});

const actualFs = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");

describe("graph filesystem safety", () => {
  let dir: string;
  let graphPath: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(join(tmpdir(), "graph-safety-"));
    await fs.mkdir(join(dir, ".superskill"));
    graphPath = join(dir, ".superskill", "graph.json");
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    await fs.rm(dir, { recursive: true, force: true });
  });

  it.each(["EACCES", "EIO", "EMFILE"])("propagates %s without quarantining or mutating", async code => {
    const raw = JSON.stringify(createEmptyGraph());
    await fs.writeFile(graphPath, raw);
    const actualOpen = actualFs.open;
    vi.spyOn(fs, "open").mockImplementation(async (...args: Parameters<typeof fs.open>) => {
      if (args[0] === graphPath) throw Object.assign(new Error(code), { code });
      return actualOpen(...args);
    });
    await expect(loadGraph(dir)).rejects.toMatchObject({ code });
    const mutate = vi.fn(graph => graph);
    await expect(mutateGraph(dir, mutate)).rejects.toMatchObject({ code });
    expect(mutate).not.toHaveBeenCalled();
    expect(await fs.readFile(graphPath, "utf8")).toBe(raw);
    expect(await fs.readdir(join(dir, ".superskill"))).toEqual(["graph.json"]);
  });

  it("rejects parse and structural corruption on read instead of appearing empty", async () => {
    for (const raw of ["{bad", "null", JSON.stringify({ nodes: [null], edges: [] })]) {
      await fs.writeFile(graphPath, raw);
      await expect(loadGraph(dir)).rejects.toThrow(/Invalid graph/);
      expect(await fs.readFile(graphPath, "utf8")).toBe(raw);
    }
  });

  it("rejects future schemas without quarantine or replacement", async () => {
    const raw = JSON.stringify({ version: 999, nodes: [], edges: [] });
    await fs.writeFile(graphPath, raw);
    await expect(loadGraph(dir)).rejects.toThrow(/Unsupported graph schema version/);
    await expect(mutateGraph(dir, graph => graph)).rejects.toThrow(/Unsupported graph schema version/);
    expect(await fs.readFile(graphPath, "utf8")).toBe(raw);
    expect(await fs.readdir(join(dir, ".superskill"))).toEqual(["graph.json"]);
  });

  it("bounds the bytes actually read, including files that grow after stat", async () => {
    await fs.writeFile(graphPath, " ".repeat(MAX_GRAPH_BYTES + 1));
    const actualOpen = actualFs.open;
    let bytesRead = 0;
    vi.spyOn(fs, "open").mockImplementation(async (...args: Parameters<typeof fs.open>) => {
      const handle = await actualOpen(...args);
      if (args[0] === graphPath) {
        vi.spyOn(handle, "stat").mockResolvedValue({ isFile: () => true, size: 0 } as Awaited<ReturnType<typeof handle.stat>>);
        const actualRead = handle.read.bind(handle);
        vi.spyOn(handle, "read").mockImplementation((async (...readArgs: unknown[]) => {
          const result = await Reflect.apply(actualRead, handle, readArgs);
          bytesRead += result.bytesRead;
          return result;
        }) as typeof handle.read);
      }
      return handle;
    });
    await expect(loadGraph(dir)).rejects.toThrow(/Graph exceeds/);
    expect(bytesRead).toBeLessThanOrEqual(MAX_GRAPH_BYTES + 1);
    expect(bytesRead).toBeGreaterThan(0);
  });

  it("never replaces corruption when quarantine fails", async () => {
    await fs.writeFile(graphPath, "{bad");
    vi.spyOn(fs, "link").mockRejectedValue(Object.assign(new Error("backup denied"), { code: "EACCES" }));
    const mutate = vi.fn(graph => graph);
    await expect(mutateGraph(dir, mutate)).rejects.toThrow(/Invalid graph/);
    expect(mutate).not.toHaveBeenCalled();
    expect(await fs.readFile(graphPath, "utf8")).toBe("{bad");
  });

  it("does not overwrite corruption when recording backup ownership fails", async () => {
    await fs.writeFile(graphPath, "{bad");
    const actualWrite = actualFs.writeFile;
    vi.spyOn(fs, "writeFile").mockImplementation(async (...args: Parameters<typeof fs.writeFile>) => {
      if (String(args[0]).endsWith(".meta")) throw new Error("metadata write failed");
      return actualWrite(...args);
    });
    await expect(mutateGraph(dir, graph => graph)).rejects.toThrow(/Invalid graph/);
    expect(await fs.readFile(graphPath, "utf8")).toBe("{bad");
  });

  it("retains bounded managed corrupt copies without deleting user-authored lookalikes", async () => {
    const userBackup = join(dir, ".superskill", "graph.json.corrupt-123");
    await fs.writeFile(userBackup, "user notes");
    for (let i = 0; i < 9; i++) {
      await fs.writeFile(graphPath, `{bad-${i}`);
      await mutateGraph(dir, graph => graph);
    }
    const backups = (await fs.readdir(join(dir, ".superskill"))).filter(name => /^graph\.json\.corrupt-\d+-[a-f0-9-]{36}$/.test(name));
    expect(backups.length).toBeLessThanOrEqual(5);
    expect(backups.length).toBeGreaterThan(0);
    expect(await fs.readFile(userBackup, "utf8")).toBe("user notes");
  });

  it("preserves a corrupt backup edited by the user", async () => {
    await fs.writeFile(graphPath, "{bad");
    await mutateGraph(dir, graph => graph);
    const backup = (await fs.readdir(join(dir, ".superskill"))).find(name => /^graph\.json\.corrupt-\d+-[a-f0-9-]{36}$/.test(name))!;
    await fs.writeFile(join(dir, ".superskill", backup), "user edited backup");
    for (let i = 0; i < 8; i++) {
      await fs.writeFile(graphPath, `{bad-${i}`);
      await mutateGraph(dir, graph => graph);
    }
    expect(await fs.readFile(join(dir, ".superskill", backup), "utf8")).toBe("user edited backup");
  });

  it("rejects symlinked graph paths and directories before writing outside the project", async () => {
    const outside = join(dir, "outside");
    await fs.mkdir(outside);
    await fs.writeFile(join(outside, "graph.json"), "outside content");
    await fs.symlink(join(outside, "graph.json"), graphPath);
    await expect(writeGraph(dir, createEmptyGraph())).rejects.toThrow(/symlink/i);
    await expect(mutateGraph(dir, graph => graph)).rejects.toThrow(/symlink/i);
    await fs.unlink(graphPath);
    await fs.rmdir(join(dir, ".superskill"));
    await fs.symlink(outside, join(dir, ".superskill"));
    await expect(writeGraph(dir, createEmptyGraph())).rejects.toThrow(/symlink/i);
    expect(await fs.readFile(join(outside, "graph.json"), "utf8")).toBe("outside content");
    expect(await fs.readdir(outside)).toEqual(["graph.json"]);
  });

  it("does not quarantine a non-directory path as missing or corruption", async () => {
    await fs.rmdir(join(dir, ".superskill"));
    await fs.writeFile(join(dir, ".superskill"), "user data");
    await expect(loadGraph(dir)).rejects.toThrow();
    await expect(mutateGraph(dir, graph => graph)).rejects.toThrow();
    expect(await fs.readFile(join(dir, ".superskill"), "utf8")).toBe("user data");
  });

  it("does not reclaim a foreign-host lock using a locally absent pid", async () => {
    const lockPath = join(dir, ".superskill", "graph.lock");
    const raw = JSON.stringify({ pid: 999999999, host: `${hostname()}-foreign`, createdAt: 0, token: "foreign" });
    await fs.writeFile(lockPath, raw);
    await expect(mutateGraph(dir, graph => graph, { timeoutMs: 10 })).rejects.toThrow(/Timed out/);
    expect(await fs.readFile(lockPath, "utf8")).toBe(raw);
  });

  it("records host and process identity and recovers a reused local pid", async () => {
    const lockPath = join(dir, ".superskill", "graph.lock");
    await mutateGraph(dir, async graph => {
      const lock = JSON.parse(await fs.readFile(lockPath, "utf8"));
      expect(lock.host).toBe(hostname());
      expect(lock.processStart).toEqual(expect.any(String));
      return graph;
    });
    await fs.writeFile(lockPath, JSON.stringify({ pid: process.pid, host: hostname(), processStart: "different process identity", token: "reused", createdAt: Date.now() }));
    await expect(mutateGraph(dir, graph => graph, { timeoutMs: 100 })).resolves.toEqual(createEmptyGraph());
  });

  it("does not release another owner's replacement lock", async () => {
    const lockPath = join(dir, ".superskill", "graph.lock");
    const replacement = JSON.stringify({ pid: process.pid, token: "replacement" });
    await expect(mutateGraph(dir, async graph => {
      await fs.unlink(lockPath);
      await fs.writeFile(lockPath, replacement);
      return graph;
    })).rejects.toThrow(/ownership lost/);
    expect(await fs.readFile(lockPath, "utf8")).toBe(replacement);
  });

  it("does not release a copied lock through a directory symlink introduced during mutation", async () => {
    const outside = join(dir, "outside");
    await fs.mkdir(outside);
    let copiedLock = "";
    await expect(mutateGraph(dir, async graph => {
      copiedLock = await fs.readFile(join(dir, ".superskill", "graph.lock"), "utf8");
      await fs.link(join(dir, ".superskill", "graph.lock"), join(outside, "graph.lock"));
      await fs.rename(join(dir, ".superskill"), join(dir, "previous"));
      await fs.symlink(outside, join(dir, ".superskill"));
      return graph;
    })).rejects.toThrow(/symlink|directory changed/i);
    expect(await fs.readFile(join(outside, "graph.lock"), "utf8")).toBe(copiedLock);
    expect(await fs.readdir(outside)).toEqual(["graph.lock"]);
  });

  it("never time-steals a known-live local lock", async () => {
    const lockPath = join(dir, ".superskill", "graph.lock");
    let body: Record<string, unknown> = {};
    await mutateGraph(dir, async graph => {
      body = JSON.parse(await fs.readFile(lockPath, "utf8"));
      return graph;
    });
    const raw = JSON.stringify({ ...body, createdAt: 0 });
    await fs.writeFile(lockPath, raw);
    await fs.utimes(lockPath, 1, 1);
    await expect(mutateGraph(dir, graph => graph, { timeoutMs: 10 })).rejects.toThrow(/Timed out/);
    expect(await fs.readFile(lockPath, "utf8")).toBe(raw);
  });

  it("does not delete a pre-existing temporary-name collision", async () => {
    const uuid = "00000000-0000-4000-8000-000000000000";
    vi.spyOn(crypto, "randomUUID").mockReturnValue(uuid);
    const tempPath = join(dir, ".superskill", `.graph-${uuid}.tmp`);
    await fs.writeFile(tempPath, "user content");
    await expect(writeGraph(dir, createEmptyGraph())).rejects.toMatchObject({ code: "EEXIST" });
    expect(await fs.readFile(tempPath, "utf8")).toBe("user content");
  });

  it("does not mask a mutation failure when releasing the lock also fails", async () => {
    const actualUnlink = actualFs.unlink;
    vi.spyOn(fs, "unlink").mockImplementation(async path => {
      if (String(path).endsWith("graph.lock")) throw new Error("lock release failed");
      return actualUnlink(path);
    });
    await expect(mutateGraph(dir, () => { throw new Error("original mutation failure"); })).rejects.toThrow("original mutation failure");
  });

  it("keeps the original write error when temporary-file cleanup also fails", async () => {
    vi.spyOn(fs, "rename").mockRejectedValue(new Error("original rename failure"));
    const actualUnlink = actualFs.unlink;
    vi.spyOn(fs, "unlink").mockImplementation(async path => {
      if (String(path).endsWith(".tmp")) throw new Error("cleanup failure");
      return actualUnlink(path);
    });
    await expect(writeGraph(dir, createEmptyGraph())).rejects.toThrow("original rename failure");
  });
});
