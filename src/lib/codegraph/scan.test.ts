// SPDX-License-Identifier: Apache-2.0

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { moduleNodeId } from "./extractors/common.js";
import { fixturePath } from "./__fixtures__/paths.js";
import { resolveSpecifier, scanRepo, type FileIndex } from "./scan.js";
import type { CodeGraph, LanguageId } from "./types.js";

interface Case {
  language: string;
  root: string;
  from: string;
  to: string;
}

const CASES: Case[] = [
  { language: "typescript", root: "typescript", from: "src/parse.ts", to: "src/util.ts" },
  { language: "python", root: "python", from: "app.py", to: "util.py" },
  { language: "go", root: "go", from: "main.go", to: "util/util.go" },
  { language: "rust", root: "rust", from: "lib.rs", to: "util.rs" },
  { language: "java", root: "java", from: "Reporter.java", to: "Util.java" },
  { language: "c", root: "c", from: "reporter.c", to: "util.h" },
  { language: "cpp", root: "cpp", from: "reporter.cpp", to: "util.hpp" },
];

function hasResolvedImport(graph: CodeGraph, from: string, to: string): boolean {
  return graph.edges.some(
    (edge) =>
      edge.kind === "imports" &&
      edge.confidence === "INFERRED" &&
      edge.from === moduleNodeId(from) &&
      edge.to === moduleNodeId(to),
  );
}

