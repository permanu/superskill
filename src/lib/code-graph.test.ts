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
    await writeFile(
      join(root, "src/lib/vault-fs.test.ts"),
      `import { VaultFS } from "./vault-fs.js";\nexport const test = VaultFS;\n`,
    );
    await writeFile(
      join(root, "src/lib/vault-fs.spec.ts"),
      `import { VaultFS } from "./vault-fs.js";\nexport const spec = VaultFS;\n`,
    );
    await mkdir(join(root, "src/lib/__fixtures__"), { recursive: true });
    await writeFile(
      join(root, "src/lib/__fixtures__/fixture-module.ts"),
      `import { VaultFS } from "../vault-fs.js";\nexport const fixture = VaultFS;\n`,
    );
    await writeFile(
      join(root, "src/test-helpers.ts"),
      `import { VaultFS } from "./lib/vault-fs.js";\nexport const helper = VaultFS;\n`,
    );
    await writeFile(
      join(root, "src/lib/test-helpers.util.ts"),
      `export const util = 1;\n`,
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

  it("keeps regular src files as nodes", () => {
    const g = scanImportGraph(root);
    expect(g.nodes.map((n) => n.id)).toContain("src/lib/vault-fs.ts");
  });

  it("excludes test and spec files from nodes", () => {
    const g = scanImportGraph(root);
    const ids = g.nodes.map((n) => n.id);
    expect(ids).not.toContain("src/lib/vault-fs.test.ts");
    expect(ids).not.toContain("src/lib/vault-fs.spec.ts");
    expect(ids.every((id) => !id.endsWith(".test.ts") && !id.endsWith(".spec.ts"))).toBe(true);
  });

  it("excludes files under __fixtures__ directories from nodes", () => {
    const g = scanImportGraph(root);
    const ids = g.nodes.map((n) => n.id);
    expect(ids).not.toContain("src/lib/__fixtures__/fixture-module.ts");
    expect(ids.some((id) => id.includes("__fixtures__"))).toBe(false);
  });

  it("does not emit import edges from excluded files", () => {
    const g = scanImportGraph(root);
    const pairs = g.edges.map((e) => `${e.from}->${e.to}`);
    expect(pairs).not.toContain("src/lib/vault-fs.test.ts->src/lib/vault-fs.ts");
    expect(pairs).not.toContain("src/lib/vault-fs.spec.ts->src/lib/vault-fs.ts");
    expect(pairs).not.toContain("src/lib/__fixtures__/fixture-module.ts->src/lib/vault-fs.ts");
  });

  it("excludes test-helpers files from nodes while keeping regular files", () => {
    const g = scanImportGraph(root);
    const ids = g.nodes.map((n) => n.id);
    expect(ids).not.toContain("src/test-helpers.ts");
    expect(ids).not.toContain("src/lib/test-helpers.util.ts");
    expect(ids).toContain("src/lib/vault-fs.ts");
    const pairs = g.edges.map((e) => `${e.from}->${e.to}`);
    expect(pairs).not.toContain("src/test-helpers.ts->src/lib/vault-fs.ts");
  });
});
