// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { GcCandidate } from "../../worktree/gc.js";
import { hashId } from "../../worktree/paths.js";
import { DEFAULT_HYGIENE_POLICY } from "../policy.js";
import type { HygieneProbeOptions } from "../types.js";
import { runCachesProbe } from "./caches.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function probeOptions(overrides: Partial<HygieneProbeOptions> = {}): HygieneProbeOptions {
  return {
    repoPaths: [],
    sizes: false,
    policy: DEFAULT_HYGIENE_POLICY,
    now: Date.now(),
    ...overrides,
  };
}

function candidate(overrides: Partial<GcCandidate> = {}): GcCandidate {
  return {
    path: "/cache/repo-a/go-build",
    repoId: "repo-a",
    tool: "go",
    bytes: 4096,
    ageDays: 40,
    tier: "auto",
    ...overrides,
  };
}

async function backdate(path: string, days: number): Promise<void> {
  const when = new Date(Date.now() - days * DAY_MS);
  await utimes(path, when, when);
}

async function backdateTree(path: string, days: number): Promise<void> {
  await backdate(path, days);
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    await backdate(child, days);
    if (entry.isDirectory()) await backdateTree(child, days);
  }
}

describe("runCachesProbe managed caches", () => {
  it("maps candidates with tier-aware due thresholds, ids, titles and plans", async () => {
    const candidates: GcCandidate[] = [
      candidate(),
      candidate({ path: "/cache/repo-a/sccache", tool: "rust", bytes: 512, ageDays: 5 }),
      candidate({
        path: "/cache/repo-b/cargo-build",
        repoId: "repo-b",
        tool: "rust",
        bytes: 3 * 1024 ** 3,
        ageDays: 45,
        tier: "consent",
      }),
      candidate({
        path: "/cache/repo-b/node-modules",
        repoId: "repo-b",
        tool: "node",
        bytes: 64,
        ageDays: 60,
        tier: "consent",
      }),
      candidate({ path: "/cache/repo-c/go-mod", repoId: "repo-c", tool: "go", bytes: null, ageDays: null }),
    ];

    const result = await runCachesProbe(probeOptions({ sizes: true }), {
      scanCacheRoot: async () => candidates,
      platformCacheRoot: () => "/cache",
      platform: "win32",
    });

    expect(result.category).toBe("caches");
    expect(result.label).toBe("Build caches");
    expect(result.skipped).toBeNull();
    expect(result.items).toHaveLength(candidates.length);

    const [autoDue, autoYoung, consentDue, consentSmall, unknownAge] = result.items;

    expect(autoDue.id).toBe(`cache:${hashId("/cache/repo-a/go-build")}`);
    expect(autoDue.title).toBe("go cache — repo-a/go-build");
    expect(autoDue.tier).toBe("auto");
    expect(autoDue.due).toBe(true);
    expect(autoDue.reason).toContain("idle 40d");
    expect(autoDue.plan).toBe(
      'superskill-cli worktree gc --older-than 30d --include "repo-a/go-build" --apply',
    );
    expect(autoDue.meta).toEqual({ repoId: "repo-a", tool: "go", tier: "auto" });

    expect(autoYoung.due).toBe(false);

    expect(consentDue.due).toBe(true);
    expect(consentDue.tier).toBe("consent");
    expect(consentDue.reason).toContain("consent required");
    expect(consentDue.plan).toBe(
      'superskill-cli worktree gc --older-than 30d --tier consent --include "repo-b/cargo-build" --apply',
    );

    expect(consentSmall.due).toBe(false);
    expect(unknownAge.due).toBe(false);
  });

  it("leaves managed bytes unknown and consent tiers not due when sizes are off", async () => {
    const calls: Array<{ all?: boolean; measureSizes?: boolean }> = [];
    const result = await runCachesProbe(probeOptions(), {
      scanCacheRoot: async (opts) => {
        calls.push({ all: opts?.all, measureSizes: opts?.measureSizes });
        return [
          candidate({ bytes: 3 * 1024 ** 3, ageDays: 45, tier: "consent" }),
          candidate({ bytes: 4096, ageDays: 40, tier: "auto" }),
        ];
      },
      platformCacheRoot: () => "/cache",
      platform: "win32",
    });
    expect(calls).toEqual([{ all: true, measureSizes: false }]);
    const consent = result.items.find((item) => item.tier === "consent");
    const auto = result.items.find((item) => item.tier === "auto");
    expect(consent?.bytes).toBeNull();
    expect(consent?.due).toBe(false);
    expect(auto?.bytes).toBeNull();
    expect(auto?.due).toBe(true);
  });

  it("caps managed items at 60", async () => {
    const candidates = Array.from({ length: 70 }, (_, index) =>
      candidate({
        path: `/cache/repo-a/cache-${String(index).padStart(2, "0")}`,
        bytes: null,
        ageDays: 40,
      }),
    );
    const result = await runCachesProbe(probeOptions(), {
      scanCacheRoot: async () => candidates,
      platformCacheRoot: () => "/cache",
      platform: "win32",
    });
    expect(result.items).toHaveLength(60);
  });
});