describe("scanRepo", () => {
  for (const testCase of CASES) {
    it(`resolves ${testCase.language} imports ${testCase.from} -> ${testCase.to} as INFERRED`, async () => {
      const { graph, stats } = await scanRepo(fixturePath(testCase.root));
      expect(stats.parseErrors).toBe(0);
      expect(stats.files).toBeGreaterThan(0);
      expect(hasResolvedImport(graph, testCase.from, testCase.to)).toBe(true);
      expect(graph.edges.every((edge) => edge.confidence === "EXTRACTED" || edge.confidence === "INFERRED")).toBe(
        true,
      );
    });
  }

  it("rewires TS cross-file call placeholders to the target symbol", async () => {
    const { graph } = await scanRepo(fixturePath("typescript"));
    const format = graph.nodes.find((node) => node.name === "format" && node.kind === "function")!;
    const normalize = graph.nodes.find((node) => node.name === "normalize" && node.kind === "function")!;
    expect(normalize.file).toBe("src/util.ts");
    const rewired = graph.edges.filter(
      (edge) => edge.from === format.id && edge.to === normalize.id && edge.kind === "calls",
    );
    expect(rewired).toHaveLength(1);
    expect(rewired[0].confidence).toBe("INFERRED");
    const unresolved = graph.edges.filter(
      (edge) => edge.from === format.id && edge.to === "ext:./util.js#normalize" && edge.kind === "calls",
    );
    expect(unresolved).toHaveLength(0);
    const importFact = graph.edges.filter(
      (edge) =>
        edge.from === moduleNodeId("src/parse.ts") &&
        edge.to === "ext:./util.js#normalize" &&
        edge.kind === "imports",
    );
    expect(importFact).toHaveLength(1);
    expect(importFact[0].confidence).toBe("EXTRACTED");
  });

  it("reports node and edge counts by kind and confidence", async () => {
    const { graph, stats } = await scanRepo(fixturePath("typescript"));
    expect(stats.nodes).toBe(graph.nodes.length);
    expect(stats.edges).toBe(graph.edges.length);
    expect(stats.nodesByKind.module).toBe(3);
    expect(stats.nodesByKind.class).toBeGreaterThan(0);
    expect(stats.edgesByKind.defines).toBeGreaterThan(0);
    expect(stats.edgesByKind.imports).toBeGreaterThan(0);
    expect(stats.edgesByConfidence.EXTRACTED).toBeGreaterThan(0);
    expect(stats.edgesByConfidence.INFERRED).toBeGreaterThan(0);
  });

  it("skips configured directories and unsupported files", async () => {
    const root = await mkdtemp(join(tmpdir(), "codegraph-scan-"));
    try {
      await mkdir(join(root, "node_modules"), { recursive: true });
      await mkdir(join(root, ".git"), { recursive: true });
      await mkdir(join(root, "src"), { recursive: true });
      await writeFile(join(root, "node_modules", "ignored.ts"), "export const ignored = 1;\n");
      await writeFile(join(root, ".git", "ignored.ts"), "export const ignored = 1;\n");
      await writeFile(join(root, "src", "kept.ts"), "export function kept(): void {}\n");
      await writeFile(join(root, "src", "ignored.rb"), "def ignored; end\n");
      const { graph, stats } = await scanRepo(root);
      expect(stats.files).toBe(1);
      expect(stats.filesSkipped).toBe(0);
      expect(graph.nodes.some((node) => node.file.includes("ignored"))).toBe(false);
      expect(graph.nodes.some((node) => node.file === "src/kept.ts")).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("throws a clear error when the root does not exist", async () => {
    await expect(scanRepo(join(tmpdir(), `codegraph-missing-${Date.now()}`))).rejects.toThrow(/not a directory/);
  });
});

describe("resolveSpecifier", () => {
  function indexOf(...files: string[]): FileIndex {
    const set = new Set(files);
    const byBasename = new Map<string, string[]>();
    for (const rel of [...files].sort()) {
      const base = rel.split("/").pop() ?? rel;
      const list = byBasename.get(base);
      if (list) list.push(rel);
      else byBasename.set(base, [rel]);
    }
    return { files: set, byBasename };
  }

  const index = indexOf(
    "src/parse.ts",
    "src/util.ts",
    "src/util2/index.ts",
    "src/util2/index.tsx",
    "app.py",
    "util.py",
    "pkg/util.py",
    "pkg/util/__init__.py",
    "pkg/sub/app.py",
    "other/standalone.go",
    "main.go",
    "util/util.go",
    "pkg/util.go",
    "lib.rs",
    "util.rs",
    "src/lib.rs",
    "src/util.rs",
    "src/deep/mod.rs",
    "Reporter.java",
    "Util.java",
    "src/com/example/Util.java",
    "reporter.c",
    "util.h",
    "include/util.h",
    "main.swift",
  );

  it("resolves TypeScript relative specifiers and rejects bare ones", () => {
    expect(resolveSpecifier("typescript", "src/parse.ts", "./util.js", index)).toBe("src/util.ts");
    expect(resolveSpecifier("typescript", "src/parse.ts", "./util2", index)).toBe("src/util2/index.ts");
    expect(resolveSpecifier("typescript", "src/parse.ts", "pkg", index)).toBeNull();
    expect(resolveSpecifier("typescript", "src/parse.ts", "./gone", index)).toBeNull();
  });

  it("resolves Python relative and absolute imports with a basename fallback", () => {
    expect(resolveSpecifier("python", "app.py", ".util", index)).toBe("util.py");
    expect(resolveSpecifier("python", "pkg/sub/app.py", "..util", index)).toBe("pkg/util.py");
    expect(resolveSpecifier("python", "pkg/sub/app.py", "...util", index)).toBe("util.py");
    expect(resolveSpecifier("python", "app.py", "pkg.util", index)).toBe("pkg/util.py");
    expect(resolveSpecifier("python", "app.py", "other.util", index)).toBe("pkg/util.py");
    expect(resolveSpecifier("python", "app.py", "pkg.util.utility", index)).toBeNull();
  });

  it("resolves Go package specifiers by directory segment and falls back to basenames", () => {
    expect(resolveSpecifier("go", "main.go", "example.com/mod/util", index)).toBe("util/util.go");
    expect(resolveSpecifier("go", "main.go", "/", index)).toBeNull();
    expect(resolveSpecifier("go", "main.go", "", index)).toBeNull();
    expect(resolveSpecifier("go", "main.go", "example.com/standalone", index)).toBe("other/standalone.go");
    expect(resolveSpecifier("go", "main.go", "example.com/none", index)).toBeNull();
  });

  it("resolves Rust crate, self, and super paths", () => {
    expect(resolveSpecifier("rust", "lib.rs", "crate::util", index)).toBe("util.rs");
    expect(resolveSpecifier("rust", "src/deep/mod.rs", "crate::util", index)).toBe("src/util.rs");
    expect(resolveSpecifier("rust", "src/main.rs", "self::util", index)).toBe("src/util.rs");
    expect(resolveSpecifier("rust", "src/deep/mod.rs", "super::util", index)).toBe("src/util.rs");
    expect(resolveSpecifier("rust", "lib.rs", "std::x", index)).toBeNull();
    expect(resolveSpecifier("rust", "lib.rs", "crate", index)).toBeNull();
    expect(resolveSpecifier("rust", "lib.rs", "crate::gone", index)).toBeNull();
  });

  it("resolves Java classes by basename and rejects wildcard imports", () => {
    expect(resolveSpecifier("java", "Reporter.java", "com.example.Util", index)).toBe("Util.java");
    expect(resolveSpecifier("java", "Reporter.java", "com.example.*", index)).toBeNull();
    expect(resolveSpecifier("java", "Reporter.java", "", index)).toBeNull();
  });

  it("resolves C includes, skips system headers, and falls back to basenames", () => {
    expect(resolveSpecifier("c", "reporter.c", "util.h", index)).toBe("util.h");
    expect(resolveSpecifier("c", "src/reporter.c", "include/util.h", index)).toBe("include/util.h");
    expect(resolveSpecifier("c", "reporter.c", "<stdio.h>", index)).toBeNull();
    expect(resolveSpecifier("c", "reporter.c", "missing.h", index)).toBeNull();
  });

  it("returns null for unsupported languages", () => {
    expect(resolveSpecifier("swift", "main.swift", "./x", index)).toBeNull();
    expect(resolveSpecifier("kotlin" as LanguageId, "x.kt", "./x", index)).toBeNull();
  });
});
