// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_HYGIENE_POLICY } from "../policy.js";
import type { HygieneItem, HygieneProbeOptions } from "../types.js";
import {
  parseDfVerboseTables,
  parseHumanSize,
  runDockerProbe,
  type DockerExec,
  type DockerExecResult,
} from "./docker.js";

const IMAGE_SECTION = [
  "Images space usage:",
  "",
  "REPOSITORY               TAG       IMAGE ID       CREATED         SIZE      SHARED SIZE   UNIQUE SIZE   CONTAINERS",
  "postgres                 latest    a1b2c3d4e5f6   2 weeks ago     181MB     50MB          131MB         1",
  "myapp                    latest    f6e5d4c3b2a1   3 days ago      250MB     0B            250MB         1",
  "<none>                   <none>    111111111111   4 weeks ago     42.43GB   0B            42.43GB       0",
  "<none>                   <none>    222222222222   5 weeks ago     3.484GB   0B            3.484GB       0",
];

const VOLUME_SECTION = [
  "Local Volumes space usage:",
  "",
  "VOLUME NAME         LINKS     SIZE",
  "superskill_pgdata   0         3.484GB",
  "superskill_redis    0         181MB",
  "superskill_uploads  1         1.2GB",
  "anon_aabbccddeeff   0         42.43GB",
];

const BUILD_CACHE_WITH_RECLAIM = [
  "CACHE ID       CACHE TYPE     SIZE      CREATED         LAST USED       USAGE     SHARED    RECLAIMABLE",
  "abc123         regular        2GB       2 weeks ago     1 day ago       shared    true      1.5GB",
  "def456         regular        512MB     1 week ago      2 days ago      shared    false     0B",
];

const BUILD_CACHE_WITHOUT_RECLAIM = [
  "CACHE ID       CACHE TYPE     SIZE      CREATED         LAST USED       USAGE     SHARED",
  "abc123         regular        2GB       2 weeks ago     1 day ago       shared    true",
  "def456         regular        512MB     1 week ago      2 days ago      shared    false",
];

const DF_VERBOSE_HEAD = [
  ...IMAGE_SECTION,
  "",
  ...VOLUME_SECTION,
  "",
  "Build cache usage:",
  "",
];

const FULL_DF_VERBOSE = [...DF_VERBOSE_HEAD, ...BUILD_CACHE_WITH_RECLAIM].join("\n");

const FULL_DF_VERBOSE_WITHOUT_RECLAIM = [
  ...DF_VERBOSE_HEAD,
  ...BUILD_CACHE_WITHOUT_RECLAIM,
].join("\n");

const SUMMARY_DF = [
  "TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE",
  "Images          5         2         1.5GB     800MB (53%)",
  "Containers      3         1         100MB     20MB (20%)",
  "Local Volumes   4         1         5GB       3GB (60%)",
  "Build Cache     10        0         4GB       2.5GB",
].join("\n");

interface RecordedCall {
  cmd: string;
  args: string[];
  opts: { timeout: number; maxBuffer: number };
}

type ExecResponder = (args: string[]) => DockerExecResult | Promise<DockerExecResult>;

function fakeExec(responder: ExecResponder): { exec: DockerExec; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const exec: DockerExec = async (cmd, args, opts) => {
    calls.push({ cmd, args: [...args], opts });
    return responder(args);
  };
  return { exec, calls };
}

function makeOptions(overrides: Partial<HygieneProbeOptions> = {}): HygieneProbeOptions {
  return {
    repoPaths: ["/repo"],
    sizes: true,
    policy: { ...DEFAULT_HYGIENE_POLICY },
    now: Date.UTC(2025, 0, 31),
    ...overrides,
  };
}

function itemById(items: HygieneItem[], id: string): HygieneItem {
  const item = items.find((candidate) => candidate.id === id);
  if (item === undefined) throw new Error(`missing hygiene item: ${id}`);
  return item;
}

