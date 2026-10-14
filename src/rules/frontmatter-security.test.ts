import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadPrincipleContent, loadRuleContent } from "./content.js";
import { loadRules } from "./loader.js";
import { loadPrinciples } from "./principles.js";
import { scanCatalogRules } from "./status.js";
import { validateFile } from "./validate.js";

const MARKER = "__superskillRulesMatterExecuted";
const globals = globalThis as unknown as Record<string, unknown>;

describe("data-only rules frontmatter", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "rules-frontmatter-"));
    await mkdir(join(root, "rust"));
    delete globals[MARKER];
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    delete globals[MARKER];
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  for (const engine of ["js", "javascript"]) {
    it.each(["loader", "rule-content", "validator", "status", "principles", "principle-content"] as const)(
      `rejects ${engine} metadata without executing its marker in %s`, async (surface) => {
        const metadata = {
          id: surface.startsWith("principle") ? "principle-marker" : "rust-err-marker",
          lang: "rust", prefix: "err", title: "Marker rule", severity: "must", enforce: "review",
          status: "verified", baseline: "latest", apply_when: "Apply when testing.", triggers: { keywords: ["marker"] },
          sources: [{ title: "Reference", url: "https://example.com/reference" }],
        };
        const raw = `---${engine}\n(globalThis.${MARKER} = true, ${JSON.stringify(metadata)})\n---\n> Marker body.\n`;
        const file = join(root, surface.startsWith("principle") ? "marker.md" : "rust/err-marker.md");
        await writeFile(file, raw);

        if (surface === "loader") {
          const result = await loadRules(root);
          expect(globals[MARKER]).toBeUndefined();
          expect(result.rules).toEqual([]);
          expect(result.warnings).toContainEqual(expect.objectContaining({ message: expect.stringContaining("frontmatter") }));
        } else if (surface === "rule-content") {
          const result = await loadRuleContent(["rust-err-marker"], root);
          expect(globals[MARKER]).toBeUndefined();
          expect(result.size).toBe(0);
        } else if (surface === "validator") {
          const result = await validateFile(file, { compile: false });
          expect(globals[MARKER]).toBeUndefined();
          expect(result.rule).toBeNull();
          expect(result.issues).toContainEqual(expect.objectContaining({ code: "fm-parse", severity: "error" }));
          expect(result.compile).toEqual([]);
        } else if (surface === "status") {
          const result = await scanCatalogRules(root, ["rust"]);
          expect(globals[MARKER]).toBeUndefined();
          expect(result).toEqual([{ lang: "rust", file: "err-marker.md", prefix: "err", status: "unknown" }]);
        } else if (surface === "principles") {
          const result = await loadPrinciples(root);
          expect(globals[MARKER]).toBeUndefined();
          expect(result.principles).toEqual([]);
          expect(result.warnings).toContainEqual(expect.objectContaining({ message: expect.stringContaining("frontmatter") }));
        } else {
          const result = await loadPrincipleContent(["principle-marker"], root);
          expect(globals[MARKER]).toBeUndefined();
          expect(result.size).toBe(0);
        }
      },
    );
  }
});