describe("runCachesProbe default caches", () => {
  let home: string;

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), "hygiene-caches-"));
  });

  afterEach(async () => {
    await rm(home, { recursive: true, force: true });
  });

  it("classifies darwin default caches, skipping hidden, managed and unknown dirs", async () => {
    const cacheBase = join(home, "Library", "Caches");
    const goBuild = join(cacheBase, "go-build");
    const sccache = join(cacheBase, "Mozilla.sccache");
    const goMod = join(home, "go", "pkg", "mod");
    await mkdir(goBuild, { recursive: true });
    await mkdir(sccache, { recursive: true });
    await mkdir(join(cacheBase, ".hidden"), { recursive: true });
    await mkdir(join(cacheBase, "superskill", "repo-a"), { recursive: true });
    await mkdir(join(cacheBase, "totally-unknown"), { recursive: true });
    await mkdir(goMod, { recursive: true });
    await writeFile(join(goBuild, "blob"), "g".repeat(2048));
    await writeFile(join(sccache, "obj"), "s".repeat(2048));
    await writeFile(join(goMod, "entry"), "m".repeat(2048));
    await backdateTree(goBuild, 45);
    await backdateTree(sccache, 45);
    await backdateTree(goMod, 10);

    const result = await runCachesProbe(probeOptions({ sizes: true }), {
      scanCacheRoot: async () => [],
      platformCacheRoot: () => join(cacheBase, "superskill"),
      home,
      platform: "darwin",
    });

    expect(result.items.map((item) => item.title).sort()).toEqual([
      "go default cache go-build",
      "go default cache go/pkg/mod",
      "rust default cache Mozilla.sccache",
    ]);

    const byTitle = new Map(result.items.map((item) => [item.title, item]));
    const goItem = byTitle.get("go default cache go-build");
    expect(goItem).toBeDefined();
    expect(goItem?.id).toBe(`cache:default:${hashId(goBuild)}`);
    expect(goItem?.path).toBe(goBuild);
    expect(goItem?.tier).toBe("auto");
    expect(goItem?.due).toBe(true);
    expect(goItem?.reason).toBe("default build cache (not superskill-managed); regenerates");
    expect(goItem?.plan).toBe("go clean -cache");
    expect(goItem?.meta).toEqual({ managed: false, tool: "go" });
    expect(goItem?.bytes).toBeGreaterThan(0);
    expect(goItem?.ageDays ?? 0).toBeGreaterThanOrEqual(44);

    const sccacheItem = byTitle.get("rust default cache Mozilla.sccache");
    expect(sccacheItem?.tier).toBe("auto");
    expect(sccacheItem?.due).toBe(true);
    expect(sccacheItem?.plan).toBe(`rm -rf "${sccache}"`);

    const goModItem = byTitle.get("go default cache go/pkg/mod");
    expect(goModItem?.tier).toBe("auto");
    expect(goModItem?.due).toBe(false);
    expect(goModItem?.plan).toBe("go clean -modcache");
  });

  it("scans the linux default cache location", async () => {
    const goBuild = join(home, ".cache", "go-build");
    await mkdir(goBuild, { recursive: true });
    await writeFile(join(goBuild, "blob"), "g");
    await backdateTree(goBuild, 45);

    const result = await runCachesProbe(probeOptions(), {
      scanCacheRoot: async () => [],
      platformCacheRoot: () => join(home, ".cache", "superskill"),
      home,
      platform: "linux",
    });

    expect(result.items.map((item) => item.title)).toEqual(["go default cache go-build"]);
    expect(result.items[0].due).toBe(true);
  });

  it("caps default items at 40 and leaves bytes unknown when sizes are off", async () => {
    const cacheBase = join(home, "Library", "Caches");
    for (let index = 0; index < 45; index += 1) {
      await mkdir(join(cacheBase, `go-build-${String(index).padStart(2, "0")}`), { recursive: true });
    }

    const result = await runCachesProbe(probeOptions(), {
      scanCacheRoot: async () => [],
      platformCacheRoot: () => join(cacheBase, "superskill"),
      home,
      platform: "darwin",
    });

    expect(result.items).toHaveLength(40);
    expect(result.items[0].bytes).toBeNull();
    expect(result.items.every((item) => item.meta.tool === "go")).toBe(true);
  });

  it("emits no default items on unsupported platforms", async () => {
    await mkdir(join(home, "Library", "Caches", "go-build"), { recursive: true });

    const result = await runCachesProbe(probeOptions(), {
      scanCacheRoot: async () => [],
      platformCacheRoot: () => join(home, "Library", "Caches", "superskill"),
      home,
      platform: "win32",
    });

    expect(result.items).toEqual([]);
    expect(result.skipped).toBeNull();
  });

  it("keeps default items when the managed scan throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const goBuild = join(home, "Library", "Caches", "go-build");
      await mkdir(goBuild, { recursive: true });
      await writeFile(join(goBuild, "blob"), "g");
      await backdateTree(goBuild, 40);

      const result = await runCachesProbe(probeOptions(), {
        scanCacheRoot: async () => {
          throw new Error("managed scan exploded");
        },
        platformCacheRoot: () => join(home, "Library", "Caches", "superskill"),
        home,
        platform: "darwin",
      });

      expect(result.skipped).toBeNull();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].meta).toEqual({ managed: false, tool: "go" });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("managed cache scan failed"));
    } finally {
      spy.mockRestore();
    }
  });

  it("returns skipped only when both sources fail", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await writeFile(join(home, "Library"), "not a directory");

      const result = await runCachesProbe(probeOptions(), {
        scanCacheRoot: async () => {
          throw new Error("managed scan exploded");
        },
        platformCacheRoot: () => join(home, "Library", "Caches", "superskill"),
        home,
        platform: "darwin",
      });

      expect(result.items).toEqual([]);
      expect(result.skipped?.probe).toBe("caches");
      expect(result.skipped?.reason).toContain("managed scan exploded");
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("default cache scan failed"));
    } finally {
      spy.mockRestore();
    }
  });
});