function volumeFixture(rows: string[]): string {
  return ["Local Volumes space usage:", "", "VOLUME NAME   LINKS     SIZE", ...rows].join("\n");
}

const READ_ONLY_ARG_PREFIXES: ReadonlyArray<readonly string[]> = [
  ["system", "df"],
  ["system", "df", "-v"],
  ["volume", "inspect"],
];

function matchesPrefix(args: string[], prefix: readonly string[]): boolean {
  return prefix.length <= args.length && prefix.every((token, index) => args[index] === token);
}

function expectReadOnly(calls: RecordedCall[]): void {
  for (const call of calls) {
    expect(call.cmd).toBe("docker");
    const allowed = READ_ONLY_ARG_PREFIXES.some((prefix) => matchesPrefix(call.args, prefix));
    expect(allowed, `unexpected docker command: docker ${call.args.join(" ")}`).toBe(true);
    for (const arg of call.args) {
      expect(["prune", "rm", "rmi"]).not.toContain(arg);
    }
  }
}

function fullFixtureHandler(args: string[]): DockerExecResult {
  if (args.join(" ") === "system df -v") return { stdout: FULL_DF_VERBOSE };
  if (args[0] === "volume" && args[1] === "inspect") {
    if (args[2] === "superskill_pgdata") {
      return { stdout: JSON.stringify([{ CreatedAt: "2024-12-01T00:00:00Z" }]) };
    }
    if (args[2] === "superskill_redis") {
      return { stdout: JSON.stringify([{ CreatedAt: "2025-01-15T00:00:00Z" }]) };
    }
    throw new Error(`unexpected volume inspect: ${String(args[2])}`);
  }
  throw new Error(`unexpected docker command: ${args.join(" ")}`);
}

describe("parseHumanSize", () => {
  it.each([
    { input: "0B", expected: 0 },
    { input: "1.2kB", expected: 1_200 },
    { input: "181MB", expected: 181_000_000 },
    { input: "3.484GB", expected: 3_484_000_000 },
    { input: "42.43GB", expected: 42_430_000_000 },
    { input: "2TB", expected: 2_000_000_000_000 },
    { input: "800MB (53%)", expected: 800_000_000 },
    { input: " 1.5 GB ", expected: 1_500_000_000 },
  ])("parses $input", ({ input, expected }) => {
    expect(parseHumanSize(input)).toBe(expected);
  });

  it.each(["", "N/A", "<none>", "about a minute", "GB", "1,234MB"])(
    "returns null for %s",
    (input) => {
      expect(parseHumanSize(input)).toBeNull();
    },
  );
});

describe("parseDfVerboseTables", () => {
  it("extracts volume rows, dangling images and reclaimable build cache", () => {
    const parsed = parseDfVerboseTables(FULL_DF_VERBOSE);

    expect(parsed.volumes).toEqual([
      { name: "superskill_pgdata", links: 0, bytes: 3_484_000_000 },
      { name: "superskill_redis", links: 0, bytes: 181_000_000 },
      { name: "superskill_uploads", links: 1, bytes: 1_200_000_000 },
      { name: "anon_aabbccddeeff", links: 0, bytes: 42_430_000_000 },
    ]);
    expect(parsed.danglingImages).toEqual({ count: 2, bytes: 45_914_000_000 });
    expect(parsed.buildCacheReclaimableBytes).toBe(1_500_000_000);
  });

  it("skips unparseable volume rows and returns null without a reclaimable column", () => {
    const parsed = parseDfVerboseTables(
      [
        "Local Volumes space usage:",
        "",
        "VOLUME NAME   LINKS     SIZE",
        "good_vol      0         2GB",
        "bad_links     n/a       2GB",
        "bad_size      0         N/A",
        "",
        "Build cache usage:",
        "",
        "CACHE ID       CACHE TYPE     SIZE      CREATED         LAST USED       USAGE     SHARED",
        "abc123         regular        2GB       2 weeks ago     1 day ago       shared    true",
      ].join("\n"),
    );

    expect(parsed.volumes).toEqual([{ name: "good_vol", links: 0, bytes: 2_000_000_000 }]);
    expect(parsed.danglingImages).toEqual({ count: 0, bytes: 0 });
    expect(parsed.buildCacheReclaimableBytes).toBeNull();
  });
});

