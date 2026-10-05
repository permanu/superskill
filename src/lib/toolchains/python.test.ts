// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ProviderContext } from "./types.js";
import { pythonProvider } from "./python.js";

let root: string;
let ctx: ProviderContext;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "python-provider-"));
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

describe("pythonProvider", () => {
  it("exposes id and languages", () => {
    expect(pythonProvider.id).toBe("python");
    expect(pythonProvider.languages).toEqual(["python"]);
  });

  it.each(["pyproject.toml", "requirements.txt", "uv.lock", "poetry.lock", "pdm.lock", "pixi.toml"])(
    "detects %s at the project root",
    async (marker) => {
      expect(await pythonProvider.detect(ctx)).toBe(false);
      await writeFile(join(ctx.projectRoot, marker), "");
      expect(await pythonProvider.detect(ctx)).toBe(true);
    },
  );

  it("does not detect a python project without markers", async () => {
    await writeFile(join(ctx.projectRoot, "README.md"), "");
    expect(await pythonProvider.detect(ctx)).toBe(false);
  });

  it("redirects every python cache into the cache namespace", async () => {
    expect(await pythonProvider.env(ctx)).toEqual([
      { name: "UV_CACHE_DIR", value: join(ctx.cacheNamespace, "uv") },
      { name: "PIP_CACHE_DIR", value: join(ctx.cacheNamespace, "pip") },
      { name: "POETRY_CACHE_DIR", value: join(ctx.cacheNamespace, "pypoetry") },
      { name: "PDM_CACHE_DIR", value: join(ctx.cacheNamespace, "pdm") },
      { name: "PIXI_CACHE_DIR", value: join(ctx.cacheNamespace, "pixi") },
    ]);
  });

  it("never sets UV_PROJECT_ENVIRONMENT or VIRTUAL_ENV", async () => {
    const names = (await pythonProvider.env(ctx)).map((entry) => entry.name);
    expect(names).not.toContain("UV_PROJECT_ENVIRONMENT");
    expect(names).not.toContain("VIRTUAL_ENV");
    const values = (await pythonProvider.env(ctx)).map((entry) => entry.value);
    expect(values.every((value) => !value.includes(".venv"))).toBe(true);
  });

  it("reports every redirected cache dir as auto-safe", async () => {
    expect(await pythonProvider.cacheDirs(ctx)).toEqual([
      {
        id: "uv-cache",
        path: join(ctx.cacheNamespace, "uv"),
        tool: "uv",
        description: expect.any(String),
        autoSafe: true,
      },
      {
        id: "pip-cache",
        path: join(ctx.cacheNamespace, "pip"),
        tool: "pip",
        description: expect.any(String),
        autoSafe: true,
      },
      {
        id: "poetry-cache",
        path: join(ctx.cacheNamespace, "pypoetry"),
        tool: "poetry",
        description: expect.any(String),
        autoSafe: true,
      },
      {
        id: "pdm-cache",
        path: join(ctx.cacheNamespace, "pdm"),
        tool: "pdm",
        description: expect.any(String),
        autoSafe: true,
      },
      {
        id: "pixi-cache",
        path: join(ctx.cacheNamespace, "pixi"),
        tool: "pixi",
        description: expect.any(String),
        autoSafe: true,
      },
    ]);
  });

  it("seeds nothing; uv link-mode clone keeps per-worktree venvs cheap", async () => {
    expect(await pythonProvider.seed(ctx)).toEqual([]);
  });

  it("prunes the uv cache", async () => {
    expect(await pythonProvider.prune(ctx)).toEqual({
      tool: "uv",
      command: "uv",
      args: ["cache", "prune", "--ci"],
      description: "Trim uv cache (keeps source-built wheels)",
      autoSafe: true,
      minAgeDays: 30,
    });
  });

  it("documents the per-worktree .venv rule", async () => {
    expect(await pythonProvider.notes(ctx)).toEqual([
      "Per-worktree .venv stays per worktree (editable installs embed absolute paths).",
      "uv's default clone/hardlink linking makes venvs cheap; pip cache is tarball-only.",
    ]);
  });
});
