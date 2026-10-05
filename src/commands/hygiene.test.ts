// SPDX-License-Identifier: Apache-2.0
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { CommandContext } from "../core/types.js";
import type { HygieneProbe } from "../lib/hygiene/types.js";
import { collectRepoPaths, hygieneCommand, selectHygieneProbes } from "./hygiene.js";

const temps: string[] = [];

async function makeTemp(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "hygiene-cmd-test-"));
  temps.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(temps.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function fakeCtx(vaultPath: string): CommandContext {
  return {
    vaultPath,
    log: { debug() {}, info() {}, warn() {}, error() {} },
  } as unknown as CommandContext;
}

describe("collectRepoPaths", () => {
  it("collects existing repo directories from project-map.json", async () => {
    const vault = await makeTemp();
    const repo = await makeTemp();
    const notADir = join(vault, "file.txt");
    await writeFile(notADir, "x", "utf-8");
    await writeFile(
      join(vault, "project-map.json"),
      JSON.stringify({ [repo]: "alpha", [join(vault, "missing")]: "ghost", [notADir]: "file" }),
      "utf-8",
    );
    expect(await collectRepoPaths(vault)).toEqual([repo]);
  });

  it("returns [] for missing or corrupt project-map.json", async () => {
    const vault = await makeTemp();
    expect(await collectRepoPaths(vault)).toEqual([]);
    await writeFile(join(vault, "project-map.json"), "{oops", "utf-8");
    expect(await collectRepoPaths(vault)).toEqual([]);
  });

  it("caps discovery at the limit", async () => {
    const vault = await makeTemp();
    const repos = [await makeTemp(), await makeTemp(), await makeTemp()];
    await writeFile(
      join(vault, "project-map.json"),
      JSON.stringify(Object.fromEntries(repos.map((repo, index) => [repo, `p${index}`]))),
      "utf-8",
    );
    expect(await collectRepoPaths(vault, 2)).toHaveLength(2);
  });
});

describe("selectHygieneProbes", () => {
  it("returns all probes by default", () => {
    expect(selectHygieneProbes().map((probe) => probe.id)).toEqual([
      "caches",
      "docker",
      "xcode",
      "scratch",
      "worktrees",
    ]);
  });

  it("filters by category and rejects unknown names", () => {
    expect(selectHygieneProbes(["docker", "caches"]).map((probe) => probe.id)).toEqual(["caches", "docker"]);
    expect(() => selectHygieneProbes(["moon"])).toThrow(/Unknown hygiene category/);
  });
});

describe("hygieneCommand", () => {
  it("builds a report through injected probes and repo paths", async () => {
    const probe: HygieneProbe = {
      id: "caches",
      run: async () => ({ category: "caches", label: "Fake", items: [], skipped: null }),
    };
    const report = await hygieneCommand(
      { probes: [probe], repoPaths: ["/tmp/example-repo"], sizes: false },
      fakeCtx("/nonexistent-vault"),
    );
    expect(report.repoPaths).toEqual(["/tmp/example-repo"]);
    expect(report.items).toEqual([]);
    expect(report.totals.itemCount).toBe(0);
    expect(report.totals.byCategory.docker.itemCount).toBe(0);
  });
});
