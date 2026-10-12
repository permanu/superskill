import { afterEach, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanRepo } from "./codegraph/scan.js";
import { codeNoteLinkTarget, codeNoteVaultPath, writeCodeNotes } from "./code-notes.js";
import { GENERATED_MARKER } from "./knowledge-viz.js";
import { VaultFS } from "./vault-fs.js";

const cleanups: string[] = [];
afterEach(async () => {
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
    expect(result).toEqual({ written: 2, removed: 0, total: 2 });

    const a = await readFile(noteAbs(vault, "src/a.ts"), "utf-8");
    expect(a).toContain(GENERATED_MARKER);
    expect(a).toMatch(/^---\ntype: code\nproject: "demo"\npath: "src\/a\.ts"\nlanguage: typescript\nhash: [0-9a-f]{12}\ngenerated: true\n---\n/);
    expect(a).toContain("# src/a.ts\n");
    expect(a).toContain("5 lines · ");
    expect(a).toContain("## Symbols\n\n- `a` (function)");
    expect(a).toContain("## Imports\n\n- [[projects/demo/code/src/b.ts]]");
    expect(a).toContain("## Source\n\n```ts");
    expect(a).not.toContain("## Imported by");

    const b = await readFile(noteAbs(vault, "src/b.ts"), "utf-8");
    expect(b).toContain("## Imported by\n\n- [[projects/demo/code/src/a.ts]]");
    expect(b).not.toContain("## Imports");

    const second = await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan });
    expect(second).toEqual({ written: 0, removed: 0, total: 2 });
    expect(await readFile(noteAbs(vault, "src/a.ts"), "utf-8")).toBe(a);
  });

  it("uses the language fence tag and a fence longer than any backtick run in the source", async () => {
    const { vault, repo, vaultFs } = await project({
      "svc/main.py": "def run():\n    return '```'\n",
    });
    const scan = await scanRepo(repo);
    const result = await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan });
    expect(result).toEqual({ written: 1, removed: 0, total: 1 });
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
    expect(result).toEqual({ written: 2, removed: 0, total: 2 });
    const creds = await readFile(noteAbs(vault, "src/creds.ts"), "utf-8");
    expect(creds).not.toContain("abcdefghijklmnopqrstuvwx");
    expect(creds).toContain("Source omitted because it contains a secret-like pattern.");
    const uses = await readFile(noteAbs(vault, "src/uses.ts"), "utf-8");
    expect(uses).toContain("[[projects/demo/code/src/creds.ts]]");
    expect(uses).toContain("```ts");
  });

  it("removes generated notes for deleted sources and preserves user-edited notes", async () => {
    const { vault, repo, vaultFs } = await project({
      "src/keep.ts": "export const keep = 1;\n",
      "src/edited.ts": "export const edited = 2;\n",
      "src/gone.ts": "export const gone = 3;\n",
    });
    const scan = await scanRepo(repo);
    expect(await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan })).toEqual({ written: 3, removed: 0, total: 3 });

    await writeFile(noteAbs(vault, "src/edited.ts"), "---\ntype: code\n---\n\n# My own note\n", "utf-8");

    await rm(join(repo, "src/gone.ts"));
    await rm(join(repo, "src/edited.ts"));
    const next = await scanRepo(repo);
    expect(await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: next })).toEqual({ written: 0, removed: 1, total: 1 });

    expect(existsSync(noteAbs(vault, "src/gone.ts"))).toBe(false);
    expect(existsSync(noteAbs(vault, "src/edited.ts"))).toBe(true);
    expect(await readFile(noteAbs(vault, "src/keep.ts"), "utf-8")).toContain(GENERATED_MARKER);
  });

  it("removes every generated note when the scan is empty", async () => {
    const { vault, repo, vaultFs } = await project({ "src/one.ts": "export const one = 1;\n" });
    await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: repo, scan: await scanRepo(repo) });
    const empty = await tempDir("code-notes-empty-");
    const result = await writeCodeNotes({ vaultFs, slug: "demo", codeRoot: empty, scan: await scanRepo(empty) });
    expect(result).toEqual({ written: 0, removed: 1, total: 0 });
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
    expect(result).toEqual({ written: 1, removed: 0, total: 2 });
    expect(existsSync(noteAbs(vault, "src/present.ts"))).toBe(true);
    expect(existsSync(noteAbs(vault, "src/missing.ts"))).toBe(false);
  });
});
