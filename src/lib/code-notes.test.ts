import { afterEach, describe, expect, it, vi } from "vitest";
import { constants, existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanRepo } from "./codegraph/scan.js";
import { codeNoteLinkTarget, codeNoteVaultPath, writeCodeNotes } from "./code-notes.js";
import { parseFrontmatter } from "./frontmatter.js";
import { GENERATED_MARKER } from "./knowledge-viz.js";
import { VaultFS } from "./vault-fs.js";

vi.mock("node:fs/promises", async (original) => {
  const actual = await original<typeof import("node:fs/promises")>();
  return { ...actual, open: vi.fn(actual.open), readFile: vi.fn(actual.readFile) };
});

const cleanups: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(cleanups.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function tempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  cleanups.push(dir);
  return dir;
}

async function project(files: Record<string, string>) {
  const vault = await tempDir("code-notes-vault-");
  const repo = await tempDir("code-notes-repo-");
  await mkdir(join(vault, "projects", "demo"), { recursive: true });
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(repo, path, ".."), { recursive: true });
    await writeFile(join(repo, path), content);
  }
  return { vault, repo, vaultFs: new VaultFS(vault, { projectSlug: "demo" }) };
}

const noteAbs = (vault: string, file: string): string => join(vault, codeNoteVaultPath("demo", file));

describe("code note paths", () => {
  it("maps files to vault notes and wikilink targets", () => {
    expect(codeNoteVaultPath("demo", "src/lib/a.ts")).toBe("projects/demo/code/src/lib/a.ts.md");
    expect(codeNoteLinkTarget("demo", "src/lib/a.ts")).toBe("projects/demo/code/src/lib/a.ts");
  });
});

