// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyValidationExitGates } from "./cli.js";
import { validateAll, validatePack } from "./validate.js";

async function writePackMetadata(pack: string, ruleCount: number, verified = 0): Promise<void> {
  await writeFile(join(pack, "sources.md"), "# Sources\n\nBaseline: latest\n");
  await writeFile(join(pack, "categories.md"), "| prefix | title | target | primary sources |\n|---|---|---|---|\n| err | Errors | 1 | 1 |\n");
  await writeFile(join(pack, "INDEX.md"), [
    "# Rust Rules Index",
    "",
    "Baseline: latest",
    `Rules: ${ruleCount} (verified: ${verified})`,
    "",
    ...(ruleCount === 0 ? [] : ["- [Rule](err-rule.md)"]),
    "",
  ].join("\n"));
}

function validRule(): string {
  return [
    "---",
    "id: rust-err-rule",
    "lang: rust",
    "prefix: err",
    "title: Rule fixture",
    "severity: must",
    "enforce: review",
    "baseline: latest",
    "status: draft",
    "sources:",
    "  - title: Example source",
    "    url: https://example.com/spec",
    "---",
    "",
    "> Use the rule under test.",
    "",
    "## Why",
    "",
    "Use an explicit result for failure.",
    "",
    "## Bad",
    "",
    "```rust",
    "fn load() -> String { String::new() }",
    "```",
    "",
    "## Good",
    "",
    "```rust",
    "fn load() -> Result<String, Error> { Ok(String::new()) }",
    "```",
    "",
  ].join("\n");
}

describe("required rule validation gates", () => {
  it("keeps absent roots and packs optional for library discovery, but errors when required", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rules-gate-missing-"));
    try {
      const root = join(dir, "missing-root");
      const optionalRoot = await validateAll(root, { compile: false });
      expect(optionalRoot.errors).toEqual([]);
      expect(optionalRoot.warnings.map((entry) => entry.code)).toContain("root-missing");
      expect(applyValidationExitGates(optionalRoot).errors).toContainEqual(expect.objectContaining({
        code: "no-rules-checked",
        severity: "error",
        path: root,
        message: expect.stringContaining("verify the requested rules root or pack"),
      }));

      const requiredRoot = await validateAll(root, { compile: false, requireNonEmpty: true });
      expect(requiredRoot.errors).toContainEqual(expect.objectContaining({
        code: "root-missing",
        severity: "error",
        message: expect.stringContaining("requested rules root not found"),
      }));

      const missingPack = join(dir, "missing-lang");
      const optionalPack = await validatePack(missingPack, { compile: false });
      expect(optionalPack.errors).toEqual([]);
      expect(optionalPack.warnings.map((entry) => entry.code)).toContain("pack-missing");

      const requiredPack = await validatePack(missingPack, { compile: false, requireNonEmpty: true });
      expect(requiredPack.errors).toContainEqual(expect.objectContaining({
        code: "pack-missing",
        severity: "error",
        message: expect.stringContaining("requested rules pack not found"),
      }));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects an existing but empty requested pack", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rules-gate-empty-"));
    const pack = join(dir, "rust");
    await mkdir(pack);
    try {
      await writePackMetadata(pack, 0);
      const report = await validatePack(pack, { compile: false, requireNonEmpty: true });
      expect(report.ruleCount).toBe(0);
      expect(report.checkedCount).toBe(0);
      expect(report.errors).toContainEqual(expect.objectContaining({ code: "no-rules-checked", severity: "error" }));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports zero checked rules when every discovered node is invalid", async () => {
    const root = await mkdtemp(join(tmpdir(), "rules-gate-invalid-"));
    const pack = join(root, "rust");
    await mkdir(pack);
    try {
      await writePackMetadata(pack, 1);
      await writeFile(join(pack, "err-rule.md"), "not a rule\n");
      const report = await validateAll(root, { compile: false, requireNonEmpty: true });
      expect(report.ruleCount).toBe(1);
      expect(report.checkedCount).toBe(0);
      expect(report.errors.map((entry) => entry.code)).toContain("fm-missing");
      expect(report.errors.map((entry) => entry.code)).toContain("no-rules-checked");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("accepts a valid partial catalog without requiring all language packs", async () => {
    const root = await mkdtemp(join(tmpdir(), "rules-gate-partial-"));
    const pack = join(root, "rust");
    await mkdir(pack);
    try {
      await writePackMetadata(pack, 1);
      await writeFile(join(pack, "err-rule.md"), validRule());
      const report = await validateAll(root, { compile: false, requireNonEmpty: true });
      expect(report.errors).toEqual([]);
      expect(report.ruleCount).toBe(1);
      expect(report.checkedCount).toBe(1);
      expect(applyValidationExitGates(report).errors).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("makes strict compiler skips actionable without treating explicit exemptions as skips", () => {
    const exempt = {
      errors: [],
      warnings: [{ code: "compile-exempt", message: "demonstration exemption", path: "rust/err-rule.md", severity: "warning" as const }],
      ruleCount: 1,
      checkedCount: 1,
    };
    expect(applyValidationExitGates(exempt, { strict: true }).errors).toEqual([]);

    const skipped = {
      ...exempt,
      warnings: [{ code: "compile-skipped", message: "compiler unavailable", path: "rust/err-rule.md", severity: "warning" as const }],
    };
    expect(applyValidationExitGates(skipped, { strict: true }).errors).toContainEqual(expect.objectContaining({
      code: "compile-skipped-strict",
      severity: "error",
      path: "rust/err-rule.md",
      message: expect.stringContaining("install the toolchain"),
    }));
  });
});
