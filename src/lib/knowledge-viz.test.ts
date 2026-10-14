import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { codeNoteVaultPath, sealGeneratedContent } from "./code-notes.js";
import { KnowledgeIndex } from "./knowledge-index.js";
import { GENERATED_MARKER, writeKnowledgeGraphFiles } from "./knowledge-viz.js";
import { BASE_GENERATED_MARKER } from "./obsidian-bases.js";
import { VaultFS } from "./vault-fs.js";

const HLA = "projects/p/architecture/high-level-architecture.md";
const LLA = "projects/p/architecture/low-level-architecture.md";
const ERD = "projects/p/architecture/data-model-erd.md";
const FLOW = "projects/p/architecture/dataflow.md";
const ARCHITECTURE_NOTES = [HLA, LLA, ERD, FLOW];

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

async function fixture(): Promise<{ vault: string; repo: string }> {
  const vault = await tempDir("kv-vault-");
  const repo = await tempDir("kv-repo-");
  await mkdir(join(vault, "projects", "p"), { recursive: true });
  await writeFile(
    join(vault, "projects", "p", "context.md"),
    "---\ntype: context\n---\n\n# Demo\n\nhello from the vault\n",
    "utf-8",
  );
  await mkdir(join(repo, "src"), { recursive: true });
  await writeFile(join(repo, "src", "util.ts"), "export function helper(): number {\n  return 1;\n}\n", "utf-8");
  await writeFile(
    join(repo, "src", "main.ts"),
    'import { helper } from "./util";\n\nexport function start(): number {\n  return helper();\n}\n',
    "utf-8",
  );
  return { vault, repo };
}

