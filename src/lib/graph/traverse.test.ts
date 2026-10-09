// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VaultFS } from "../vault-fs.js";
import { DEFAULT_OPEN_BYTES, openTraverser, traverseTokensForBytes } from "./traverse.js";

const SENTINEL = "BORROW BODY SENTINEL";

function ruleFile(data: Record<string, unknown>, body: string): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(data)) {
    lines.push(`${key}: ${Array.isArray(value) || (value !== null && typeof value === "object") ? JSON.stringify(value) : value}`);
  }
  lines.push("---", "", body);
  return lines.join("\n");
}

interface Fixture {
  repo: string;
  vault: string;
  rulesDir: string;
  catalogDir: string;
  longRule: string;
  cleanup: () => void;
}

function createFixture(): Fixture {
  const repo = mkdtempSync(join(tmpdir(), "traverse-repo-"));
  const vault = mkdtempSync(join(tmpdir(), "traverse-vault-"));
  const catalogDir = join(repo, "catalog");
  const rulesDir = join(catalogDir, "rules");
  const rustRules = join(rulesDir, "rust");
  const pythonRules = join(rulesDir, "python");

  mkdirSync(join(repo, ".superskill"), { recursive: true });
  mkdirSync(rustRules, { recursive: true });
  mkdirSync(pythonRules, { recursive: true });
  mkdirSync(join(catalogDir, "code"), { recursive: true });
  mkdirSync(join(catalogDir, "review"), { recursive: true });
  mkdirSync(join(catalogDir, "memory"), { recursive: true });
  mkdirSync(join(repo, "src", "lib"), { recursive: true });

  writeFileSync(join(catalogDir, "code", "rust.md"), "---\nname: rust\n---\n# Rust\n");
  writeFileSync(join(catalogDir, "review", "always.md"), "---\nname: always\n---\n# Always review\n");
  writeFileSync(join(catalogDir, "memory", "remember.md"), "---\nname: remember\n---\n# Remember\n");

  writeFileSync(
    join(rustRules, "own-borrow-over-clone.md"),
    ruleFile(
      {
        id: "rust-own-borrow-over-clone",
        lang: "rust",
        prefix: "own",
        title: "Borrow over clone",
        severity: "must",
        enforce: "review",
        status: "verified",
        triggers: { keywords: ["ownership", "borrow", "clone"], files: ["**/*.rs"], symbols: [] },
        related: ["rust-conv-defer-close"],
      },
      `> ${SENTINEL}\n\nUse references instead of cloning.\n`,
    ),
  );
  writeFileSync(
    join(rustRules, "conv-defer-close.md"),
    ruleFile(
      {
        id: "rust-conv-defer-close",
        lang: "rust",
        prefix: "conv",
        title: "Defer close",
        severity: "should",
        enforce: "review",
        status: "verified",
        triggers: { keywords: ["defer", "close"], files: ["**/*.rs"], symbols: [] },
        related: [],
      },
      "> Clean up resources.\n",
    ),
  );
  const longRule = join(rustRules, "long-body.md");
  writeFileSync(
    longRule,
    ruleFile(
      {
        id: "rust-long-body",
        lang: "rust",
        prefix: "long",
        title: "Long rule",
        severity: "prefer",
        enforce: "review",
        status: "verified",
        triggers: { keywords: ["longbody"], files: [], symbols: [] },
        related: [],
      },
      `> start\n${"x".repeat(6000)}\n> end\n`,
    ),
  );
  writeFileSync(
    join(pythonRules, "style-pep8.md"),
    ruleFile(
      {
        id: "python-style-pep8",
        lang: "python",
        prefix: "style",
        title: "PEP 8",
        severity: "should",
        enforce: "review",
        status: "verified",
        triggers: { keywords: ["pep", "style"], files: ["**/*.py"], symbols: [] },
        related: [],
      },
      "> Style rules.\n",
    ),
  );

  const graph = {
    version: 3,
    nodes: [
      {
        type: "skill",
        id: "code/rust",
        source: "catalog",
        audits: { gen: "pass", socket: "pass", snyk: "pass" },
        installs: 0,
        stars: 0,
        w: 0.8,
        ts: 1,
        pack: "code",
        langs: ["rust"],
        triggers: ["rust", "borrow", "ownership", "cargo"],
        always: false,
        path: "code/rust.md",
      },
      {
        type: "skill",
        id: "memory/remember",
        source: "catalog",
        audits: { gen: "pass", socket: "pass", snyk: "pass" },
        installs: 0,
        stars: 0,
        w: 0.6,
        ts: 1,
        pack: "memory",
        langs: [],
        triggers: ["memory"],
        always: true,
        path: "memory/remember.md",
      },
      { type: "project", id: "project", stack: ["rust"], tools: [], phase: "implement", ts: 1 },
    ],
    edges: [
      { type: "project_skill", from: "project", to: "code/rust", w: 0.7, activations: 2 },
      { type: "skill_skill", from: "code/rust", to: "memory/remember", w: 0.4, co_activations: 1 },
    ],
  };
  writeFileSync(join(repo, ".superskill", "graph.json"), JSON.stringify(graph));

  writeFileSync(join(repo, "src", "a.ts"), 'import { b } from "./lib/b.js";\nexport const a = b;\n');
  writeFileSync(join(repo, "src", "lib", "b.ts"), "export const b = 1;\n");

  mkdirSync(join(vault, "projects", "testproj", "notes"), { recursive: true });
  writeFileSync(
    join(vault, "projects", "testproj", "context.md"),
    "---\ntype: context\n---\n# Context\n\nRust ownership notes.\n",
  );
  writeFileSync(
    join(vault, "projects", "testproj", "notes", "alpha.md"),
    "---\ntype: note\n---\n# Alpha\n\nSee [[context]].\n",
  );

  return {
    repo,
    vault,
    rulesDir,
    catalogDir,
    longRule,
    cleanup: () => {
      rmSync(repo, { recursive: true, force: true });
      rmSync(vault, { recursive: true, force: true });
    },
  };
}

