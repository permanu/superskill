// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadRules } from "./loader.js";
import { loadPrinciples } from "./principles.js";

describe("default guidance consistency", () => {
  it("does not label unsourced production principles as verified", async () => {
    const result = await loadPrinciples();
    expect(result.warnings).toEqual([]);
    expect(result.principles.filter(p => p.status === "verified").every(p => p.sourcesCount > 0)).toBe(true);
  });

  it("quarantines unsourced or malformed source claims in a loaded principle", async () => {
    const root = await mkdtemp(join(tmpdir(), "principle-provenance-"));
    try {
      for (const sources of ["[]", '[{title: "Only a title"}]', '[{title: "Bad link", url: "not-a-url"}]']) {
        await writeFile(join(root, "example.md"), `---\nid: principle-example\ntitle: Example\napply_when: Apply when testing.\nstatus: verified\nenforce: review\ntriggers: { keywords: [testing] }\nsources: ${sources}\n---\n> Use evidence.\n`);
        const result = await loadPrinciples(root);
        expect(result.principles[0]?.status).toBe("draft");
        expect(result.warnings.some(warning => warning.message.includes("treated as draft"))).toBe(true);
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("keeps known raw-exception recommendations and blanket documentation demands out of verified examples", async () => {
    const { rules } = await loadRules();
    const unsafe = /logger\.exception|exc_info\s*=|\.what\(\)|getMessage\(\)|printStackTrace|console\.error\((?:err|error)|LOG\.log\([^\n]*, (?:e|ex|err)\)/;
    const conflicts = rules.filter(rule => rule.status === "verified" && (
      unsafe.test(rule.body.split("## Good")[1]?.split("## See Also")[0] ?? "")
      || /^> Give every exported symbol/m.test(rule.body)
      || /^> Write a documentation comment for every declaration\./m.test(rule.body)
      || /^> Give each member.*with a comment describing/m.test(rule.body)
    )).map(rule => rule.id);
    expect(conflicts).toEqual([]);
  });
});
