// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { goProvider } from "./go.js";
import type { EnvVar, ProviderContext } from "./types.js";

function makeCtx(tmp: string): ProviderContext {
  return {
    projectRoot: join(tmp, "project"),
    worktreeRoot: join(tmp, "worktree"),
    repoId: "test",
    cacheNamespace: join(tmp, "cache", "test"),
    worktreeKey: "wt",
    home: join(tmp, "home"),
    projectFiles: [],
  };
}

function toMap(vars: EnvVar[]): Map<string, EnvVar> {
  return new Map(vars.map((v) => [v.name, v]));
}

describe("goProvider", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "go-provider-"));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("uses go identity", () => {
    expect(goProvider.id).toBe("go");
    expect(goProvider.languages).toEqual(["go"]);
  });

  it("detects a go.mod at the project root", async () => {
    const ctx = makeCtx(tmp);
    expect(await goProvider.detect(ctx)).toBe(false);

    await mkdir(ctx.projectRoot, { recursive: true });
    expect(await goProvider.detect(ctx)).toBe(false);

    await writeFile(join(ctx.projectRoot, "go.mod"), "module example.com/test\n");
    expect(await goProvider.detect(ctx)).toBe(true);
  });

  it("redirects caches under the namespace and appends -trimpath", async () => {
    const ctx = makeCtx(tmp);
    const map = toMap(await goProvider.env(ctx));

    expect(map.size).toBe(3);
    expect(map.get("GOCACHE")?.value).toBe(join(ctx.cacheNamespace, "go-build"));
    expect(map.get("GOMODCACHE")?.value).toBe(join(ctx.cacheNamespace, "go-mod"));
    expect(map.get("GOFLAGS")?.value).toBe("-trimpath");
    expect(map.get("GOFLAGS")?.mode).toBe("append");
    expect(map.has("GOTMPDIR")).toBe(false);
  });

  it("lists go-build and go-mod as auto-safe cache dirs", async () => {
    const ctx = makeCtx(tmp);
    const dirs = await goProvider.cacheDirs(ctx);

    expect(dirs).toEqual([
      {
        id: "go-build",
        path: join(ctx.cacheNamespace, "go-build"),
        tool: "go",
        description: "Go build cache shared across worktrees",
        autoSafe: true,
      },
      {
        id: "go-mod",
        path: join(ctx.cacheNamespace, "go-mod"),
        tool: "go",
        description: "Go module download cache shared across worktrees",
        autoSafe: true,
      },
    ]);
  });

  it("has nothing to seed", async () => {
    expect(await goProvider.seed(makeCtx(tmp))).toEqual([]);
  });

  it("prunes via go clean -cache", async () => {
    expect(await goProvider.prune(makeCtx(tmp))).toEqual({
      tool: "go",
      command: "go",
      args: ["clean", "-cache"],
      description: "Trim Go build cache (tool-managed, self-trimming)",
      autoSafe: true,
      minAgeDays: 0,
    });
  });

  it("reports cache sharing notes", async () => {
    expect(await goProvider.notes(makeCtx(tmp))).toEqual([
      "Default GOCACHE/GOMODCACHE are already shared per user; isolated HOME (containers/agents) is the duplication vector.",
      "GOFLAGS=-trimpath is appended, never replaced.",
    ]);
  });
});