describe("traverse index", () => {
  let fx: Fixture;

  beforeEach(() => {
    fx = createFixture();
  });

  afterEach(() => {
    fx.cleanup();
  });

  function opts() {
    return { root: fx.repo, rulesDir: fx.rulesDir, catalogDir: fx.catalogDir };
  }

  it("caps UTF-8 content on complete character boundaries", async () => {
    writeFileSync(join(fx.repo, "src/unicode.ts"), "// " + "界😀".repeat(2000));
    const traverser = await openTraverser({ root: fx.repo, catalogDir: fx.catalogDir, rulesDir: fx.rulesDir });
    const opened = await traverser.open("code:src/unicode.ts");
    expect(Buffer.byteLength(opened.content, "utf8")).toBeLessThanOrEqual(DEFAULT_OPEN_BYTES);
    expect(opened.content).not.toContain("�");
    expect(opened.truncated).toBe(true);
  });

  it("indexes rules from frontmatter with id/lang/prefix/related/bytes", async () => {
    const traverser = await openTraverser(opts());
    const node = traverser.node("rule:rust-own-borrow-over-clone");
    expect(node).not.toBeNull();
    expect(node!.kind).toBe("rule");
    expect(node!.meta).toMatchObject({
      lang: "rust",
      prefix: "own",
      severity: "must",
      enforce: "review",
      status: "verified",
    });
    expect(node!.meta!.related as string[]).toContain("rust-conv-defer-close");
    const bytes = statSync(join(fx.rulesDir, "rust", "own-borrow-over-clone.md")).size;
    expect(node!.bytes).toBe(bytes);
    expect(node!.tokens).toBe(traverseTokensForBytes(bytes));
    expect(node!.path).toBe("rust/own-borrow-over-clone.md");
  });

  it("exposes lazy container children with counts and never content", async () => {
    const traverser = await openTraverser(opts());
    const root = traverser.children("graph");
    const rootIds = root.children.map((child) => child.id);
    expect(rootIds).toContain("rules");
    expect(rootIds).toContain("skills");
    expect(rootIds).toContain("code");

    const rust = traverser.children("rules:rust");
    expect(rust.total).toBe(3);
    expect(rust.children.every((child) => child.kind === "container")).toBe(true);
    const own = traverser.children("rules:rust/own");
    expect(own.total).toBe(1);
    expect(own.children[0].id).toBe("rule:rust-own-borrow-over-clone");
    expect(JSON.stringify(own)).not.toContain(SENTINEL);

    const limited = traverser.children("graph", { limit: 2 });
    expect(limited.children).toHaveLength(2);
    expect(limited.total).toBe(root.total);

    const rules = traverser.node("rules");
    expect(rules!.childrenCount).toBe(2);
    expect(rules!.bytes).toBeGreaterThan(0);
    expect(rules!.bytes).toBe(
      ["rust/own-borrow-over-clone.md", "rust/conv-defer-close.md", "rust/long-body.md", "python/style-pep8.md"]
        .map((rel) => statSync(join(fx.rulesDir, rel)).size)
        .reduce((sum, size) => sum + size, 0),
    );

    const skills = traverser.children("skills:code");
    expect(skills.children.map((child) => child.id)).toEqual(["skill:code/rust"]);
    const skill = traverser.node("skill:code/rust");
    expect(skill!.bytes).toBe(statSync(join(fx.catalogDir, "code", "rust.md")).size);
  });

  it("resolves a task to skills and rules with token estimates and no content", async () => {
    const traverser = await openTraverser(opts());
    const result = traverser.resolve("fix a rust ownership bug");
    const ids = result.items.map((item) => item.id);
    expect(ids).toContain("rule:rust-own-borrow-over-clone");
    expect(ids).not.toContain("rule:python-style-pep8");
    expect(ids).toContain("skill:code/rust");
    expect(ids).toContain("skill:memory/remember");

    const rule = result.items.find((item) => item.id === "rule:rust-own-borrow-over-clone")!;
    expect(rule.kind).toBe("rule");
    expect(rule.reason).toMatch(/keyword/);
    expect(rule.reason).toMatch(/ownership/);
    expect(rule.tokens).toBe(Math.ceil(rule.bytes / 4));
    expect(result.totals.items).toBe(result.items.length);
    expect(result.totals.tokens).toBeGreaterThan(0);
    expect(result.packs.length).toBeGreaterThan(0);
    expect(result.truncated).toBe(false);
    expect(JSON.stringify(result)).not.toContain(SENTINEL);
  });

  it("links skills, rules, and project edges from graph.json and frontmatter", async () => {
    const traverser = await openTraverser(opts());
    const skill = traverser.node("skill:code/rust")!;
    expect(skill.edge_counts.out).toBeGreaterThanOrEqual(1);
    const rule = traverser.node("rule:rust-own-borrow-over-clone")!;
    expect(rule.edge_counts.in).toBeGreaterThanOrEqual(1);
    expect(rule.edge_counts.out).toBe(1);
    expect(rule.meta!.linked_skills).toBeGreaterThanOrEqual(1);
    const root = traverser.node("graph")!;
    expect(root.edge_counts.out).toBeGreaterThanOrEqual(1);
    const memory = traverser.node("skill:memory/remember")!;
    expect(memory.edge_counts.in).toBeGreaterThanOrEqual(1);
  });

  it("opens vault notes through VaultFS", async () => {
    const vaultFs = new VaultFS(fx.vault, { projectSlug: "testproj" });
    const traverser = await openTraverser({ ...opts(), vaultPath: fx.vault, projectSlug: "testproj", vaultFs });
    const node = traverser.node("vault:projects/testproj/notes/alpha.md");
    expect(node).not.toBeNull();
    expect(node!.bytes).toBe(statSync(join(fx.vault, "projects/testproj/notes/alpha.md")).size);
    const content = await traverser.open("vault:projects/testproj/notes/alpha.md");
    expect(content.kind).toBe("vault");
    expect(content.content).toContain("# Alpha");
    expect(traverser.children("vault:projects/testproj").total).toBe(2);
  });

  it("caps open content at the default and returns full on request", async () => {
    const traverser = await openTraverser(opts());
    const bytes = statSync(fx.longRule).size;
    const capped = await traverser.open("rule:rust-long-body");
    expect(capped.truncated).toBe(true);
    expect(capped.bytes).toBe(bytes);
    expect(capped.content).toHaveLength(DEFAULT_OPEN_BYTES);
    expect(capped.content).not.toContain("> end");

    const full = await traverser.open("rule:rust-long-body", { full: true });
    expect(full.truncated).toBe(false);
    expect(full.content).toContain("> end");
    expect(full.content.length).toBe(full.bytes);

    await expect(traverser.open("rules")).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
    await expect(traverser.open("rule:nope")).rejects.toMatchObject({ code: "FILE_NOT_FOUND" });
  });

  it("indexes src code with import edges and directories", async () => {
    const traverser = await openTraverser(opts());
    const node = traverser.node("code:src/a.ts");
    expect(node).not.toBeNull();
    expect(node!.bytes).toBe(statSync(join(fx.repo, "src", "a.ts")).size);
    expect(node!.edge_counts.out).toBe(1);
    const srcChildren = traverser.children("code:src");
    const ids = srcChildren.children.map((child) => child.id);
    expect(ids).toContain("code:src/lib/");
    expect(ids).toContain("code:src/a.ts");
  });

  it("resolves code symbols and paths as bounded metadata before opening source", async () => {
    const source = "def authorize_payment():\n    return True\n" + "# unrelated implementation details\n".repeat(1000);
    writeFileSync(join(fx.repo, "payments.py"), source);
    const traverser = await openTraverser(opts());
    const result = traverser.resolve("fix authorize_payment", { limit: 1 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].kind).toBe("code");
    expect(result.items[0].id).toMatch(/^symbol:/);
    expect(JSON.stringify(result)).not.toContain("return True");
    const opened = await traverser.open(result.items[0].id);
    expect(opened.content).toContain("return True");
    expect(opened.bytes).toBeLessThan(Buffer.byteLength(source));
    expect(traverser.resolve("payments.py", { limit: 1 }).items[0].id).toBe("code:payments.py");
    expect(traverser.resolve("zxqv_unmatched").items.filter(item => item.kind === "code")).toEqual([]);
  });

  it("rejects cached code paths replaced by external symlinks", async () => {
    const path = join(fx.repo, "src", "safe.ts");
    writeFileSync(path, "export const safe = 1;");
    const traverser = await openTraverser(opts());
    const secret = join(fx.vault, "secret.ts");
    writeFileSync(secret, "private");
    unlinkSync(path);
    symlinkSync(secret, path);
    await expect(traverser.open("code:src/safe.ts")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("discovers Python outside src and opens a symbol without unrelated file content", async () => {
    mkdirSync(join(fx.repo, "service"));
    writeFileSync(join(fx.repo, "service", "app.py"), "SECRET_SENTINEL = 1\n\ndef run():\n    return 42\n");
    const traverser = await openTraverser(opts());
    const file = traverser.node("code:service/app.py");
    expect(file).not.toBeNull();
    const symbols = traverser.children(file!.id);
    expect(JSON.stringify(symbols)).not.toContain("return 42");
    const run = symbols.children.find(node => node.label === "run")!;
    expect(run).toBeDefined();
    const opened = await traverser.open(run.id);
    expect(opened.content).toContain("return 42");
    expect(opened.content).not.toContain("SECRET_SENTINEL");
    expect(opened.tokens).toBeLessThan(file!.tokens);
    expect(traverser.node(file!.id)!.bytes).toBe(statSync(join(fx.repo, "service", "app.py")).size);
  });

  it("invalidates source metadata in scanned hidden directories", async () => {
    const directory = join(fx.repo, ".config");
    mkdirSync(directory);
    const path = join(directory, "tasks.py");
    writeFileSync(path, "def original():\n    return 1\n");
    const first = await openTraverser(opts());
    expect(first.children("code:.config/tasks.py").children.map(node => node.label)).toContain("original");
    writeFileSync(path, "def replacement():\n    return 2\n");
    const future = new Date(Date.now() + 2000);
    utimesSync(path, future, future);
    const refreshed = await openTraverser(opts());
    expect(refreshed.children("code:.config/tasks.py").children.map(node => node.label)).toContain("replacement");
    expect(refreshed.children("code:.config/tasks.py").children.map(node => node.label)).not.toContain("original");
  });

  it("invalidates code metadata when a non-src source file changes", async () => {
    writeFileSync(join(fx.repo, "app.py"), "def first():\n    return 1\n");
    await openTraverser(opts());
    writeFileSync(join(fx.repo, "app.py"), "def second():\n    return 2\n");
    const next = await openTraverser(opts());
    expect(next.children("code:app.py").children.map(node => node.label)).toContain("second");
  });

  it("caches at .superskill/traverse.json and rebuilds when a rule changes", async () => {
    const first = await openTraverser(opts());
    const cacheFile = join(fx.repo, ".superskill", "traverse.json");
    expect(existsSync(cacheFile)).toBe(true);
    const cached = JSON.parse(readFileSync(cacheFile, "utf8"));
    expect(cached.version).toBe(2);
    const fingerprint = cached.fingerprint;
    const builtAt = cached.builtAt;

    await openTraverser(opts());
    const reused = JSON.parse(readFileSync(cacheFile, "utf8"));
    expect(reused.builtAt).toBe(builtAt);

    const target = join(fx.rulesDir, "rust", "conv-defer-close.md");
    writeFileSync(
      target,
      ruleFile(
        {
          id: "rust-conv-defer-close",
          lang: "rust",
          prefix: "conv",
          title: "Defer close",
          severity: "should",
          enforce: "review",
          status: "verified",
          triggers: { keywords: ["defer", "cleanup-marker"], files: ["**/*.rs"], symbols: [] },
          related: [],
        },
        "> v2\n",
      ),
    );
    const future = new Date(Date.now() + 2000);
    utimesSync(target, future, future);

    const second = await openTraverser(opts());
    const node = second.node("rule:rust-conv-defer-close");
    expect((node!.meta!.triggers as { keywords: string[] }).keywords).toContain("cleanup-marker");
    expect(JSON.parse(readFileSync(cacheFile, "utf8")).fingerprint).not.toBe(fingerprint);
    expect(first.node("rule:rust-conv-defer-close")).not.toBeNull();
  });

  it("rebuilds corrupt cache and honors refresh", async () => {
    const cacheFile = join(fx.repo, ".superskill", "traverse.json");
    writeFileSync(cacheFile, "not json");
    const traverser = await openTraverser(opts());
    expect(traverser.node("rule:rust-own-borrow-over-clone")).not.toBeNull();
    expect(() => JSON.parse(readFileSync(cacheFile, "utf8"))).not.toThrow();

    const before = JSON.parse(readFileSync(cacheFile, "utf8")).builtAt;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5));
    await openTraverser({ ...opts(), refresh: true });
    expect(JSON.parse(readFileSync(cacheFile, "utf8")).builtAt).not.toBe(before);
  });
});
