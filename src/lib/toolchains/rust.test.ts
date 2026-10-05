// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { commandExists, rustProvider } from "./rust.js";
import type { EnvVar, ProviderContext } from "./types.js";

const ORIGINAL_PATH = process.env.PATH;

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

describe("rustProvider", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "rust-provider-"));
  });

  afterEach(async () => {
    if (ORIGINAL_PATH === undefined) delete process.env.PATH;
    else process.env.PATH = ORIGINAL_PATH;
    await rm(tmp, { recursive: true, force: true });
  });

  it("uses rust identity", () => {
    expect(rustProvider.id).toBe("rust");
    expect(rustProvider.languages).toEqual(["rust"]);
  });

  it("detects a Cargo.toml at the project root", async () => {
    const ctx = makeCtx(tmp);
    expect(await rustProvider.detect(ctx)).toBe(false);

    await mkdir(ctx.projectRoot, { recursive: true });
    expect(await rustProvider.detect(ctx)).toBe(false);

    await writeFile(join(ctx.projectRoot, "Cargo.toml"), "[package]\n");
    expect(await rustProvider.detect(ctx)).toBe(true);
  });

  it("always relocates cargo intermediates into the cache namespace", async () => {
    process.env.PATH = join(tmp, "empty-bin");
    await mkdir(process.env.PATH, { recursive: true });

    const ctx = makeCtx(tmp);
    const map = toMap(await rustProvider.env(ctx));

    expect(map.size).toBe(1);
    expect(map.get("CARGO_BUILD_BUILD_DIR")?.value).toBe(
      join(ctx.cacheNamespace, "cargo-build", ctx.worktreeKey),
    );
    expect(map.has("CARGO_TARGET_DIR")).toBe(false);
    expect(map.has("RUSTC_WRAPPER")).toBe(false);
  });

  it("enables sccache when the binary is on PATH", async () => {
    const binDir = join(tmp, "bin");
    await mkdir(binDir, { recursive: true });
    await writeFile(join(binDir, "sccache"), "");
    process.env.PATH = binDir;

    const ctx = makeCtx(tmp);
    const map = toMap(await rustProvider.env(ctx));

    expect(map.get("CARGO_BUILD_BUILD_DIR")?.value).toBe(
      join(ctx.cacheNamespace, "cargo-build", ctx.worktreeKey),
    );
    expect(map.get("RUSTC_WRAPPER")?.value).toBe("sccache");
    expect(map.get("SCCACHE_DIR")?.value).toBe(join(ctx.cacheNamespace, "sccache"));
    expect(map.get("SCCACHE_CACHE_SIZE")?.value).toBe("20G");
    expect(map.get("SCCACHE_BASEDIRS")?.value).toBe(ctx.projectRoot);
    expect(map.get("CARGO_INCREMENTAL")?.value).toBe("0");
    expect(map.has("CARGO_TARGET_DIR")).toBe(false);
  });

  it("matches machine sccache availability when PATH is untouched", async () => {
    const ctx = makeCtx(tmp);
    const map = toMap(await rustProvider.env(ctx));

    if (commandExists("sccache")) {
      expect(map.get("RUSTC_WRAPPER")?.value).toBe("sccache");
    } else {
      expect(map.has("RUSTC_WRAPPER")).toBe(false);
    }
  });

  it("lists the sccache and cargo-build cache dirs under the namespace", async () => {
    const ctx = makeCtx(tmp);
    const dirs = await rustProvider.cacheDirs(ctx);

    expect(dirs).toEqual([
      {
        id: "rust-sccache",
        path: join(ctx.cacheNamespace, "sccache"),
        tool: "sccache",
        description: "Rust compiler cache shared across worktrees",
        autoSafe: true,
      },
      {
        id: "rust-build-dir",
        path: join(ctx.cacheNamespace, "cargo-build"),
        tool: "cargo",
        description: "Cargo intermediates relocated out of worktrees (Cargo >=1.91)",
        autoSafe: false,
      },
    ]);
  });

  it("seeds the target dir from the main worktree", async () => {
    const ctx = makeCtx(tmp);
    expect(await rustProvider.seed(ctx)).toEqual([
      {
        source: join(ctx.projectRoot, "target"),
        dest: join(ctx.worktreeRoot, "target"),
        kind: "dir",
        method: "auto-reflink",
        relative: "target",
      },
    ]);
  });

  it("has no tool-native prune command", async () => {
    expect(await rustProvider.prune(makeCtx(tmp))).toBeNull();
  });

  it("reports cross-worktree safety notes", async () => {
    expect(await rustProvider.notes(makeCtx(tmp))).toEqual([
      "Never share CARGO_TARGET_DIR across concurrent worktrees (stale fingerprints, cargo#16642).",
      "CCACHE/SCCACHE cross-worktree hits require SCCACHE_BASEDIRS to cover every worktree path.",
      "kache is an alternative wrapper for higher cross-worktree hit rates.",
    ]);
  });
});

describe("commandExists", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "command-exists-"));
  });

  afterEach(async () => {
    if (ORIGINAL_PATH === undefined) delete process.env.PATH;
    else process.env.PATH = ORIGINAL_PATH;
    await rm(tmp, { recursive: true, force: true });
  });

  it("scans only the injected PATH", async () => {
    const binDir = join(tmp, "bin");
    await mkdir(binDir, { recursive: true });
    await writeFile(join(binDir, "sccache"), "");
    process.env.PATH = binDir;

    expect(commandExists("sccache")).toBe(true);
    expect(commandExists("sccache.exe")).toBe(false);
    expect(commandExists("missing-tool")).toBe(false);

    const emptyDir = join(tmp, "empty");
    await mkdir(emptyDir, { recursive: true });
    process.env.PATH = emptyDir;
    expect(commandExists("sccache")).toBe(false);
  });

  it("returns false when PATH is unset", () => {
    delete process.env.PATH;
    expect(commandExists("sccache")).toBe(false);
  });
});
