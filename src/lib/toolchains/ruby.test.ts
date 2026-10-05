// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ProviderContext } from "./types.js";
import { rubyProvider } from "./ruby.js";

let root: string;
let ctx: ProviderContext;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ruby-provider-"));
  const home = join(root, "home");
  const cacheNamespace = join(root, "cache", "repo-abc");
  const projectRoot = join(root, "project");
  await mkdir(home, { recursive: true });
  await mkdir(projectRoot, { recursive: true });
  ctx = {
    projectRoot,
    worktreeRoot: projectRoot,
    repoId: "repo-abc",
    cacheNamespace,
    worktreeKey: "wt-1",
    home,
    projectFiles: [],
  };
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("rubyProvider", () => {
  it("exposes id and languages", () => {
    expect(rubyProvider.id).toBe("ruby");
    expect(rubyProvider.languages).toEqual(["ruby"]);
  });

  it("detects a Gemfile at the project root", async () => {
    expect(await rubyProvider.detect(ctx)).toBe(false);
    await writeFile(join(ctx.projectRoot, "Gemfile"), "source 'https://rubygems.org'\n");
    expect(await rubyProvider.detect(ctx)).toBe(true);
  });

  it("redirects BUNDLE_USER_CACHE into the cache namespace", async () => {
    const env = await rubyProvider.env(ctx);
    expect(env).toEqual([
      {
        name: "BUNDLE_USER_CACHE",
        value: join(ctx.cacheNamespace, "bundle-cache"),
      },
    ]);
    expect(env.map((entry) => entry.name)).not.toContain("BUNDLE_PATH");
    expect(env.map((entry) => entry.name)).not.toContain("GEM_HOME");
  });

  it("reports the bundle cache dir", async () => {
    expect(await rubyProvider.cacheDirs(ctx)).toEqual([
      {
        id: "ruby-bundle-cache",
        path: join(ctx.cacheNamespace, "bundle-cache"),
        tool: "bundler",
        description: "Bundler download/build cache shared across worktrees",
        autoSafe: true,
      },
    ]);
  });

  it("seeds nothing and prunes nothing", async () => {
    expect(await rubyProvider.seed(ctx)).toEqual([]);
    expect(await rubyProvider.prune(ctx)).toBeNull();
  });

  it("documents the shared-BUNDLE_PATH and bootsnap hazards", async () => {
    expect(await rubyProvider.notes(ctx)).toEqual([
      "System gems are already shared across worktrees; do not set a shared BUNDLE_PATH when lockfiles can diverge.",
      "bootsnap caches are path-keyed and safe per worktree; never share them.",
    ]);
  });
});
