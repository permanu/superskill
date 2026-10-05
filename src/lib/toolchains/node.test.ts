// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ProviderContext } from "./types.js";
import { nodeProvider } from "./node.js";

let root: string;
let ctx: ProviderContext;

async function writeLockfile(name: string): Promise<void> {
  await writeFile(join(ctx.projectRoot, name), "");
  ctx.projectFiles.push(name);
}

function ns(pm: string): string {
  return join(ctx.cacheNamespace, pm);
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "node-provider-"));
  const home = join(root, "home");
  const cacheNamespace = join(root, "cache", "repo-abc");
  const projectRoot = join(root, "project");
  const worktreeRoot = join(root, "worktrees", "wt-1");
  await mkdir(home, { recursive: true });
  await mkdir(projectRoot, { recursive: true });
  await mkdir(worktreeRoot, { recursive: true });
  ctx = {
    projectRoot,
    worktreeRoot,
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

describe("nodeProvider", () => {
  it("exposes id and languages", () => {
    expect(nodeProvider.id).toBe("node");
    expect(nodeProvider.languages).toEqual(["typescript"]);
  });

  it("detects a package.json at the project root", async () => {
    expect(await nodeProvider.detect(ctx)).toBe(false);
    await writeFile(join(ctx.projectRoot, "package.json"), "{}");
    expect(await nodeProvider.detect(ctx)).toBe(true);
  });

  it.each([
    ["pnpm-lock.yaml", "PNPM_CONFIG_STORE_DIR"],
    ["yarn.lock", "YARN_CACHE_FOLDER"],
    ["bun.lock", "BUN_INSTALL_CACHE_DIR"],
    ["bun.lockb", "BUN_INSTALL_CACHE_DIR"],
    ["package-lock.json", "npm_config_cache"],
  ])("maps %s to %s", async (lockfile, expectedEnvName) => {
    await writeLockfile(lockfile);
    const env = await nodeProvider.env(ctx);
    expect(env.map((entry) => entry.name)).toContain(expectedEnvName);
  });

  it("detects from projectFiles even when the lockfile is absent on disk", async () => {
    ctx.projectFiles.push("yarn.lock");
    const env = await nodeProvider.env(ctx);
    expect(env).toEqual([{ name: "YARN_CACHE_FOLDER", value: join(ns("yarn"), "yarn-cache") }]);
  });

  it("falls back to npm when no lockfile is present", async () => {
    const env = await nodeProvider.env(ctx);
    expect(env).toEqual([{ name: "npm_config_cache", value: join(ns("npm"), "npm-cache") }]);
  });

  it("resolves lockfile precedence pnpm > yarn > bun > npm", async () => {
    await writeLockfile("package-lock.json");
    await writeLockfile("bun.lock");
    await writeLockfile("yarn.lock");
    await writeLockfile("pnpm-lock.yaml");
    expect((await nodeProvider.env(ctx))[0].name).toBe("PNPM_CONFIG_STORE_DIR");

    await rm(join(ctx.projectRoot, "pnpm-lock.yaml"));
    ctx.projectFiles = ctx.projectFiles.filter((file) => file !== "pnpm-lock.yaml");
    expect((await nodeProvider.env(ctx))[0].name).toBe("YARN_CACHE_FOLDER");

    await rm(join(ctx.projectRoot, "yarn.lock"));
    ctx.projectFiles = ctx.projectFiles.filter((file) => file !== "yarn.lock");
    expect((await nodeProvider.env(ctx))[0].name).toBe("BUN_INSTALL_CACHE_DIR");

    await rm(join(ctx.projectRoot, "bun.lock"));
    ctx.projectFiles = ctx.projectFiles.filter((file) => file !== "bun.lock");
    expect((await nodeProvider.env(ctx))[0].name).toBe("npm_config_cache");
  });

  it("maps pnpm env to the per-PM namespace and uses clone linking", async () => {
    await writeLockfile("pnpm-lock.yaml");
    expect(await nodeProvider.env(ctx)).toEqual([
      { name: "PNPM_CONFIG_STORE_DIR", value: join(ns("pnpm"), "pnpm-store") },
      { name: "PNPM_CONFIG_PACKAGE_IMPORT_METHOD", value: "clone" },
    ]);
  });

  it("maps bun env to the per-PM namespace", async () => {
    await writeLockfile("bun.lock");
    expect(await nodeProvider.env(ctx)).toEqual([
      { name: "BUN_INSTALL_CACHE_DIR", value: join(ns("bun"), "bun-cache") },
    ]);
  });

  it("maps yarn env to the per-PM namespace", async () => {
    await writeLockfile("yarn.lock");
    expect(await nodeProvider.env(ctx)).toEqual([
      { name: "YARN_CACHE_FOLDER", value: join(ns("yarn"), "yarn-cache") },
    ]);
  });

  it("maps npm env to the per-PM namespace", async () => {
    await writeLockfile("package-lock.json");
    expect(await nodeProvider.env(ctx)).toEqual([
      { name: "npm_config_cache", value: join(ns("npm"), "npm-cache") },
    ]);
  });

  it("never points env at node_modules", async () => {
    for (const lockfile of ["pnpm-lock.yaml", "yarn.lock", "bun.lock", "package-lock.json"]) {
      ctx.projectFiles = [lockfile];
      const env = await nodeProvider.env(ctx);
      expect(env.every((entry) => !entry.value.includes("node_modules"))).toBe(true);
    }
  });

  it.each([
    ["pnpm-lock.yaml", "pnpm", join("pnpm", "pnpm-store"), "pnpm-store"],
    ["yarn.lock", "yarn", join("yarn", "yarn-cache"), "yarn-cache"],
    ["bun.lock", "bun", join("bun", "bun-cache"), "bun-cache"],
    ["package-lock.json", "npm", join("npm", "npm-cache"), "npm-cache"],
  ])("reports the %s store dir and the per-worktree node_modules", async (lockfile, tool, subpath, id) => {
    await writeLockfile(lockfile);
    expect(await nodeProvider.cacheDirs(ctx)).toEqual([
      {
        id,
        path: join(ctx.cacheNamespace, subpath),
        tool,
        description: expect.any(String),
        autoSafe: true,
      },
      {
        id: "node-modules",
        path: join(ctx.worktreeRoot, "node_modules"),
        tool: "node",
        description: "per-worktree dependency tree; seeded via reflink, never shared",
        autoSafe: false,
      },
    ]);
  });

  it("seeds node_modules from the project root via auto-reflink", async () => {
    expect(await nodeProvider.seed(ctx)).toEqual([
      {
        source: join(ctx.projectRoot, "node_modules"),
        dest: join(ctx.worktreeRoot, "node_modules"),
        kind: "dir",
        method: "auto-reflink",
        relative: "node_modules",
      },
    ]);
  });

  it("prunes the pnpm store only", async () => {
    await writeLockfile("pnpm-lock.yaml");
    expect(await nodeProvider.prune(ctx)).toEqual({
      tool: "pnpm",
      command: "pnpm",
      args: ["store", "prune"],
      description: "Remove unreferenced packages from pnpm store",
      autoSafe: true,
      minAgeDays: 0,
    });

    await rm(join(ctx.projectRoot, "pnpm-lock.yaml"));
    for (const lockfile of ["yarn.lock", "bun.lock", "package-lock.json"]) {
      ctx.projectFiles = [lockfile];
      expect(await nodeProvider.prune(ctx)).toBeNull();
    }
  });

  it("documents the symlink and Turbo/Nx hazards", async () => {
    expect(await nodeProvider.notes(ctx)).toEqual([
      "Never symlink node_modules across worktrees; always install per worktree from a shared content-addressable store.",
      "Turborepo and Nx caches are already shared across worktrees by default; do not override their cache dirs.",
    ]);
  });
});
