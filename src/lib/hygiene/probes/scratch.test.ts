// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashId } from "../../worktree/paths.js";
import { DEFAULT_HYGIENE_POLICY, SCRATCH_MARKER } from "../policy.js";
import type { HygieneItem, HygieneProbeOptions, HygieneProbeResult } from "../types.js";
import { runScratchProbe, selectScratchItems } from "./scratch.js";

const NOW = 1_700_000_000_000;
const DAY_MS = 86_400_000;

function baseOptions(overrides: Partial<HygieneProbeOptions> = {}): HygieneProbeOptions {
  return {
    repoPaths: [],
    sizes: false,
    policy: { ...DEFAULT_HYGIENE_POLICY, scratchTtlHours: 48 },
    now: NOW,
    ...overrides,
  };
}

function itemByPath(result: HygieneProbeResult, path: string): HygieneItem {
  const item = result.items.find((entry) => entry.path === path);
  if (!item) throw new Error(`missing scratch item for ${path}`);
  return item;
}

describe("scratch probe", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "hygiene-scratch-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function backdate(path: string, ageDays: number): Promise<void> {
    const when = new Date(NOW - ageDays * DAY_MS);
    await utimes(path, when, when);
  }

  async function makeDir(name: string, ageDays: number, owned = false): Promise<string> {
    const path = join(root, name);
    await mkdir(path);
    if (owned) await writeFile(join(path, SCRATCH_MARKER), "{}\n");
    await backdate(path, ageDays);
    return path;
  }

  it("flags owned dirs as auto and unowned dirs as review", async () => {
    const ownedPath = await makeDir("owned-old", 5, true);
    const unownedPath = await makeDir("unowned-old", 4);
    await makeDir("fresh", 0.5, true);
    await makeDir(".hidden", 9, true);

    const filePath = join(root, "stray.txt");
    await writeFile(filePath, "junk");
    await backdate(filePath, 10);

    await symlink(ownedPath, join(root, "linked-dir"));

    const result = await runScratchProbe(baseOptions(), { roots: [root] });

    expect(result.category).toBe("scratch");
    expect(result.label).toBe("Agent scratch");
    expect(result.skipped).toBeNull();

    const titles = result.items.map((item) => item.title);
    expect(titles).toContain("Owned scratch owned-old");
    expect(titles).toContain("Unowned scratch unowned-old");
    expect(titles).not.toContain("Owned scratch fresh");
    expect(titles).not.toContain("Owned scratch .hidden");
    expect(titles).not.toContain("Owned scratch stray.txt");
    expect(titles).not.toContain("Owned scratch linked-dir");

    const owned = itemByPath(result, ownedPath);
    expect(owned.id).toBe(`scratch:${hashId(ownedPath)}`);
    expect(owned.tier).toBe("auto");
    expect(owned.due).toBe(true);
    expect(owned.plan).toBe(`rm -rf "${ownedPath}"`);
    expect(owned.reason).toBe("superskill-owned scratch idle 5d (ttl 48h)");
    expect(owned.meta).toEqual({ owned: true, root });
    expect(owned.bytes).toBeNull();
    expect(owned.ageDays).toBe(5);

    const unowned = itemByPath(result, unownedPath);
    expect(unowned.tier).toBe("review");
    expect(unowned.due).toBe(false);
    expect(unowned.plan).toBeNull();
    expect(unowned.reason).toBe("not superskill-owned; verify contents before removing");
    expect(unowned.meta).toEqual({ owned: false, root });

    const again = await runScratchProbe(baseOptions(), { roots: [root] });
    expect(again.items.map((item) => item.id)).toEqual(result.items.map((item) => item.id));
  });

  it("measures bytes when sizes are enabled and filters small unowned dirs", async () => {
    const ownedPath = await makeDir("owned-old", 5, true);
    const unownedPath = await makeDir("unowned-old", 5);

    const bigThreshold = baseOptions({
      sizes: true,
      policy: {
        ...DEFAULT_HYGIENE_POLICY,
        scratchTtlHours: 48,
        scratchReviewMinBytes: 256 * 1024 ** 2,
      },
    });
    const measured = await runScratchProbe(bigThreshold, { roots: [root] });

    const owned = itemByPath(measured, ownedPath);
    expect(owned.bytes).not.toBeNull();
    expect(owned.bytes ?? 0).toBeGreaterThan(0);
    expect(measured.items.some((item) => item.path === unownedPath)).toBe(false);

    const tinyThreshold = baseOptions({
      sizes: true,
      policy: { ...DEFAULT_HYGIENE_POLICY, scratchTtlHours: 48, scratchReviewMinBytes: 0 },
    });
    const unfiltered = await runScratchProbe(tinyThreshold, { roots: [root] });

    const unowned = itemByPath(unfiltered, unownedPath);
    expect(unowned.bytes).not.toBeNull();
    expect(unowned.tier).toBe("review");
    expect(unowned.due).toBe(false);
  });

  it("honors a custom marker name", async () => {
    const path = join(root, "custom-owned");
    await mkdir(path);
    await writeFile(join(path, "custom.marker"), "{}\n");
    await backdate(path, 5);

    const result = await runScratchProbe(baseOptions(), { roots: [root], marker: "custom.marker" });

    const item = itemByPath(result, path);
    expect(item.tier).toBe("auto");
    expect(item.meta).toEqual({ owned: true, root });
  });

  it("skips a missing root without logging", async () => {
    const ownedPath = await makeDir("owned-old", 5, true);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await runScratchProbe(baseOptions(), {
      roots: [join(root, "does-not-exist"), root],
    });

    expect(itemByPath(result, ownedPath).tier).toBe("auto");
    expect(result.skipped).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("logs unexpected root errors", async () => {
    const filePath = join(root, "not-a-dir");
    await writeFile(filePath, "junk");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await runScratchProbe(baseOptions(), { roots: [filePath] });

    expect(result.items).toEqual([]);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[hygiene-scratch]"));
    spy.mockRestore();
  });

  it("caps selected items by size descending with unknown sizes last", () => {
    const makeItem = (path: string, bytes: number | null): HygieneItem => ({
      id: `scratch:${hashId(path)}`,
      category: "scratch",
      title: path,
      path,
      bytes,
      ageDays: 5,
      tier: "auto",
      due: true,
      reason: "test",
      plan: null,
      meta: {},
    });

    const items = [
      makeItem("/a", null),
      makeItem("/b", 100),
      makeItem("/c", 300),
      makeItem("/d", null),
    ];

    expect(selectScratchItems(items).map((item) => item.path)).toEqual(["/c", "/b", "/a", "/d"]);
    expect(selectScratchItems(items, 2).map((item) => item.path)).toEqual(["/c", "/b"]);
  });
});