describe("writeKnowledgeGraphFiles", { timeout: 15_000 }, () => {
  it("writes architecture and code notes with the pinned result shape", async () => {
    const { vault, repo } = await fixture();
    const result = await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    expect(result).toEqual({
      project: "p",
      notes: ARCHITECTURE_NOTES,
      code_notes: { written: 2, removed: 0, total: 2, skipped: 0 },
      nodes: 1,
      edges: 0,
      kept: [],
    });

    for (const rel of ARCHITECTURE_NOTES) {
      expect(existsSync(join(vault, rel))).toBe(true);
    }
    const high = await readFile(join(vault, HLA), "utf-8");
    expect(high).toContain(GENERATED_MARKER);
    expect(high).toContain("# High-level architecture");
    expect(high).toContain("```mermaid");
    expect(high).toContain(LLA);
    expect(high).toContain(ERD);
    expect(high).toContain(FLOW);

    const main = await readFile(join(vault, codeNoteVaultPath("p", "src/main.ts")), "utf-8");
    expect(main).toContain("type: code");
    expect(main).toContain("# src/main.ts");
    expect(main).toContain("## Imports\n\n- [[projects/p/code/src/util.ts]]");
    expect(main).toContain("## Source\n\n```typescript");

    const dashboard = await readFile(join(vault, "projects", "p", "index.md"), "utf-8");
    expect(dashboard).toContain("type: index");
    expect(dashboard).toContain('project: "p"');
    expect(dashboard).toContain("## Decisions (0)");
    expect(dashboard).toContain("## Learnings (0)");
    expect(dashboard).toContain("## Sessions (0)");
    expect(dashboard).toContain("2 generated code notes");

    const base = await readFile(join(vault, "projects", "p", "views.base"), "utf-8");
    expect(base.startsWith(`${BASE_GENERATED_MARKER}\n`)).toBe(true);
    expect(base).toContain('file.inFolder("projects/p/decisions")');
    expect(base).toContain("limit: 100");

    const idx = KnowledgeIndex.openForProject(vault, "p");
    try {
      expect(idx.outgoing(HLA)).toEqual(expect.arrayContaining([LLA, ERD, FLOW]));
      expect(idx.outgoing(codeNoteVaultPath("p", "src/main.ts"))).toEqual([codeNoteVaultPath("p", "src/util.ts")]);
      expect(idx.incoming(codeNoteVaultPath("p", "src/util.ts"))).toEqual([codeNoteVaultPath("p", "src/main.ts")]);
    } finally {
      idx.close();
    }
  });

  it("is idempotent across runs", async () => {
    const { vault, repo } = await fixture();
    await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    const before = await readFile(join(vault, HLA), "utf-8");
    const second = await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    expect(second.code_notes).toEqual({ written: 0, removed: 0, total: 2, skipped: 0 });
    expect(second.kept).toEqual([]);
    expect(second.notes).toEqual(ARCHITECTURE_NOTES);
    expect(await readFile(join(vault, HLA), "utf-8")).toBe(before);
  });

  it("leaves annotations and inline edits intact in sealed architecture, dashboard and Bases notes", async () => {
    const { vault, repo } = await fixture();
    await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    const paths = [HLA, "projects/p/index.md", "projects/p/views.base"];
    const edited = new Map<string, string>();
    for (const path of paths) {
      const original = await readFile(join(vault, path), "utf-8");
      const content = path.endsWith(".base") ? original.replace("name: Decisions", "name: My decisions") : `${original}\nMy annotation.\n`;
      edited.set(path, content);
      await writeFile(join(vault, path), content);
    }
    await writeFile(join(repo, "src/new.ts"), "export const added = true;\n");
    const result = await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    expect(result.kept).toEqual(paths);
    for (const [path, content] of edited) expect(await readFile(join(vault, path), "utf-8")).toBe(content);
  });

  it("counts only current generated code notes and reports skipped notes in the dashboard", async () => {
    const { vault, repo } = await fixture();
    await mkdir(join(vault, "projects/p/code/src"), { recursive: true });
    await writeFile(join(vault, codeNoteVaultPath("p", "src/main.ts")), "# My source annotation\n");
    const result = await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    expect(result.code_notes).toEqual({ written: 1, removed: 0, total: 1, skipped: 1 });
    const dashboard = await readFile(join(vault, "projects/p/index.md"), "utf-8");
    expect(dashboard).toContain("1 generated code notes");
    expect(dashboard).toContain("1 written, 1 skipped");
    expect(dashboard).not.toContain("2 generated code notes");
  });

  it("preserves arbitrary user files with legacy artifact names", async () => {
    const { vault, repo } = await fixture();
    const files = ["knowledge-graph.html", "knowledge-graph.canvas", "architecture-diagrams.html"];
    for (const file of files) await writeFile(join(vault, "projects/p", file), `My own ${file}\n`);
    await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    for (const file of files) expect(await readFile(join(vault, "projects/p", file), "utf-8")).toBe(`My own ${file}\n`);
  });

  it("skips filenames that become too long when encoded and still writes a truthful dashboard", async () => {
    const { vault, repo } = await fixture();
    await writeFile(join(repo, "src", `${"é".repeat(50)}.ts`), "export const value = 1;\n");
    const result = await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    expect(result.code_notes).toEqual({ written: 2, removed: 0, total: 2, skipped: 1 });
    const dashboard = await readFile(join(vault, "projects/p/index.md"), "utf-8");
    expect(dashboard).toContain("2 generated code notes");
    expect(dashboard).toContain("2 written, 1 skipped");
  });

  it("uses safe Markdown links for vault record filenames containing wikilink delimiters", async () => {
    const { vault, repo } = await fixture();
    await mkdir(join(vault, "projects/p/decisions"));
    await writeFile(join(vault, "projects/p/decisions/001-[draft]|#notes.md"), "# My decision\n");
    await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    const dashboard = await readFile(join(vault, "projects/p/index.md"), "utf-8");
    expect(dashboard).toContain("## Decisions (1)");
    expect(dashboard).toContain("(<decisions/001-%5Bdraft%5D%7C%23notes.md>)");
    expect(dashboard).not.toContain("[[projects/p/decisions/001-[draft]|#notes]]");
  });

  it("preserves user-edited architecture notes and reports them as kept", async () => {
    const { vault, repo } = await fixture();
    const custom = "---\ntype: architecture\n---\n\n# My architecture notes\n\nDo not clobber.\n";
    await mkdir(join(vault, "projects", "p", "architecture"), { recursive: true });
    await writeFile(join(vault, HLA), custom, "utf-8");
    await writeFile(join(vault, ERD), `---\ntype: architecture\n---\n\n${GENERATED_MARKER}\n\nold erd\n`, "utf-8");
    const result = await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    expect(await readFile(join(vault, HLA), "utf-8")).toBe(custom);
    expect(result.kept).toEqual([HLA, ERD]);
    expect(result.notes).toEqual(ARCHITECTURE_NOTES);
    const erd = await readFile(join(vault, ERD), "utf-8");
    expect(erd).toContain("old erd");
    expect(erd).toContain(GENERATED_MARKER);
    expect(existsSync(join(vault, LLA))).toBe(true);
    expect(existsSync(join(vault, FLOW))).toBe(true);
  });

  it("links architecture, vault records, and code notes from the dashboard", async () => {
    const { vault, repo } = await fixture();
    const records: Array<[dir: string, type: string, names: string[]]> = [
      [
        "decisions",
        "decision",
        Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(3, "0")}-decision-${i + 1}`),
      ],
      ["learnings", "learning", ["001-learn"]],
      ["sessions", "session", ["001-session"]],
    ];
    for (const [dir, type, names] of records) {
      await mkdir(join(vault, "projects", "p", dir), { recursive: true });
      for (const name of names) {
        await writeFile(
          join(vault, "projects", "p", dir, `${name}.md`),
          `---\ntype: ${type}\n---\n\n# ${name}\n`,
          "utf-8",
        );
      }
    }

    const result = await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    expect(result.kept).toEqual([]);

    const dashboard = await readFile(join(vault, "projects", "p", "index.md"), "utf-8");
    expect(dashboard).toContain(GENERATED_MARKER);
    expect(dashboard).toContain("\n# p\n");
    for (const rel of ARCHITECTURE_NOTES) {
      expect(dashboard).toContain(`- [[${rel.slice(0, -3)}]]`);
    }
    expect(dashboard).toContain("## Decisions (12)");
    expect(dashboard).toContain("- [[projects/p/decisions/012-decision-12]]");
    expect(dashboard).toContain("- [[projects/p/decisions/003-decision-3]]");
    expect(dashboard).not.toContain("- [[projects/p/decisions/002-decision-2]]");
    expect(dashboard).not.toContain("- [[projects/p/decisions/001-decision-1]]");
    expect(dashboard).toContain("## Learnings (1)");
    expect(dashboard).toContain("- [[projects/p/learnings/001-learn]]");
    expect(dashboard).toContain("## Sessions (1)");
    expect(dashboard).toContain("- [[projects/p/sessions/001-session]]");
    expect(dashboard).toContain("2 generated code notes");

    const idx = KnowledgeIndex.openForProject(vault, "p");
    try {
      expect(idx.outgoing("projects/p/index.md")).toEqual(
        expect.arrayContaining([...ARCHITECTURE_NOTES, "projects/p/decisions/012-decision-12.md"]),
      );
      expect(idx.incoming(HLA)).toContain("projects/p/index.md");
    } finally {
      idx.close();
    }
  });

  it("keeps user-edited dashboard and legacy marked Bases views and dashboards", async () => {
    const { vault, repo } = await fixture();
    const dashboardPath = join(vault, "projects", "p", "index.md");
    const basePath = join(vault, "projects", "p", "views.base");
    await writeFile(dashboardPath, "# Hand-written dashboard\n", "utf-8");
    await writeFile(basePath, 'filters:\n  and:\n    - file.inFolder("projects/p")\n', "utf-8");

    const first = await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    expect(first.kept).toEqual(["projects/p/index.md", "projects/p/views.base"]);
    expect(await readFile(dashboardPath, "utf-8")).toBe("# Hand-written dashboard\n");
    expect(await readFile(basePath, "utf-8")).toBe('filters:\n  and:\n    - file.inFolder("projects/p")\n');

    await writeFile(dashboardPath, `---\ntype: index\n---\n\n${GENERATED_MARKER}\n\nstale dashboard\n`, "utf-8");
    await writeFile(basePath, `${BASE_GENERATED_MARKER}\nfilters: stale\n`, "utf-8");
    const second = await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    expect(second.kept).toEqual(["projects/p/index.md", "projects/p/views.base"]);
    expect(await readFile(dashboardPath, "utf-8")).toContain("stale dashboard");
    expect(await readFile(basePath, "utf-8")).toContain("filters: stale");
  });

  it("removes generated code notes for deleted sources and preserves edited ones", async () => {
    const { vault, repo } = await fixture();
    await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });

    const mainNote = codeNoteVaultPath("p", "src/main.ts");
    await writeFile(join(vault, mainNote), "---\ntype: code\n---\n\n# Hand-written\n", "utf-8");
    await rm(join(repo, "src", "main.ts"));
    await rm(join(repo, "src", "util.ts"));

    const result = await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    expect(result.code_notes).toEqual({ written: 0, removed: 1, total: 0, skipped: 0 });
    expect(existsSync(join(vault, codeNoteVaultPath("p", "src/util.ts")))).toBe(false);
    expect(await readFile(join(vault, mainNote), "utf-8")).toContain("# Hand-written");
  });

  it("only deletes positively identified and unedited legacy artifacts", async () => {
    const { vault, repo } = await fixture();
    const stale = [
      ["knowledge-graph", "html"],
      ["knowledge-graph", "canvas"],
      [["architecture", "diagrams"].join("-"), "html"],
    ].map(([stem, extension]) => `projects/p/${stem}.${extension}`);
    for (const rel of stale) {
      await writeFile(join(vault, rel), sealGeneratedContent(`${GENERATED_MARKER}\nlegacy artifact\n`), "utf-8");
    }
    const result = await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    for (const rel of stale) {
      expect(existsSync(join(vault, rel))).toBe(false);
    }
    expect(result.project).toBe("p");
  });

  it("keeps legacy marker-only artifacts and annotated sealed artifacts", async () => {
    const { vault, repo } = await fixture();
    const files = new Map([
      ["projects/p/knowledge-graph.html", `${GENERATED_MARKER}\nOld dashboard with user annotations.\n`],
      ["projects/p/knowledge-graph.canvas", `${sealGeneratedContent(`${GENERATED_MARKER}\nlegacy artifact\n`)}\nMy additions.\n`],
    ]);
    for (const [path, content] of files) await writeFile(join(vault, path), content);
    const result = await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    expect(result.kept).toEqual([...files.keys()]);
    for (const [path, content] of files) expect(await readFile(join(vault, path), "utf-8")).toBe(content);
  });

  it("validates the latest legacy artifact inside deleteIf after a concurrent user annotation", async () => {
    const { vault, repo } = await fixture();
    const path = "projects/p/knowledge-graph.html";
    const original = sealGeneratedContent(`${GENERATED_MARKER}\nlegacy artifact\n`);
    const annotated = `${original}\nLate user annotation.\n`;
    await writeFile(join(vault, path), original);
    const remove = VaultFS.prototype.deleteIf;
    const deleting = vi.spyOn(VaultFS.prototype, "deleteIf").mockImplementation(async function (this: VaultFS, entry, predicate) {
      if (entry === path) await writeFile(join(vault, path), annotated);
      return remove.call(this, entry, predicate);
    });
    const result = await writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo });
    expect(deleting).toHaveBeenCalled();
    expect(result.kept).toContain(path);
    expect(await readFile(join(vault, path), "utf-8")).toBe(annotated);
  });

  it.each([HLA, LLA, ERD, FLOW, "projects/p/index.md", "projects/p/views.base", codeNoteVaultPath("p", "src/main.ts")])(
    "rejects output symlinks into sibling projects: %s",
    async (output) => {
      const { vault, repo } = await fixture();
      const sibling = join(vault, "projects", "other");
      await mkdir(sibling, { recursive: true });
      await mkdir(join(vault, "projects", "p", "architecture"), { recursive: true });
      await mkdir(join(vault, "projects", "p", "code", "src"), { recursive: true });
      const target = join(sibling, "protected.txt");
      const original = `${GENERATED_MARKER}\nSibling project content`;
      await writeFile(target, original, "utf-8");
      await symlink(target, join(vault, output));
      await expect(writeKnowledgeGraphFiles(vault, "p", { codeRoot: repo })).rejects.toMatchObject({
        code: "PERMISSION_DENIED",
      });
      expect(await readFile(target, "utf-8")).toBe(original);
    },
  );
});
