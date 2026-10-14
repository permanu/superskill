import { execFile } from "node:child_process";
import { constants } from "node:fs";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getParser } from "./grammars.js";
import { scanRepo } from "./scan.js";

const git = promisify(execFile);
const roots: string[] = [];

vi.mock("node:fs/promises", async (original) => {
  const actual = await original<typeof import("node:fs/promises")>();
  return { ...actual, open: vi.fn(actual.open), readFile: vi.fn(actual.readFile) };
});

async function repo(): Promise<string> {
  const root = await fs.mkdtemp(join(tmpdir(), "codegraph-security-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("bounded source scanning", () => {
  it("honors Git ignores, including nested rules, while retaining tracked generated sources on opt-in", async () => {
    const root = await repo();
    await git("git", ["init", "-q"], { cwd: root });
    await fs.mkdir(join(root, "src"));
    await fs.mkdir(join(root, "dist"));
    await fs.writeFile(join(root, ".gitignore"), "secret.ts\ndist/\n");
    await fs.writeFile(join(root, "src", ".gitignore"), "private*.ts\n!private-public.ts\n");
    await fs.writeFile(join(root, "secret.ts"), "export const confidential = 1;");
    await fs.writeFile(join(root, "src", "private-secret.ts"), "export const privateSecret = 1;");
    await fs.writeFile(join(root, "src", "private-public.ts"), "export const publicValue = 1;");
    await fs.writeFile(join(root, "dist", "generated.ts"), "export const generated = 1;");
    await git("git", ["add", "-f", "--", "dist/generated.ts"], { cwd: root });
    const normal = await scanRepo(root);
    expect(normal.graph.nodes.filter((node) => node.kind === "module").map((node) => node.file)).toEqual([
      "src/private-public.ts",
    ]);
    const generated = await scanRepo(root, { skipDirs: [] });
    expect(generated.graph.nodes.filter((node) => node.kind === "module").map((node) => node.file)).toEqual([
      "dist/generated.ts", "src/private-public.ts",
    ]);
    const nested = await scanRepo(join(root, "src"));
    expect(nested.graph.nodes.filter((node) => node.kind === "module").map((node) => node.file)).toEqual([
      "private-public.ts",
    ]);
  });

  it("rejects binary, UTF-16, and invalid UTF-8 sources without discarding valid neighbors", async () => {
    const root = await repo();
    await fs.writeFile(join(root, "binary.ts"), Buffer.from("export const hidden = 1;\0"));
    await fs.writeFile(join(root, "utf16.ts"), Buffer.from("export const wide = 1;", "utf16le"));
    await fs.writeFile(join(root, "invalid.ts"), Buffer.from([0xff, 0xfe, 0x61]));
    await fs.writeFile(join(root, "valid.ts"), "export const visible = 'λ';");
    const scan = await scanRepo(root);
    expect(scan.stats.files).toBe(1);
    expect(scan.stats.filesSkipped).toBe(3);
    expect(scan.graph.nodes.some((node) => node.name === "visible")).toBe(true);
  });

  it("does not follow final or parent symlinks outside the root", async () => {
    const root = await repo();
    const outside = await repo();
    await git("git", ["init", "-q"], { cwd: root });
    await fs.mkdir(join(root, "linked"));
    await fs.writeFile(join(root, "linked", "secret.ts"), "export const previouslyPublic = 1;");
    await git("git", ["add", "--", "linked/secret.ts"], { cwd: root });
    await fs.rm(join(root, "linked"), { recursive: true });
    await fs.writeFile(join(outside, "secret.ts"), "export const confidential = 1;");
    await fs.symlink(join(outside, "secret.ts"), join(root, "alias.ts"));
    await fs.symlink(outside, join(root, "linked"));
    const scan = await scanRepo(root, { skipDirs: [] });
    expect(scan.stats.files).toBe(0);
  });

  it("fails closed on ignore rules when Git cannot apply them outside a repository", async () => {
    const root = await repo();
    await fs.writeFile(join(root, ".gitignore"), "secret.ts\n");
    await fs.writeFile(join(root, "secret.ts"), "export const confidential = 1;");
    const scan = await scanRepo(root);
    expect(scan.stats.files).toBe(0);
    expect(scan.stats.filesSkipped).toBeGreaterThan(0);
  });

  it("uses no-follow handles and checks the opened file rather than a preceding stat", async () => {
    const root = await repo();
    await fs.writeFile(join(root, "valid.ts"), "export const visible = 1;");
    const open = vi.spyOn(fs, "open");
    const readFile = vi.spyOn(fs, "readFile");
    const scan = await scanRepo(root);
    expect(scan.stats.files).toBe(1);
    expect(open.mock.calls.some(([, flags]) => typeof flags === "number" && (flags & constants.O_NOFOLLOW) !== 0)).toBe(true);
    expect(readFile).not.toHaveBeenCalled();
  });

  it("bounds file counts, aggregate bytes, and directory depth in non-repository scans", async () => {
    const root = await repo();
    await fs.mkdir(join(root, "nested", "deep"), { recursive: true });
    await fs.writeFile(join(root, "a.ts"), "export const a = 1;");
    await fs.writeFile(join(root, "b.ts"), "export const b = 1;");
    await fs.writeFile(join(root, "nested", "deep", "hidden.ts"), "export const hidden = 1;");
    expect((await scanRepo(root, { maxFiles: 1 })).stats.files).toBe(1);
    expect((await scanRepo(root, { maxTotalBytes: Buffer.byteLength("export const a = 1;") })).stats.files).toBe(1);
    const shallow = await scanRepo(root, { maxDepth: 1 });
    expect(shallow.stats.files).toBe(2);
    expect(shallow.stats.filesSkipped).toBeGreaterThan(0);
  });

  it("rejects invalid and unbounded scan limits", async () => {
    const root = await repo();
    for (const options of [{ maxFiles: -1 }, { maxDepth: Infinity }, { maxTotalBytes: NaN }, { maxFileSize: Number.MAX_SAFE_INTEGER }]) {
      await expect(scanRepo(root, options)).rejects.toThrow(/invalid/);
    }
  });

  it("bounds reads even if the opened source grows after its first fstat", async () => {
    const root = await repo();
    const path = join(root, "growing.ts");
    await fs.writeFile(path, "export const growing = 1;");
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    const readSizes: number[] = [];
    vi.spyOn(fs, "open").mockImplementationOnce(async (file, flags, mode) => {
      const handle = await actual.open(file, flags, mode);
      const initial = await handle.stat();
      const read = vi.spyOn(handle, "read");
      vi.spyOn(handle, "stat").mockImplementationOnce(async () => {
        await fs.appendFile(path, "x".repeat(20_000));
        return initial;
      });
      const close = handle.close.bind(handle);
      vi.spyOn(handle, "close").mockImplementation(async () => {
        for (const call of read.mock.calls) {
          const buffer = call[0];
          if (Buffer.isBuffer(buffer)) readSizes.push(buffer.length);
        }
        await close();
      });
      return handle;
    });
    const scan = await scanRepo(root, { maxFileSize: 64 });
    expect(scan.stats.files).toBe(0);
    expect(scan.stats.filesSkipped).toBe(1);
    expect(readSizes.length).toBeGreaterThan(0);
    expect(readSizes.every((size) => size <= 65)).toBe(true);
  });

  it("isolates deeply nested syntax failures and continues parsing the next file", async () => {
    const root = await repo();
    await fs.writeFile(join(root, "a-deep.ts"), `${"{".repeat(1500)}const hidden = 1;${"}".repeat(1500)}`);
    await fs.writeFile(join(root, "z-valid.ts"), "export function surviving() {}");
    const scan = await scanRepo(root);
    expect(scan.stats.files).toBe(1);
    expect(scan.stats.filesSkipped).toBe(1);
    expect(scan.stats.parseErrors).toBe(1);
    expect(scan.graph.nodes.some((node) => node.name === "surviving")).toBe(true);
  });

  it("bounds shallow syntax trees with excessive node visits", async () => {
    const root = await repo();
    await fs.writeFile(join(root, "a-wide.ts"), ";".repeat(60_000));
    await fs.writeFile(join(root, "z-valid.ts"), "export const surviving = 1;");
    const scan = await scanRepo(root);
    expect(scan.stats.files).toBe(1);
    expect(scan.stats.filesSkipped).toBe(1);
    expect(scan.stats.parseErrors).toBe(1);
  });

  it("resets timed-out shared parsers and deletes each successful tree exactly once", async () => {
    const root = await repo();
    await fs.writeFile(join(root, "a-timeout.ts"), "export const timedOut = 1;");
    await fs.writeFile(join(root, "z-valid.ts"), "export const surviving = 1;");
    const parser = await getParser();
    const originalParse = parser.parse.bind(parser);
    const deleted = vi.fn();
    const reset = vi.spyOn(parser, "reset");
    vi.spyOn(parser, "parse").mockImplementationOnce(() => { throw new Error("Parsing failed"); })
      .mockImplementation((source) => {
        const tree = originalParse(source);
        const originalDelete = tree.delete.bind(tree);
        vi.spyOn(tree, "delete").mockImplementation(() => { deleted(); originalDelete(); });
        return tree;
      });
    const scan = await scanRepo(root);
    expect(scan.stats.filesSkipped).toBe(1);
    expect(scan.stats.parseErrors).toBe(1);
    expect(scan.graph.nodes.some((node) => node.name === "surviving")).toBe(true);
    expect(reset).toHaveBeenCalled();
    expect(parser.getTimeoutMicros()).toBeGreaterThan(0);
    expect(Number.isFinite(parser.getTimeoutMicros())).toBe(true);
    expect(deleted).toHaveBeenCalledTimes(1);
  });

  it("recovers the shared parser after a real WASM parse timeout", async () => {
    const root = await repo();
    await fs.writeFile(join(root, "a-timeout.ts"), "const value = 1;\n".repeat(10_000));
    await fs.writeFile(join(root, "z-valid.ts"), "export const recovered = 1;");
    const parser = await getParser();
    const setTimeout = parser.setTimeoutMicros.bind(parser);
    vi.spyOn(parser, "setTimeoutMicros").mockImplementationOnce(() => setTimeout(1)).mockImplementation(setTimeout);
    const scan = await scanRepo(root);
    expect(scan.stats.files).toBe(1);
    expect(scan.stats.filesSkipped).toBe(1);
    expect(scan.graph.nodes.some((node) => node.name === "recovered")).toBe(true);
  });

  it("rewires namespace and named default imports to actual exported functions", async () => {
    const root = await repo();
    await fs.writeFile(join(root, "target.ts"), "export function useful() {}\nexport default function chosen() {}\n");
    await fs.writeFile(join(root, "caller.ts"), "import * as ns from './target';\nimport selected from './target';\nns.useful(); selected();\n");
    const { graph } = await scanRepo(root);
    for (const name of ["useful", "chosen"]) {
      const target = graph.nodes.find((node) => node.name === name && node.kind === "function")!;
      expect(graph.edges.some((edge) => edge.kind === "calls" && edge.to === target.id && edge.file === "caller.ts")).toBe(true);
    }
  });

  it("rewires Python module aliases and Go package member calls instead of the module binding name", async () => {
    const root = await repo();
    await fs.mkdir(join(root, "util"));
    await fs.writeFile(join(root, "util.py"), "def useful():\n    pass\n");
    await fs.writeFile(join(root, "caller.py"), "import util as module\nmodule.useful()\n");
    await fs.writeFile(join(root, "util", "util.go"), "package util\nfunc Useful() {}\n");
    await fs.writeFile(join(root, "caller.go"), "package main\nimport module \"example.com/util\"\nfunc Main() { module.Useful() }\n");
    const { graph } = await scanRepo(root);
    for (const name of ["useful", "Useful"]) {
      const target = graph.nodes.find((node) => node.name === name && node.kind === "function")!;
      expect(graph.edges.some((edge) => edge.kind === "calls" && edge.to === target.id && edge.file.startsWith("caller."))).toBe(true);
    }
  });
});