describe("writeCodeNotes", { timeout: 15_000 }, () => {
  it("writes one deterministic note per module with symbols and imports", async () => {
    const { vault, repo, vaultFs } = await project({
      "src/b.ts": "export function b(): number {\n  return 1;\n}\n",
      "src/a.ts": 'import { b } from "./b";\n\nexport function a(): number {\n  return b();\n}\n',
    });
    const scan = await scanRepo(repo);
    const result = await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan });
    expect(result).toEqual({ written: 2, removed: 0, total: 2, skipped: 0 });

    const a = await readFile(noteAbs(vault, "src/a.ts"), "utf-8");
    expect(a).toContain(GENERATED_MARKER);
    expect(a).toMatch(/^---\ntype: code\nproject: "demo"\npath: "src\/a\.ts"\nlanguage: typescript\nhash: [0-9a-f]{12}\ngenerated: true\n---\n/);
    expect(a).toContain("# src/a.ts\n");
    expect(a).toContain("5 lines · ");
    expect(a).toContain("## Symbols\n\n- `a` (function)");
    expect(a).toContain("## Imports\n\n- [[projects/demo/code/src/b.ts]]");
    expect(a).toContain("## Source\n\n```typescript");
    expect(a).not.toContain("## Imported by");

    const b = await readFile(noteAbs(vault, "src/b.ts"), "utf-8");
    expect(b).toContain("## Imported by\n\n- [[projects/demo/code/src/a.ts]]");
    expect(b).not.toContain("## Imports");

    const second = await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan });
    expect(second).toEqual({ written: 0, removed: 0, total: 2, skipped: 0 });
    expect(await readFile(noteAbs(vault, "src/a.ts"), "utf-8")).toBe(a);
  });

  it("uses the language fence tag and a fence longer than any backtick run in the source", async () => {
    const { vault, repo, vaultFs } = await project({
      "svc/main.py": "def run():\n    return '```'\n",
    });
    const scan = await scanRepo(repo);
    const result = await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan });
    expect(result).toEqual({ written: 1, removed: 0, total: 1, skipped: 0 });
    const note = await readFile(noteAbs(vault, "svc/main.py"), "utf-8");
    expect(note).toContain("````python");
    expect(note).toContain("return '```'");
  });

  it("omits secret-bearing source while keeping the note and its links", async () => {
    const { vault, repo, vaultFs } = await project({
      "src/creds.ts": 'export const api_key = "abcdefghijklmnopqrstuvwx";\n',
      "src/uses.ts": 'import { api_key } from "./creds";\n\nexport const value = api_key;\n',
    });
    const scan = await scanRepo(repo);
    const result = await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan });
    expect(result).toEqual({ written: 2, removed: 0, total: 2, skipped: 0 });
    const creds = await readFile(noteAbs(vault, "src/creds.ts"), "utf-8");
    expect(creds).not.toContain("abcdefghijklmnopqrstuvwx");
    expect(creds).toContain("Source omitted because it contains a secret-like pattern.");
    const uses = await readFile(noteAbs(vault, "src/uses.ts"), "utf-8");
    expect(uses).toContain("[[projects/demo/code/src/creds.ts]]");
    expect(uses).toContain("```typescript");
  });

  it("removes generated notes for deleted sources and preserves user-edited notes", async () => {
    const { vault, repo, vaultFs } = await project({
      "src/keep.ts": "export const keep = 1;\n",
      "src/edited.ts": "export const edited = 2;\n",
      "src/gone.ts": "export const gone = 3;\n",
    });
    const scan = await scanRepo(repo);
    expect(await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan })).toEqual({ written: 3, removed: 0, total: 3, skipped: 0 });

    await writeFile(noteAbs(vault, "src/edited.ts"), "---\ntype: code\n---\n\n# My own note\n", "utf-8");

    await rm(join(repo, "src/gone.ts"));
    await rm(join(repo, "src/edited.ts"));
    const next = await scanRepo(repo);
    expect(await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: next })).toEqual({ written: 0, removed: 1, total: 1, skipped: 0 });

    expect(existsSync(noteAbs(vault, "src/gone.ts"))).toBe(false);
    expect(existsSync(noteAbs(vault, "src/edited.ts"))).toBe(true);
    expect(await readFile(noteAbs(vault, "src/keep.ts"), "utf-8")).toContain(GENERATED_MARKER);
  });

  it("removes every generated note when the scan is empty", async () => {
    const { vault, repo, vaultFs } = await project({ "src/one.ts": "export const one = 1;\n" });
    await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: await scanRepo(repo) });
    const empty = await tempDir("code-notes-empty-");
    const result = await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: empty, scan: await scanRepo(empty) });
    expect(result).toEqual({ written: 0, removed: 1, total: 0, skipped: 0 });
    expect(existsSync(noteAbs(vault, "src/one.ts"))).toBe(false);
    const remaining = await vaultFs.list("projects/demo/code");
    expect(remaining.filter((entry) => entry.endsWith(".md"))).toEqual([]);
  });

  it("skips unreadable sources without aborting the run", async () => {
    const { vault, repo, vaultFs } = await project({
      "src/present.ts": "export const present = 1;\n",
      "src/missing.ts": "export const missing = 2;\n",
    });
    const scan = await scanRepo(repo);
    await rm(join(repo, "src/missing.ts"));
    const result = await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan });
    expect(result).toEqual({ written: 1, removed: 0, total: 1, skipped: 1 });
    expect(existsSync(noteAbs(vault, "src/present.ts"))).toBe(true);
    expect(existsSync(noteAbs(vault, "src/missing.ts"))).toBe(false);
  });

  it.each(["oversized", "invalid UTF-8", "binary"])("skips source changed to %s after scanning without discarding valid neighbors", async (kind) => {
    const { vault, repo, vaultFs } = await project({
      "src/changed.ts": "export const changed = 1;\n",
      "src/present.ts": "export const present = 2;\n",
    });
    const scan = await scanRepo(repo);
    const unsafe = kind === "oversized" ? Buffer.alloc(1_000_001, 0x61)
      : kind === "binary" ? Buffer.from("export const changed = 1;\0") : Buffer.from([0xff, 0xfe, 0x61]);
    await writeFile(join(repo, "src/changed.ts"), unsafe);
    expect(await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan })).toEqual({ written: 1, removed: 0, total: 1, skipped: 1 });
    expect(existsSync(noteAbs(vault, "src/changed.ts"))).toBe(false);
    expect(await readFile(noteAbs(vault, "src/present.ts"), "utf-8")).toContain("export const present = 2;");
  });

  it.each(["file", "parent"])("does not copy external source through a %s symlink swapped after scanning", async (kind) => {
    const { vault, repo, vaultFs } = await project({
      "src/changed.ts": "export const changed = 1;\n",
      "keep.ts": "export const keep = 2;\n",
    });
    const scan = await scanRepo(repo);
    const outside = await tempDir("code-notes-outside-");
    await writeFile(join(outside, "changed.ts"), "export const confidentialOutside = 'do not copy';\n");
    if (kind === "file") {
      await rm(join(repo, "src/changed.ts"));
      await symlink(join(outside, "changed.ts"), join(repo, "src/changed.ts"));
    } else {
      await rm(join(repo, "src"), { recursive: true });
      await symlink(outside, join(repo, "src"));
    }
    expect(await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan })).toEqual({ written: 1, removed: 0, total: 1, skipped: 1 });
    expect(existsSync(noteAbs(vault, "src/changed.ts"))).toBe(false);
    expect(await readFile(noteAbs(vault, "keep.ts"), "utf-8")).not.toContain("confidentialOutside");
  });

  it("uses no-follow handles and bounds actual reads when a source grows after the first fstat", async () => {
    const { vault, repo, vaultFs } = await project({ "src/growing.ts": "export const growing = 1;\n" });
    const scan = await scanRepo(repo);
    const sourcePath = await realpath(join(repo, "src/growing.ts"));
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    const readSizes: number[] = [];
    let readCount = 0;
    let closed = false;
    const open = vi.spyOn(fs, "open").mockImplementation(async (file, flags, mode) => {
      const handle = await actual.open(file, flags, mode);
      if (String(file) !== sourcePath) return handle;
      const before = await handle.stat();
      vi.spyOn(handle, "stat").mockImplementationOnce(async () => {
        await fs.appendFile(sourcePath, "x".repeat(2_000_000));
        return before;
      });
      const read = vi.spyOn(handle, "read");
      const close = handle.close.bind(handle);
      vi.spyOn(handle, "close").mockImplementation(async () => {
        readCount = read.mock.calls.length;
        for (const call of read.mock.calls) {
          if (Buffer.isBuffer(call[0])) readSizes.push(call[0].length);
        }
        closed = true;
        await close();
      });
      return handle;
    });
    vi.mocked(fs.readFile).mockClear();
    expect(await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan })).toEqual({ written: 0, removed: 0, total: 0, skipped: 1 });
    expect(open.mock.calls.some(([path, flags]) => String(path) === sourcePath && typeof flags === "number" && (flags & constants.O_NOFOLLOW) !== 0)).toBe(true);
    expect(vi.mocked(fs.readFile).mock.calls.some(([path]) => String(path) === sourcePath || String(path) === join(repo, "src/growing.ts"))).toBe(false);
    expect(readCount).toBeGreaterThan(0);
    expect(readSizes.length).toBeGreaterThan(0);
    expect(readSizes.every((size) => size <= 1_000_000)).toBe(true);
    expect(closed).toBe(true);
    expect(existsSync(noteAbs(vault, "src/growing.ts"))).toBe(false);
  });

  it("checks physical containment after opening a source that is concurrently replaced by a symlink", async () => {
    const { vault, repo, vaultFs } = await project({ "src/one.ts": "export const one = 1;\n" });
    const scan = await scanRepo(repo);
    const sourcePath = await realpath(join(repo, "src/one.ts"));
    const outside = await tempDir("code-notes-open-race-");
    const target = join(outside, "one.ts");
    await writeFile(target, "export const confidentialOutside = 1;\n");
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.spyOn(fs, "open").mockImplementation(async (file, flags, mode) => {
      const handle = await actual.open(file, flags, mode);
      if (String(file) === sourcePath) {
        await rm(sourcePath);
        await symlink(target, sourcePath);
      }
      return handle;
    });
    expect(await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan })).toEqual({ written: 0, removed: 0, total: 0, skipped: 1 });
    expect(existsSync(noteAbs(vault, "src/one.ts"))).toBe(false);
  });

  it("validates the latest stale note inside deleteIf after a concurrent user annotation", async () => {
    const { vault, repo, vaultFs } = await project({ "src/one.ts": "export const one = 1;\n" });
    await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: await scanRepo(repo) });
    const path = codeNoteVaultPath("demo", "src/one.ts");
    const annotated = `${await readFile(noteAbs(vault, "src/one.ts"), "utf-8")}\nLate user annotation.\n`;
    await rm(join(repo, "src/one.ts"));
    const remove = vaultFs.deleteIf.bind(vaultFs);
    const deleting = vi.spyOn(vaultFs, "deleteIf").mockImplementation(async (entry, predicate) => {
      if (entry === path) await writeFile(noteAbs(vault, "src/one.ts"), annotated);
      return remove(entry, predicate);
    });
    expect((await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: await scanRepo(repo) })).removed).toBe(0);
    expect(deleting).toHaveBeenCalled();
    expect(await readFile(noteAbs(vault, "src/one.ts"), "utf-8")).toBe(annotated);
  });

  it.each(["annotation", "inline edit"])("preserves a generated note with a user %s when its source changes", async (edit) => {
    const { vault, repo, vaultFs } = await project({ "src/one.ts": "export const one = 1;\n" });
    await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: await scanRepo(repo) });
    const path = noteAbs(vault, "src/one.ts");
    const original = await readFile(path, "utf-8");
    const edited = edit === "annotation" ? `${original}\nMy annotation.\n` : original.replace("# src/one.ts", "# My own title");
    await writeFile(path, edited);
    await writeFile(join(repo, "src/one.ts"), "export const one = 2;\n");

    expect(await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: await scanRepo(repo) })).toEqual({
      written: 0, removed: 0, total: 0, skipped: 1,
    });
    expect(await readFile(path, "utf-8")).toBe(edited);
  });

  it("keeps legacy generated notes without a content seal, including stale notes", async () => {
    const { vault, repo, vaultFs } = await project({ "src/one.ts": "export const one = 1;\n" });
    const legacy = `---\ntype: code\nhash: abcdef123456\n---\n\n${GENERATED_MARKER}\n\n# Old generated note\n\nUser annotation.\n`;
    await mkdir(join(vault, "projects/demo/code/src"), { recursive: true });
    await writeFile(noteAbs(vault, "src/one.ts"), legacy);
    await writeFile(noteAbs(vault, "src/gone.ts"), legacy);
    expect(await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: await scanRepo(repo) })).toEqual({
      written: 0, removed: 0, total: 0, skipped: 1,
    });
    expect(await readFile(noteAbs(vault, "src/one.ts"), "utf-8")).toBe(legacy);
    expect(await readFile(noteAbs(vault, "src/gone.ts"), "utf-8")).toBe(legacy);
  });

  it("updates an intact note when source or imported-by metadata changes", async () => {
    const { vault, repo, vaultFs } = await project({ "src/one.ts": "export const one = 1;\n" });
    await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: await scanRepo(repo) });
    const original = await readFile(noteAbs(vault, "src/one.ts"), "utf-8");
    await writeFile(join(repo, "src/two.ts"), 'import { one } from "./one";\nexport const two = one;\n');
    const result = await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: await scanRepo(repo) });
    expect(result).toEqual({ written: 2, removed: 0, total: 2, skipped: 0 });
    const linked = await readFile(noteAbs(vault, "src/one.ts"), "utf-8");
    expect(linked).toContain("## Imported by\n\n- [[projects/demo/code/src/two.ts]]");
    expect(linked.match(/^hash: (.+)$/m)?.[1]).not.toBe(original.match(/^hash: (.+)$/m)?.[1]);
    await writeFile(join(repo, "src/one.ts"), "export const one = 2;\n");
    await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: await scanRepo(repo) });
    expect(await readFile(noteAbs(vault, "src/one.ts"), "utf-8")).toContain("export const one = 2;");
  });

  it("updates the hash and rendered content when extracted symbols or language metadata change", async () => {
    const { vault, repo, vaultFs } = await project({ "src/one.ts": "export const one = 1;\n" });
    const scan = await scanRepo(repo);
    await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan });
    const original = await readFile(noteAbs(vault, "src/one.ts"), "utf-8");
    const changed = { ...scan, graph: { ...scan.graph, nodes: scan.graph.nodes.map((node) => ({
      ...node, language: "rust" as const, name: node.kind === "module" ? node.name : "renamed",
    })) } };
    expect((await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: changed })).written).toBe(1);
    const updated = await readFile(noteAbs(vault, "src/one.ts"), "utf-8");
    expect(updated).toContain("- `renamed` (const)");
    expect(updated).toContain("```rust\n");
    expect(updated.match(/^hash: (.+)$/m)?.[1]).not.toBe(original.match(/^hash: (.+)$/m)?.[1]);
  });

  it("preserves annotations on stale generated notes and does not remove notes after an incomplete scan", async () => {
    const { vault, repo, vaultFs } = await project({
      "src/edited.ts": "export const edited = 1;\n",
      "src/omitted.ts": "export const omitted = 1;\n",
    });
    const scan = await scanRepo(repo);
    await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan });
    const editedPath = noteAbs(vault, "src/edited.ts");
    const edited = `${await readFile(editedPath, "utf-8")}\nUser annotation.\n`;
    await writeFile(editedPath, edited);
    const incomplete = { ...scan, graph: { ...scan.graph, nodes: [], edges: [] }, stats: { ...scan.stats, filesSkipped: 2 } };
    expect((await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: incomplete })).removed).toBe(0);
    expect(await readFile(editedPath, "utf-8")).toBe(edited);
    expect(existsSync(noteAbs(vault, "src/omitted.ts"))).toBe(true);
    await rm(join(repo, "src/edited.ts"));
    expect((await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: await scanRepo(repo) })).removed).toBe(0);
    expect(await readFile(editedPath, "utf-8")).toBe(edited);
  });

  it("safely encodes non-ASCII and wikilink delimiters in filenames without aborting other notes", async () => {
    const { vault, repo, vaultFs } = await project({
      "src/café[entry]|#%.ts": "export const value = 1;\n",
      "src/plain.ts": "export const plain = 2;\n",
    });
    const scan = await scanRepo(repo);
    const file = scan.graph.nodes.find((node) => node.kind === "module" && node.file !== "src/plain.ts")!.file;
    expect(await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan })).toEqual({ written: 2, removed: 0, total: 2, skipped: 0 });
    const path = codeNoteVaultPath("demo", file);
    expect(path).toMatch(/^[\x20-\x7e]+$/);
    expect(path).not.toMatch(/[\[\]|#]/);
    expect(path).toContain("%5Bentry%5D%7C%23%25.ts.md");
    const note = await readFile(join(vault, path), "utf-8");
    expect(note).toContain(`path: ${JSON.stringify(file)}`);
    expect(note).toContain("\\[entry\\]\\|\\#%");
    expect(existsSync(noteAbs(vault, "src/plain.ts"))).toBe(true);
  });

  it("escapes control characters in filenames across headings, frontmatter and links", async () => {
    const name = "src/[entry]|#\n\u0085\u2028.ts";
    const { vault, repo, vaultFs } = await project({ [name]: "export const value = 1;\n" });
    const scan = await scanRepo(repo);
    const file = scan.graph.nodes.find((node) => node.kind === "module")!.file;
    expect((await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan })).written).toBe(1);
    const note = await readFile(noteAbs(vault, file), "utf-8");
    expect(parseFrontmatter(note).data.path).toBe(file);
    expect(note).toContain("# src/\\[entry\\]\\|\\#   .ts\n");
    expect(note).not.toContain("\u0085");
    expect(note).not.toContain("\u2028");
    expect(codeNoteLinkTarget("demo", file)).not.toMatch(/[\[\]|#\x00-\x1f\x7f-\x9f\u2028]/);
  });

  it("uses encoded import links that match the generated note filenames", async () => {
    const { vault, repo, vaultFs } = await project({
      "src/[child]|#.ts": "export const child = 1;\n",
      "src/parent.ts": 'import { child } from "./[child]|#";\nexport const parent = child;\n',
    });
    await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: await scanRepo(repo) });
    const note = await readFile(noteAbs(vault, "src/parent.ts"), "utf-8");
    expect(note).toContain("[[projects/demo/code/src/%5Bchild%5D%7C%23.ts]]");
    expect(note).not.toContain("[[projects/demo/code/src/[child]|#.ts]]");
    expect(existsSync(noteAbs(vault, "src/[child]|#.ts"))).toBe(true);
  });

  it("keeps a source note if its source still exists but was omitted from a scan", async () => {
    const { vault, repo, vaultFs } = await project({ "src/one.ts": "export const one = 1;\n" });
    const scan = await scanRepo(repo);
    await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan });
    const omitted = { ...scan, graph: { ...scan.graph, nodes: [], edges: [] } };
    expect((await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: omitted })).removed).toBe(0);
    expect(existsSync(noteAbs(vault, "src/one.ts"))).toBe(true);
  });

  it("does not replace an existing empty user note", async () => {
    const { vault, repo, vaultFs } = await project({ "src/one.ts": "export const one = 1;\n" });
    await mkdir(join(vault, "projects/demo/code/src"), { recursive: true });
    await writeFile(noteAbs(vault, "src/one.ts"), "");
    expect(await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: await scanRepo(repo) })).toEqual({
      written: 0, removed: 0, total: 0, skipped: 1,
    });
    expect(await readFile(noteAbs(vault, "src/one.ts"), "utf-8")).toBe("");
  });

  it.each([["src/one.ts", "typescript", "export const one = 1;"], ["src/one.rs", "rust", "pub fn one() {}"]])(
    "uses the canonical language alias and closes CRLF source fences for %s", async (file, language, source) => {
      const { vault, repo, vaultFs } = await project({ [file]: `${source}\r\n` });
      await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: await scanRepo(repo) });
      const note = await readFile(noteAbs(vault, file), "utf-8");
      expect(note).toContain(`\n\`\`\`${language}\n${source}\n\`\`\`\n`);
      expect(note).not.toContain("\r");
    },
  );
});
