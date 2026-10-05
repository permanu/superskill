// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CONSTITUTION_PATH = fileURLToPath(new URL("../catalog/constitution.md", import.meta.url));
const text = readFileSync(CONSTITUTION_PATH, "utf-8");

describe("constitution", () => {
  it("stays within the always-injected token budget", () => {
    // Conservative estimate: BPE tokenizers average at least 3.5 chars/token on prose.
    expect(Math.ceil(text.length / 3.5)).toBeLessThanOrEqual(400);
  });

  it("declares 10-15 axioms with stable unique IDs", () => {
    const ids = [...text.matchAll(/^- (P-\d{2}) /gm)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThanOrEqual(10);
    expect(ids.length).toBeLessThanOrEqual(15);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(ids.map((_, index) => `P-${String(index + 1).padStart(2, "0")}`));
  });

  it("names an enforcing mechanism for every axiom", () => {
    const items = text.split("\n").filter((line) => /^- P-\d{2} /.test(line));
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item).toMatch(/\((?:gate check|validator|security scanner|router|loader|CI|review)[^)]*\)$/);
    }
  });

  it("carries no version numbers or hedging", () => {
    expect(text).not.toMatch(/\bv?\d+\.\d+\b/);
    expect(text).not.toMatch(/\b(consider|might|often|maybe|probably|perhaps|should)\b/i);
  });
});
