// SPDX-License-Identifier: Apache-2.0
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { hashId } from "../../worktree/paths.js";
import { DEFAULT_HYGIENE_POLICY } from "../policy.js";
import type { HygieneProbeOptions } from "../types.js";
import { parseDeviceSupportVersion, runXcodeProbe, xcodeProbe } from "./xcode.js";
import type { XcodeExec } from "./xcode.js";

const quietExec: XcodeExec = async () => ({ stdout: '{"devices":{}}' });

const simctlFixture = JSON.stringify({
  devices: {
    "com.apple.CoreSimulator.SimRuntime.iOS-17-2": [
      { name: "iPhone 15", udid: "AAAA", isAvailable: false, state: "Shutdown" },
      { name: "iPhone 14", udid: "BBBB", isAvailable: true, state: "Booted" },
    ],
    "com.apple.CoreSimulator.SimRuntime.iOS-18-0": [
      { name: "iPhone 16", udid: "CCCC", isAvailable: false },
    ],
  },
});

function makeOpts(overrides: Partial<HygieneProbeOptions> = {}): HygieneProbeOptions {
  return {
    repoPaths: [],
    sizes: true,
    policy: { ...DEFAULT_HYGIENE_POLICY },
    now: Date.now(),
    ...overrides,
  };
}

let home: string | null = null;

async function makeHome(): Promise<string> {
  home = await mkdtemp(join(tmpdir(), "hygiene-xcode-"));
  return home;
}

afterEach(async () => {
  if (home !== null) {
    await rm(home, { recursive: true, force: true });
    home = null;
  }
});

describe("parseDeviceSupportVersion", () => {
  it.each([
    ["iPhone15,3 26.6.2 (23G90)", [26, 6, 2]],
    ["iPhone14,2 17.2 (21C62)", [17, 2]],
    ["watchOS 11.0 (22R5367d)", [11, 0]],
    ["AppleTV 17.2.1 (21K62)", [17, 2, 1]],
    ["garbage", null],
    ["iPhone15,3", null],
    ["", null],
  ])("parses %j", (name, expected) => {
    expect(parseDeviceSupportVersion(name)).toEqual(expected);
  });
});

describe("xcodeProbe", () => {
  it("is exposed as a hygiene probe with the xcode id", () => {
    expect(xcodeProbe.id).toBe("xcode");
  });
});

