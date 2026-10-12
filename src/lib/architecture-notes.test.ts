import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanRepo } from "./codegraph/scan.js";
import { buildArchitectureNotes } from "./architecture-notes.js";

const expected: Record<string, { title: string; body: string }> = JSON.parse(
  readFileSync(new URL("./__fixtures__/architecture-notes.expected.json", import.meta.url), "utf-8"),
) as Record<string, { title: string; body: string }>;

const FIXTURE_FILES: Record<string, string> = {
  "src/lib/util.ts": `export interface Options {
  retries: number;
}

export class Store {
  get(): number {
    return helper();
  }
}

export function helper(): number {
  return 1;
}
`,
  "src/app.ts": `import { Store, helper } from "./lib/util";

export function start(): number {
  const store = new Store();
  return store.get() + helper();
}

start();
`,
  "web/main.ts": `import { helper } from "../src/lib/util";

export function boot(): number {
  return helper();
}
`,
  "py/models.py": `class Thing:
    def value(self):
        return 7
`,
  "py/service.py": `from py.models import Thing


class Service:
    def run(self):
        return Thing().value()
`,
  "go/helper/helper.go": `package helper

func Helper() int {
	return 1
}
`,
  "go/main.go": `package main

import "example.com/tools/helper"

type Config struct {
	Name string
}

func main() {
	_ = helper.Helper()
}
`,
};

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixtureRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "architecture-notes-"));
  roots.push(root);
  for (const [path, content] of Object.entries(FIXTURE_FILES)) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), content);
  }
  return root;
}

describe("buildArchitectureNotes", { timeout: 15_000 }, () => {
  it("reproduces the frozen high-level, module, data-type, and call-flow diagrams", async () => {
    const scan = await scanRepo(await fixtureRepo());
    const result = buildArchitectureNotes({ slug: "sample-app", scan });
    expect(result.notes.map((note) => ({ id: note.id, title: note.title, body: note.body }))).toEqual([
      { id: "diag:high", ...expected["diag:high"] },
      { id: "diag:low", ...expected["diag:low"] },
      { id: "diag:erd", ...expected["diag:erd"] },
      { id: "diag:flow", ...expected["diag:flow"] },
    ]);
    expect(result.nodes).toBe(4);
    expect(result.edges).toBe(1);
  });

  it("produces the same notes regardless of scanner input order", async () => {
    const scan = await scanRepo(await fixtureRepo());
    const shuffled = {
      ...scan,
      graph: { ...scan.graph, nodes: [...scan.graph.nodes].reverse(), edges: [...scan.graph.edges].reverse() },
    };
    expect(buildArchitectureNotes({ slug: "sample-app", scan: shuffled })).toEqual(
      buildArchitectureNotes({ slug: "sample-app", scan }),
    );
  });

  it("reports empty analysis without inventing an architecture", async () => {
    const root = await mkdtemp(join(tmpdir(), "architecture-notes-empty-"));
    roots.push(root);
    await writeFile(join(root, "README.md"), "# Only documentation");
    const result = buildArchitectureNotes({ slug: "sample-app", scan: await scanRepo(root) });
    expect(result.nodes).toBe(0);
    expect(result.edges).toBe(0);
    expect(result.notes[0].body).toContain("No supported source files were found in this project.");
    expect(result.notes[3].body).toContain("No call relationships were extracted from the supported source files.");
  });
});
