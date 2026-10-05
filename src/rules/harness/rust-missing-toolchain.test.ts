// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("compileRust without a rust toolchain", () => {
  it("skips cleanly when rustc is not on PATH", async () => {
    const emptyPath = await mkdtemp(join(tmpdir(), "rules-empty-path-"));
    const originalPath = process.env.PATH;
    process.env.PATH = emptyPath;
    vi.resetModules();
    try {
      const { compileRust } = await import("./rust.js");
      const result = await compileRust("pub fn noop() {}");
      expect(result.skipped).toBe(true);
      expect(result.ok).toBe(false);
      expect(result.compiler).toBe("skipped");
      expect(result.output).toContain("rustc");
    } finally {
      process.env.PATH = originalPath;
      vi.resetModules();
      await rm(emptyPath, { recursive: true, force: true });
    }
  }, 60_000);
});