describe("runXcodeProbe", () => {
  it("skips on non-darwin platforms", async () => {
    const result = await runXcodeProbe(makeOpts(), {
      platform: "linux",
      home: "/nonexistent-home",
      exec: quietExec,
    });
    expect(result.category).toBe("xcode");
    expect(result.label).toBe("Xcode");
    expect(result.items).toEqual([]);
    expect(result.skipped).toEqual({ probe: "xcode", reason: "xcode artifacts only exist on macOS" });
  });

  it("flags large DerivedData when sizes are measured", async () => {
    const dir = await makeHome();
    const derived = join(dir, "Library", "Developer", "Xcode", "DerivedData");
    await mkdir(derived, { recursive: true });
    await writeFile(join(derived, "build.db"), Buffer.alloc(65536));

    const result = await runXcodeProbe(
      makeOpts({ policy: { ...DEFAULT_HYGIENE_POLICY, xcodeDerivedDataMinBytes: 1 } }),
      { platform: "darwin", home: dir, exec: quietExec },
    );

    const item = result.items.find((entry) => entry.id === "xcode:derived-data");
    expect(item).toBeDefined();
    expect(item?.path).toBe(derived);
    expect(item?.bytes).toBeGreaterThan(0);
    expect(item?.ageDays).not.toBeNull();
    expect(item?.tier).toBe("auto");
    expect(item?.due).toBe(true);
    expect(item?.plan).toBe(`rm -rf "${derived}"/*`);
    expect(item?.reason).toContain("xcodebuild regenerates them");
    expect(result.skipped).toBeNull();
  });

  it("does not mark DerivedData due when sizes are disabled", async () => {
    const dir = await makeHome();
    const derived = join(dir, "Library", "Developer", "Xcode", "DerivedData");
    await mkdir(derived, { recursive: true });
    await writeFile(join(derived, "build.db"), "x");

    const result = await runXcodeProbe(makeOpts({ sizes: false }), {
      platform: "darwin",
      home: dir,
      exec: quietExec,
    });

    const item = result.items.find((entry) => entry.id === "xcode:derived-data");
    expect(item).toBeDefined();
    expect(item?.bytes).toBeNull();
    expect(item?.due).toBe(false);
    expect(item?.ageDays).not.toBeNull();
    expect(item?.reason).toContain("--sizes");
    expect(result.skipped).toBeNull();
  });

  it("does not emit DerivedData when it is below the policy threshold", async () => {
    const dir = await makeHome();
    const derived = join(dir, "Library", "Developer", "Xcode", "DerivedData");
    await mkdir(derived, { recursive: true });
    await writeFile(join(derived, "build.db"), "x");

    const result = await runXcodeProbe(
      makeOpts({ policy: { ...DEFAULT_HYGIENE_POLICY, xcodeDerivedDataMinBytes: 10 * 1024 ** 3 } }),
      { platform: "darwin", home: dir, exec: quietExec },
    );

    const item = result.items.find((entry) => entry.id === "xcode:derived-data");
    expect(item).toBeDefined();
    expect(item?.due).toBe(false);
  });

  it("flags older iOS DeviceSupport versions and keeps the newest", async () => {
    const dir = await makeHome();
    const supportRoot = join(dir, "Library", "Developer", "Xcode", "iOS DeviceSupport");
    const newerName = "iPhone15,3 26.6.2 (23G90)";
    const olderName = "iPhone14,2 17.2 (21C62)";
    await mkdir(join(supportRoot, newerName), { recursive: true });
    await mkdir(join(supportRoot, olderName), { recursive: true });
    await writeFile(join(supportRoot, newerName, "dyld_shared_cache"), Buffer.alloc(8192));
    await writeFile(join(supportRoot, olderName, "dyld_shared_cache"), Buffer.alloc(8192));

    const result = await runXcodeProbe(makeOpts(), { platform: "darwin", home: dir, exec: quietExec });

    const items = result.items.filter((entry) => entry.id.startsWith("xcode:device-support:"));
    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item.id).toBe(`xcode:device-support:${hashId(olderName)}`);
    expect(item.title).toBe("Legacy iOS DeviceSupport 17.2");
    expect(item.path).toBe(join(supportRoot, olderName));
    expect(item.due).toBe(true);
    expect(item.tier).toBe("auto");
    expect(item.plan).toBe(`rm -rf "${join(supportRoot, olderName)}"`);
    expect(item.bytes).toBeGreaterThan(0);
    expect(item.ageDays).not.toBeNull();
    expect(item.reason).toBe("only the newest DeviceSupport version is needed for current devices");
    expect(result.items.some((entry) => entry.path === join(supportRoot, newerName))).toBe(false);
  });

  it("flags only strictly older versions when several DeviceSupport entries share the newest version", async () => {
    const dir = await makeHome();
    const supportRoot = join(dir, "Library", "Developer", "Xcode", "iOS DeviceSupport");
    const newestA = "iPhone15,3 26.6.2 (23G90)";
    const newestB = "iPhone14,2 26.6.2 (21C62)";
    const olderName = "iPhone12,1 17.2 (21C62)";
    const unparsedName = "garbage";
    await mkdir(join(supportRoot, newestA), { recursive: true });
    await mkdir(join(supportRoot, newestB), { recursive: true });
    await mkdir(join(supportRoot, olderName), { recursive: true });
    await mkdir(join(supportRoot, unparsedName), { recursive: true });

    const result = await runXcodeProbe(makeOpts(), { platform: "darwin", home: dir, exec: quietExec });

    const items = result.items.filter((entry) => entry.id.startsWith("xcode:device-support:"));
    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item.id).toBe(`xcode:device-support:${hashId(olderName)}`);
    expect(item.path).toBe(join(supportRoot, olderName));
    expect(item.plan).toBe(`rm -rf "${join(supportRoot, olderName)}"`);
    expect(item.due).toBe(true);
    expect(result.items.some((entry) => entry.path === join(supportRoot, newestA))).toBe(false);
    expect(result.items.some((entry) => entry.path === join(supportRoot, newestB))).toBe(false);
    expect(result.items.some((entry) => entry.path === join(supportRoot, unparsedName))).toBe(false);
  });

  it("leaves DeviceSupport unmeasured when sizes are disabled", async () => {
    const dir = await makeHome();
    const supportRoot = join(dir, "Library", "Developer", "Xcode", "iOS DeviceSupport");
    await mkdir(join(supportRoot, "iPhone15,3 26.6.2 (23G90)"), { recursive: true });
    await mkdir(join(supportRoot, "iPhone14,2 17.2 (21C62)"), { recursive: true });

    const result = await runXcodeProbe(makeOpts({ sizes: false }), {
      platform: "darwin",
      home: dir,
      exec: quietExec,
    });

    const item = result.items.find((entry) => entry.id.startsWith("xcode:device-support:"));
    expect(item).toBeDefined();
    expect(item?.bytes).toBeNull();
    expect(item?.ageDays).toBeNull();
    expect(item?.due).toBe(true);
  });

  it("recommends deleting unavailable simulators", async () => {
    const calls: Array<{ cmd: string; args: string[]; opts: { timeout: number; maxBuffer: number } }> = [];
    const exec: XcodeExec = async (cmd, args, opts) => {
      calls.push({ cmd, args, opts });
      return { stdout: simctlFixture };
    };

    const result = await runXcodeProbe(makeOpts(), {
      platform: "darwin",
      home: "/nonexistent-home",
      exec,
    });

    const item = result.items.find((entry) => entry.id === "xcode:simulators");
    expect(item).toBeDefined();
    expect(item?.due).toBe(true);
    expect(item?.tier).toBe("auto");
    expect(item?.plan).toBe("xcrun simctl delete unavailable");
    expect(item?.reason).toBe("2 device(s) in unavailable runtimes");
    expect(item?.path).toBeNull();
    expect(item?.bytes).toBeNull();
    expect(item?.ageDays).toBeNull();
    expect(calls).toEqual([
      {
        cmd: "xcrun",
        args: ["simctl", "list", "devices", "-j"],
        opts: { timeout: 10000, maxBuffer: 10 * 1024 * 1024 },
      },
    ]);
    expect(result.skipped).toBeNull();
  });

  it("omits the simulator item when xcrun fails but the probe still succeeds", async () => {
    const failing: XcodeExec = async () => {
      throw Object.assign(new Error("xcrun: command not found"), { code: "ENOENT" });
    };

    const result = await runXcodeProbe(makeOpts(), {
      platform: "darwin",
      home: "/nonexistent-home",
      exec: failing,
    });

    expect(result.skipped).toBeNull();
    expect(result.items.find((entry) => entry.id === "xcode:simulators")).toBeUndefined();
  });

  it("omits the simulator item when simctl output cannot be parsed", async () => {
    const exec: XcodeExec = async () => ({ stdout: "not json" });

    const result = await runXcodeProbe(makeOpts(), {
      platform: "darwin",
      home: "/nonexistent-home",
      exec,
    });

    expect(result.skipped).toBeNull();
    expect(result.items).toEqual([]);
  });
});