describe("runDockerProbe", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses a full docker system df -v output into aggregate items", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { exec, calls } = fakeExec(fullFixtureHandler);

    const result = await runDockerProbe(makeOptions(), { exec });

    expect(result.category).toBe("docker");
    expect(result.label).toBe("Docker");
    expect(result.skipped).toBeNull();
    expect(result.items.map((item) => item.id)).toEqual([
      "docker:volumes",
      "docker:images",
      "docker:build-cache",
    ]);

    expect(itemById(result.items, "docker:volumes")).toMatchObject({
      title: "Unreferenced docker volumes",
      path: null,
      bytes: 46_095_000_000,
      ageDays: 61,
      tier: "review",
      due: true,
      meta: { count: 3 },
    });

    expect(itemById(result.items, "docker:images")).toMatchObject({
      title: "Dangling docker images",
      path: null,
      bytes: 45_914_000_000,
      tier: "auto",
      due: true,
      meta: { count: 2 },
    });

    expect(itemById(result.items, "docker:build-cache")).toMatchObject({
      title: "Docker build cache",
      path: null,
      bytes: 1_500_000_000,
      tier: "auto",
      due: true,
      meta: { count: 2 },
    });

    expect(calls[0]).toEqual({
      cmd: "docker",
      args: ["system", "df", "-v"],
      opts: { timeout: 10_000, maxBuffer: 10 * 1024 * 1024 },
    });
    expect(calls.filter((call) => call.args[0] === "volume")).toHaveLength(3);
    expect(errorSpy).toHaveBeenCalledWith(
      "[hygiene-docker] volume inspect failed for anon_aabbccddeeff: unexpected volume inspect: anon_aabbccddeeff",
    );
    expectReadOnly(calls);
  });

  it("uses the oldest CreatedAt from inspected unreferenced volumes for ageDays", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fixture = volumeFixture([
      "vol_fail   0         2GB",
      "vol_mid    0         1GB",
      "vol_new    0         1GB",
    ]);
    const now = Date.UTC(2025, 5, 30, 12);
    const { exec, calls } = fakeExec((args) => {
      if (args[0] === "system") return { stdout: fixture };
      if (args[2] === "vol_fail") throw new Error("volume inspect failed");
      if (args[2] === "vol_mid") {
        return { stdout: JSON.stringify([{ CreatedAt: "2025-06-20T00:00:00.123456789Z" }]) };
      }
      if (args[2] === "vol_new") {
        return { stdout: JSON.stringify([{ CreatedAt: "2025-06-25T12:00:00.500Z" }]) };
      }
      throw new Error(`unexpected volume inspect: ${String(args[2])}`);
    });

    const result = await runDockerProbe(makeOptions({ now }), { exec });
    const volumes = itemById(result.items, "docker:volumes");

    expect(volumes.bytes).toBe(4_000_000_000);
    expect(volumes.ageDays).toBe(10);
    expect(volumes.due).toBe(false);
    expect(calls.find((call) => call.args[0] === "volume")?.opts).toEqual({
      timeout: 5_000,
      maxBuffer: 1024 * 1024,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "[hygiene-docker] volume inspect failed for vol_fail: volume inspect failed",
    );
    expectReadOnly(calls);
  });

  it("keeps the volumes item not due when every volume inspection fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fixture = volumeFixture(["vol_a   0         2GB"]);
    const { exec } = fakeExec((args) => {
      if (args[0] === "system") return { stdout: fixture };
      throw new Error("inspect boom");
    });

    const result = await runDockerProbe(makeOptions(), { exec });
    const volumes = itemById(result.items, "docker:volumes");

    expect(volumes.ageDays).toBeNull();
    expect(volumes.tier).toBe("review");
    expect(volumes.due).toBe(false);
    expect(volumes.reason).toContain("age unknown; verify manually");
    expect(errorSpy).toHaveBeenCalledWith(
      "[hygiene-docker] volume inspect failed for vol_a: inspect boom",
    );
  });

  it("caps volume inspect failure logs at 3 and stays silent for ENOENT", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fixture = volumeFixture([
      "vol_1   0         2GB",
      "vol_2   0         2GB",
      "vol_3   0         2GB",
      "vol_4   0         2GB",
      "vol_enoent   0         2GB",
    ]);
    const { exec } = fakeExec((args) => {
      if (args[0] === "system") return { stdout: fixture };
      if (args[2] === "vol_enoent") {
        throw Object.assign(new Error("spawn docker ENOENT"), { code: "ENOENT" });
      }
      throw Object.assign(new Error("permission denied"), { code: "EACCES" });
    });

    const result = await runDockerProbe(makeOptions(), { exec });
    const volumes = itemById(result.items, "docker:volumes");

    expect(volumes.ageDays).toBeNull();
    expect(volumes.due).toBe(false);
    const failureLogs = errorSpy.mock.calls.filter((call) =>
      String(call[0]).includes("volume inspect failed"),
    );
    expect(failureLogs).toHaveLength(3);
    expect(failureLogs.every((call) => String(call[0]).includes("permission denied"))).toBe(true);
    expect(errorSpy.mock.calls.some((call) => String(call[0]).includes("vol_enoent"))).toBe(false);
  });

  it("does not mark unreferenced volumes due below the 1GB threshold", async () => {
    const fixture = volumeFixture(["tiny   0         500MB"]);
    const now = Date.UTC(2026, 0, 1);
    const { exec } = fakeExec((args) => {
      if (args[0] === "system") return { stdout: fixture };
      return { stdout: JSON.stringify([{ CreatedAt: "2025-01-01T00:00:00Z" }]) };
    });

    const result = await runDockerProbe(makeOptions({ now }), { exec });
    const volumes = itemById(result.items, "docker:volumes");

    expect(volumes.ageDays).toBe(365);
    expect(volumes.due).toBe(false);
  });

  it("skips when the daemon is unreachable on stderr", async () => {
    const { exec, calls } = fakeExec(() => ({
      stdout: "",
      stderr:
        "Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?",
    }));

    const result = await runDockerProbe(makeOptions(), { exec });

    expect(result.items).toEqual([]);
    expect(result.skipped).toEqual({ probe: "docker", reason: "docker daemon not running" });
    expect(calls).toHaveLength(1);
  });

  it("skips when exec rejects with a daemon connect error", async () => {
    const { exec } = fakeExec(() => {
      throw new Error(
        "error during connect: This error may indicate that the docker daemon is not running.",
      );
    });

    const result = await runDockerProbe(makeOptions(), { exec });

    expect(result.skipped).toEqual({ probe: "docker", reason: "docker daemon not running" });
  });

  it("skips when the docker CLI is not installed", async () => {
    const { exec, calls } = fakeExec(() => {
      throw Object.assign(new Error("spawn docker ENOENT"), { code: "ENOENT" });
    });

    const result = await runDockerProbe(makeOptions(), { exec });

    expect(result.skipped).toEqual({ probe: "docker", reason: "docker CLI not installed" });
    expect(result.items).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it("falls back to docker system df for build cache reclaimable bytes", async () => {
    const { exec, calls } = fakeExec((args) => {
      if (args.join(" ") === "system df -v") {
        return { stdout: FULL_DF_VERBOSE_WITHOUT_RECLAIM };
      }
      if (args.join(" ") === "system df") return { stdout: SUMMARY_DF };
      if (args[0] === "volume") {
        return { stdout: JSON.stringify([{ CreatedAt: "2025-01-01T00:00:00Z" }]) };
      }
      throw new Error(`unexpected docker command: ${args.join(" ")}`);
    });

    const result = await runDockerProbe(makeOptions(), { exec });
    const buildCache = itemById(result.items, "docker:build-cache");

    expect(buildCache.bytes).toBe(2_500_000_000);
    expect(buildCache.due).toBe(true);
    expect(buildCache.meta).toMatchObject({ count: 10 });
    expect(calls.filter((call) => call.args.join(" ") === "system df")).toHaveLength(1);
    expectReadOnly(calls);
  });

  it("keeps probe output when the build cache fallback call fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { exec } = fakeExec((args) => {
      if (args.join(" ") === "system df -v") {
        return { stdout: FULL_DF_VERBOSE_WITHOUT_RECLAIM };
      }
      if (args.join(" ") === "system df") throw new Error("summary unavailable");
      return { stdout: JSON.stringify([{ CreatedAt: "2025-01-01T00:00:00Z" }]) };
    });

    const result = await runDockerProbe(makeOptions(), { exec });
    const buildCache = itemById(result.items, "docker:build-cache");

    expect(result.skipped).toBeNull();
    expect(buildCache.bytes).toBeNull();
    expect(buildCache.due).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("[hygiene-docker]"));
  });

  it("omits the volumes item and never inspects when all volumes are referenced", async () => {
    const fixture = volumeFixture(["bound_vol   1         1.2GB"]);
    const { exec, calls } = fakeExec((args) => {
      if (args[0] === "system") return { stdout: fixture };
      throw new Error(`unexpected docker command: ${args.join(" ")}`);
    });

    const result = await runDockerProbe(makeOptions(), { exec });

    expect(result.items.map((item) => item.id)).toEqual(["docker:images", "docker:build-cache"]);
    expect(itemById(result.items, "docker:images").bytes).toBe(0);
    expect(itemById(result.items, "docker:images").due).toBe(false);
    expect(itemById(result.items, "docker:build-cache").bytes).toBe(0);
    expect(itemById(result.items, "docker:build-cache").due).toBe(false);
    expect(calls.filter((call) => call.args[0] === "volume")).toHaveLength(0);
    expect(calls.filter((call) => call.args.join(" ") === "system df")).toHaveLength(0);
  });

  it("inspects at most 25 volumes with concurrency 8", async () => {
    const rows = Array.from(
      { length: 30 },
      (_, index) => `vol_${String(index).padStart(2, "0")}   0     1MB`,
    );
    const fixture = volumeFixture(rows);
    let active = 0;
    let maxActive = 0;
    const { exec, calls } = fakeExec(async (args) => {
      if (args[0] === "system") return { stdout: fixture };
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return { stdout: JSON.stringify([{ CreatedAt: "2025-01-01T00:00:00Z" }]) };
    });

    await runDockerProbe(makeOptions(), { exec });

    expect(calls.filter((call) => call.args[0] === "volume")).toHaveLength(25);
    expect(maxActive).toBeGreaterThan(1);
    expect(maxActive).toBeLessThanOrEqual(8);
  });

  it("skips with the error message on unexpected docker failures", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { exec } = fakeExec(() => {
      throw new Error("permission denied while trying to connect to the Docker daemon socket");
    });

    const result = await runDockerProbe(makeOptions(), { exec });

    expect(result.items).toEqual([]);
    expect(result.skipped?.probe).toBe("docker");
    expect(result.skipped?.reason).toContain("permission denied");
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("[hygiene-docker]"));
  });

  it("behaves identically when opts.sizes is false", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const withSizes = await runDockerProbe(makeOptions({ sizes: true }), {
      exec: fakeExec(fullFixtureHandler).exec,
    });
    const withoutSizes = await runDockerProbe(makeOptions({ sizes: false }), {
      exec: fakeExec(fullFixtureHandler).exec,
    });

    expect(withoutSizes).toEqual(withSizes);
  });
});
