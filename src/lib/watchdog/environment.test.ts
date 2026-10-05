// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { dirSizeBounded, detectEnvironment, scanLeakedTmpFiles } from "./environment.js";
import { detectPlugins, mcpServerOf } from "./plugins.js";
import type { SessionTrace, TraceToolCall } from "./types.js";

describe("environment probes", () => {
  let home: string;

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), "watchdog-env-"));
  });

  afterEach(async () => {
    await rm(home, { recursive: true, force: true });
  });

  it("detects leaked tmp files in the superskill home", async () => {
    const superHome = join(home, ".superskill");
    await mkdir(superHome, { recursive: true });
    await writeFile(join(superHome, "analytics.json.a1.tmp"), "x".repeat(100), "utf-8");
    await writeFile(join(superHome, "analytics.json.b2.tmp"), "y".repeat(50), "utf-8");

    const scan = await scanLeakedTmpFiles(home);
    expect(scan.files).toHaveLength(2);
    expect(scan.totalBytes).toBe(150);

    const findings = await detectEnvironment({ home, checkHarnessStores: false });
    const leaked = findings.find((finding) => finding.title.includes("leaked"));
    expect(leaked).toBeDefined();
    expect(leaked!.proposal).toContain("leaked-tmp");
  });

  it("measures nested directory sizes with a bound", async () => {
    const dir = join(home, "tree");
    await mkdir(join(dir, "a", "b"), { recursive: true });
    await writeFile(join(dir, "a", "one.bin"), Buffer.alloc(1000));
    await writeFile(join(dir, "a", "b", "two.bin"), Buffer.alloc(2000));
    const { bytes, truncated } = await dirSizeBounded(dir);
    expect(bytes).toBe(3000);
    expect(truncated).toBe(false);
  });
});

describe("plugin signals", () => {
  it("parses mcp tool names", () => {
    expect(mcpServerOf("mcp__context7__query-docs")).toBe("context7");
    expect(mcpServerOf("mcp__superskill__read")).toBeNull();
    expect(mcpServerOf("superskill_read")).toBeNull();
    expect(mcpServerOf("bash")).toBeNull();
  });

  it("flags erroring MCP servers across a window", async () => {
    const oldHome = process.env.HOME;
    const fakeHome = await mkdtemp(join(tmpdir(), "watchdog-home-"));
    process.env.HOME = fakeHome;
    try {
      const call = (index: number): TraceToolCall => ({ index, name: "mcp__flaky__do", status: "error", errorText: "boom" });
      const traces: SessionTrace[] = Array.from({ length: 5 }, (_, i) => ({
        ref: { tool: "claude-code", id: `s${i}`, startedAt: 0, updatedAt: 1, storagePath: "/tmp/x" },
        userTurns: [],
        toolCalls: [call(i * 2), call(i * 2 + 1)],
        filesRead: [],
        filesWritten: [],
        commands: [],
        truncated: false,
      }));
      const findings = await detectPlugins(traces);
      expect(findings.some((finding) => finding.title.includes("flaky"))).toBe(true);
    } finally {
      process.env.HOME = oldHome;
      await rm(fakeHome, { recursive: true, force: true });
    }
  });
});
