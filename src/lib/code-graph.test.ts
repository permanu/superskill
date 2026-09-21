import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanImportGraph } from "./code-graph.js";

describe("scanImportGraph", () => {
  let root: string;

  beforeEach(async () => {
    root = join(tmpdir(), `cg-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(join(root, "src/lib"), { recursive: true });
    await mkdir(join(root, "src/commands"), { recursive: true });
    await writeFile(join(root, "src/lib/vault-fs.ts"), `export class VaultFS {}\n`);
    await writeFile(join(root, "src/lib/knowledge-index.ts"), `export function upsert() {}\n`);
    await writeFile(
      join(root, "src/commands/write.ts"),
      `import { VaultFS } from "../lib/vault-fs.js";\nimport { upsert } from "../lib/knowledge-index.js";\n`,
    );
  });

  afterEach(() => rm(root, { recursive: true, force: true }));

  it("connects relative imports to real files", () => {
    const g = scanImportGraph(root);
    expect(g.nodes.map((n) => n.id)).toEqual(
      expect.arrayContaining([
        "src/lib/vault-fs.ts",
        "src/commands/write.ts",
        "src/lib/knowledge-index.ts",
      ]),
    );
    const pairs = g.edges.map((e) => `${e.from}->${e.to}`);
    expect(pairs).toContain("src/commands/write.ts->src/lib/vault-fs.ts");
    expect(pairs).toContain("src/commands/write.ts->src/lib/knowledge-index.ts");
    expect(g.edges.length).toBeGreaterThanOrEqual(2);
  });
});
