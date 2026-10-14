import type { Dirent } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_HYGIENE_POLICY } from "../policy.js";
import type { HygieneProbeOptions } from "../types.js";
import type { GcCandidate } from "../../worktree/gc.js";
import { cachesProbe, runCachesProbe } from "./caches.js";
import { dockerProbe, parseDfVerboseTables, parseHumanSize, runDockerProbe, type DockerExec } from "./docker.js";
import { runXcodeProbe, xcodeProbe, type XcodeExec } from "./xcode.js";

const mocks = vi.hoisted(() => ({
  stat: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  lstat: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  readdir: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  realpath: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  mkdir: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  writeFile: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  rename: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  rm: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  home: vi.fn<() => string>(),
  cacheRoot: vi.fn<() => string>(),
  repoState: vi.fn<(repo: string) => Promise<string>>(),
  scan: vi.fn<(...args: unknown[]) => Promise<GcCandidate[]>>(),
  contained: vi.fn<(path: string, root: string) => Promise<boolean>>(),
  size: vi.fn<(...args: unknown[]) => Promise<number | null>>(),
  age: vi.fn<(...args: unknown[]) => Promise<number | null>>(),
  exec: vi.fn<(command: string, args: string[], opts: Record<string, unknown>) => Promise<{ stdout: string; stderr?: string }>>(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  for (const key of ["stat", "lstat", "readdir", "realpath", "mkdir", "writeFile", "rename", "rm"] as const) {
    mocks[key].mockImplementation((...args) => Reflect.apply(actual[key], actual, args));
  }
  return { ...actual, stat: mocks.stat, lstat: mocks.lstat, readdir: mocks.readdir, realpath: mocks.realpath, mkdir: mocks.mkdir, writeFile: mocks.writeFile, rename: mocks.rename, rm: mocks.rm };
});

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  mocks.home.mockImplementation(actual.homedir);
  return { ...actual, homedir: mocks.home };
});

vi.mock("node:child_process", async () => {
  const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
  const execFile = Object.assign(vi.fn(), { [Symbol.for("nodejs.util.promisify.custom")]: mocks.exec });
  return { ...actual, execFile };
});

vi.mock("../../worktree/audit.js", () => ({ probeDirSize: mocks.size, probeDirAge: mocks.age }));

vi.mock("../../worktree/gc.js", async () => {
  const actual = await vi.importActual<typeof import("../../worktree/gc.js")>("../../worktree/gc.js");
  return { ...actual, scanCacheRoot: mocks.scan };
});

vi.mock("../../worktree/paths.js", async () => {
  const actual = await vi.importActual<typeof import("../../worktree/paths.js")>("../../worktree/paths.js");
  mocks.cacheRoot.mockImplementation(actual.platformCacheRoot);
  mocks.repoState.mockImplementation(actual.repoStateDir);
  return { ...actual, platformCacheRoot: mocks.cacheRoot, repoStateDir: mocks.repoState };
});

vi.mock("../../worktree/quarantine.js", async () => {
  const actual = await vi.importActual<typeof import("../../worktree/quarantine.js")>("../../worktree/quarantine.js");
  mocks.contained.mockImplementation(actual.isPhysicallyContained);
  return { ...actual, isPhysicallyContained: mocks.contained };
});

const actualFs = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
const actualQuarantine = await vi.importActual<typeof import("../../worktree/quarantine.js")>("../../worktree/quarantine.js");
const temporaryRoot = join(tmpdir(), "opencode");
const now = Date.UTC(2026, 9, 14);
let root: string;
let home: string;
let cacheRoot: string;

function options(overrides: Partial<HygieneProbeOptions> = {}): HygieneProbeOptions {
  return { repoPaths: [], sizes: false, policy: { ...DEFAULT_HYGIENE_POLICY }, now, ...overrides };
}

function errno(code: string): Error & { code: string } {
  return Object.assign(new Error(`fixture ${code}`), { code });
}

function candidate(overrides: Partial<GcCandidate> = {}): GcCandidate {
  return { path: join(cacheRoot, "repo", "go-build"), repoId: "repo", tool: "go", bytes: 1024, ageDays: 40, tier: "auto", ...overrides };
}

function entry(name: string, directory = true): Dirent {
  return { name, isDirectory: () => directory } as Dirent;
}

function readOnlyDocker(handler: (args: string[]) => Promise<{ stdout: string; stderr?: string }> | { stdout: string; stderr?: string }): DockerExec {
  return vi.fn(async (command: string, args: string[]) => {
    expect(command).toBe("docker");
    expect(args[0] === "system" && args[1] === "df" || args[0] === "volume" && args[1] === "inspect").toBe(true);
    expect(args.some((arg) => ["prune", "rm", "rmi"].includes(arg))).toBe(false);
    return handler(args);
  });
}

beforeEach(async () => {
  await actualFs.mkdir(temporaryRoot, { recursive: true, mode: 0o700 });
  root = await actualFs.mkdtemp(join(temporaryRoot, "hygiene-edge-"));
  home = join(root, "home");
  cacheRoot = join(root, "cache");
  await actualFs.mkdir(home);
  await actualFs.mkdir(cacheRoot);
  for (const key of ["stat", "lstat", "readdir", "realpath", "mkdir", "writeFile", "rename", "rm"] as const) {
    mocks[key].mockReset().mockImplementation((...args) => Reflect.apply(actualFs[key], actualFs, args));
  }
  mocks.home.mockReset().mockReturnValue(home);
  mocks.cacheRoot.mockReset().mockReturnValue(cacheRoot);
  mocks.repoState.mockReset().mockImplementation(async (repo) => join(root, "metadata", basename(repo)));
  mocks.contained.mockReset().mockImplementation(actualQuarantine.isPhysicallyContained);
  mocks.scan.mockReset().mockResolvedValue([]);
  mocks.size.mockReset().mockResolvedValue(null);
  mocks.age.mockReset().mockResolvedValue(50);
  mocks.exec.mockReset().mockRejectedValue(new Error("unexpected native process"));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  try {
    for (const key of ["mkdir", "writeFile", "rename", "rm"] as const) expect(mocks[key]).not.toHaveBeenCalled();
    for (const [command, args] of mocks.exec.mock.calls) {
      expect(["docker", "xcrun"]).toContain(command);
      expect(args.some((arg) => ["prune", "rm", "rmi", "delete"].includes(arg))).toBe(false);
    }
  } finally {
    vi.restoreAllMocks();
    await actualFs.rm(root, { recursive: true, force: true });
  }
});

describe("cache report uncertainty and bounds", () => {
  it("never recommends actions for unknown or glob-bearing managed paths", async () => {
    mocks.scan.mockResolvedValue([
      candidate({ path: join(root, "outside"), tool: "unknown", ageDays: null }),
      candidate({ path: cacheRoot, tool: "unknown" }),
      candidate({ path: join(cacheRoot, "repo", "go-build-[user]") }),
      candidate({ path: join(cacheRoot, "repo", "go-build-orphan"), orphaned: true }),
      candidate({ path: join(cacheRoot, "repo", "go-build-$`\"\\") }),
    ]);
    const report = await cachesProbe.run(options());
    expect(report.items.slice(0, 3).every((item) => item.plan === null)).toBe(true);
    expect(report.items[0]).toMatchObject({ due: false, reason: expect.stringContaining("unknown age") });
    expect(report.items[3].reason).toContain("orphaned worktree cache");
    expect(report.items[4].plan).toContain("go-build-\\$\\`\\\"\\\\");
    expect(mocks.scan).toHaveBeenCalledWith(expect.objectContaining({ all: true, maxCandidates: 60, measureSizes: false }));
  });

  it("prioritizes due, size and known-age candidates before enforcing its cap", async () => {
    const candidates = Array.from({ length: 70 }, (_, index) => candidate({
      path: join(cacheRoot, "repo", `go-build-${String(index).padStart(2, "0")}`),
      bytes: index % 4 === 0 ? null : index % 3,
      ageDays: index % 5 === 0 ? null : index % 2 === 0 ? 80 : 40,
      tier: index % 3 === 0 ? "consent" : "auto",
    }));
    mocks.scan.mockResolvedValue(candidates.reverse());
    const report = await runCachesProbe(options({ sizes: true }), { platform: "win32" });
    expect(report.items).toHaveLength(60);
    const firstNotDue = report.items.findIndex((item) => !item.due);
    expect(firstNotDue).toBeGreaterThan(0);
    expect(report.items.slice(firstNotDue).every((item) => !item.due)).toBe(true);
    expect(report.items.slice(0, firstNotDue).map((item) => item.bytes ?? -1)).toEqual(report.items.slice(0, firstNotDue).map((item) => item.bytes ?? -1).sort((a, b) => b - a));
  });

  it("deduplicates retained repository state, preserves payload and only offers a purge preview", async () => {
    const metadata = join(root, "metadata", "shared");
    await actualFs.mkdir(metadata, { recursive: true });
    await actualFs.writeFile(join(metadata, "journal.jsonl"), "retained recovery data\n");
    mocks.repoState.mockResolvedValue(metadata);
    const report = await runCachesProbe(options({ repoPaths: ["/one", "/two"], sizes: false }), { platform: "win32" });
    expect(report.items).toHaveLength(1);
    expect(report.items[0]).toMatchObject({ bytes: null, tier: "review", due: false, path: metadata });
    expect(report.items[0].plan).toContain("--purge");
    expect(report.items[0].plan).not.toContain("--yes");
    expect(await actualFs.readFile(join(metadata, "journal.jsonl"), "utf-8")).toBe("retained recovery data\n");
  });

  it("skips files and symlinked retention directories without touching their targets", async () => {
    const external = join(root, "external");
    await actualFs.mkdir(external);
    await actualFs.writeFile(join(external, "keep"), "user data");
    await actualFs.symlink(external, join(cacheRoot, "_quarantine"));
    const metadata = join(root, "metadata-file");
    await actualFs.writeFile(metadata, "not a directory");
    mocks.repoState.mockResolvedValue(metadata);
    const report = await runCachesProbe(options({ repoPaths: ["/repo"] }), { platform: "win32" });
    expect(report.items).toEqual([]);
    expect(await actualFs.readFile(join(external, "keep"), "utf-8")).toBe("user data");
  });

  it.each([errno("EACCES"), "unknown filesystem failure"])("reports unexpected retention failures without widening cleanup: %j", async (failure) => {
    mocks.lstat.mockRejectedValue(failure);
    const report = await runCachesProbe(options(), { platform: "win32" });
    expect(report.items).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("cannot inspect retention path"));
  });

  it("keeps other cache sources when repository state discovery fails", async () => {
    mocks.repoState.mockRejectedValue("state unavailable");
    mocks.scan.mockResolvedValue([candidate()]);
    const report = await runCachesProbe(options({ repoPaths: ["/repo"] }), { platform: "win32" });
    expect(report.items).toHaveLength(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("retention scan failed: state unavailable"));
  });

  it("retains useful default cache results when managed scanning rejects a primitive", async () => {
    await actualFs.mkdir(join(home, ".cache", "pip"), { recursive: true });
    mocks.scan.mockRejectedValue("managed unavailable");
    const report = await runCachesProbe(options(), { platform: "linux" });
    expect(report.items).toMatchObject([{ plan: "pip cache purge", meta: { managed: false } }]);
    expect(report.skipped).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("managed unavailable"));
  });

  it.each([errno("ENOENT"), errno("EACCES")])("quietly skips inaccessible default roots: %j", async (failure) => {
    mocks.readdir.mockRejectedValue(failure);
    const report = await runCachesProbe(options(), { platform: "linux" });
    expect(report.items).toEqual([]);
    expect(report.skipped).toBeNull();
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each([errno("EIO"), "stat unavailable"])("logs unknown Go module-cache state instead of recommending it: %j", async (failure) => {
    await actualFs.mkdir(join(home, ".cache"));
    mocks.stat.mockRejectedValue(failure);
    const report = await runCachesProbe(options(), { platform: "linux" });
    expect(report.items).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("cannot stat"));
  });

  it("caps native default-cache probes before expensive measurements", async () => {
    const entries = Array.from({ length: 64 }, (_, index) => {
      let bit = 0;
      const name = [..."go-build"].map((letter) => letter === "-" ? letter : index & 1 << bit++ ? letter.toUpperCase() : letter).join("");
      return entry(name);
    });
    expect(new Set(entries.map((item) => item.name)).size).toBe(64);
    mocks.readdir.mockResolvedValue(entries);
    const report = await runCachesProbe(options({ sizes: true }), { platform: "linux" });
    expect(report.items).toHaveLength(40);
    expect(new Set(report.items.map((item) => item.id)).size).toBe(40);
    expect(mocks.size).toHaveBeenCalledTimes(40);
    expect(mocks.age).toHaveBeenCalledTimes(40);
  });

  it("honors expired budgets before repository and default-cache measurements", async () => {
    mocks.readdir.mockResolvedValue([entry("pnpm-store"), entry("go-mod")]);
    const report = await runCachesProbe(options({ repoPaths: ["/repo"], sizes: true, deadline: 0 }), { platform: "linux" });
    expect(report.items).toEqual([]);
    expect(mocks.repoState).not.toHaveBeenCalled();
    expect(mocks.size).not.toHaveBeenCalled();
    expect(mocks.age).not.toHaveBeenCalled();
  });

  it("uses native pruning only for exact default cache names", async () => {
    mocks.readdir.mockResolvedValue([entry("pnpm-store"), entry("go-mod"), entry("ordinary-file", false)]);
    const report = await runCachesProbe(options(), { platform: "linux" });
    expect(report.items.map((item) => item.plan)).toEqual(["go clean -modcache", "pnpm store prune"]);
  });
});

describe("Docker malformed output and read-only failure handling", () => {
  const unknownBuild = "Build cache usage:\nCACHE ID  SIZE\na  2GB\n";
  const volumes = "Local Volumes space usage:\nVOLUME NAME  LINKS  SIZE\ncache  0  2GB\n";

  it.each([["9".repeat(400), null], ["3XB", null], ["1024", 1024]] as const)("handles uncertain size %s", (input, expected) => {
    expect(parseHumanSize(input)).toBe(expected);
  });

  it("skips truncated volume and image records and keeps unparseable build cache unknown", () => {
    const parsed = parseDfVerboseTables([
      "Local Volumes space usage:", "NAME  LINKS  SIZE", "missing-size  0", "bad-size  0  3XB", "good  1  5MB",
      "Images space usage:", "REPOSITORY  TAG  IMAGE ID  CREATED  SIZE", "<none>  <none>", "<none>  <none>  id  yesterday  N/A",
      "Build cache usage:", "CACHE ID  SIZE  RECLAIMABLE", "truncated", "unknown  1GB  N/A",
    ].join("\n"));
    expect(parsed.volumes).toEqual([{ name: "good", links: 1, bytes: 5_000_000 }]);
    expect(parsed.danglingImages).toEqual({ count: 2, bytes: 0 });
    expect(parsed.buildCacheReclaimableBytes).toBeNull();
    expect(parseDfVerboseTables("Local Volumes space usage:\nLINKS  SIZE  VOLUME NAME\n0  1GB\n").volumes).toEqual([]);
  });

  it.each([
    ["", null, 1],
    ["Build Cache  4  0  8GB  2GB", 2_000_000_000, 4],
    ["TYPE  TOTAL  ACTIVE  SIZE  RECLAIMABLE\nBuild Cache", null, 1],
    ["TYPE  TOTAL  ACTIVE  SIZE  RECLAIMABLE\nBuild Cache  N/A  0  8GB  N/A", null, 1],
  ] as const)("keeps summary uncertainty explicit for %j", async (summary, bytes, count) => {
    const report = await runDockerProbe(options(), { exec: readOnlyDocker((args) => ({ stdout: args.length === 3 ? unknownBuild : summary })) });
    const item = report.items.find((entry) => entry.id === "docker:build-cache")!;
    expect(item).toMatchObject({ bytes, due: bytes !== null && bytes >= 1_000_000_000, meta: { count } });
    if (bytes === null) expect(item.reason).toContain("unavailable");
  });

  it.each([null, "not-a-date"])("does not mark volumes due with unusable inspection dates: %j", async (date) => {
    const report = await runDockerProbe(options(), { exec: readOnlyDocker((args) => ({ stdout: args[0] === "system" ? volumes : JSON.stringify(date === null ? [] : [{ CreatedAt: date }]) })) });
    expect(report.items.find((item) => item.id === "docker:volumes")).toMatchObject({ ageDays: null, due: false, tier: "review", reason: expect.stringContaining("age unknown") });
  });

  it("does not infer age when the supplied clock is non-finite", async () => {
    const report = await runDockerProbe(options({ now: Number.NaN }), { exec: readOnlyDocker((args) => ({ stdout: args[0] === "system" ? volumes : '[{"CreatedAt":"2020-01-01T00:00:00Z"}]' })) });
    expect(report.items.find((item) => item.id === "docker:volumes")).toMatchObject({ ageDays: null, due: false });
  });

  it("preserves incomplete build-cache results if the CLI disappears during fallback", async () => {
    const report = await runDockerProbe(options(), { exec: readOnlyDocker((args) => {
      if (args.length === 3) return { stdout: unknownBuild };
      throw errno("ENOENT");
    }) });
    expect(report.skipped).toBeNull();
    expect(report.items.find((item) => item.id === "docker:build-cache")).toMatchObject({ bytes: null, due: false, reason: expect.stringContaining("unavailable") });
  });

  it.each(["bridge unavailable", { code: "EIO", message: 7, stdout: "partial", stderr: "details" }])("returns a safe diagnostic for malformed native failures: %j", async (failure) => {
    const report = await runDockerProbe(options(), { exec: readOnlyDocker(() => { throw failure; }) });
    expect(report.items).toEqual([]);
    expect(report.skipped).toMatchObject({ probe: "docker", reason: expect.stringContaining("failed") });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("docker system df -v failed"));
  });

  it("reports unexpected binary CLI output as incomplete instead of proposing cleanup", async () => {
    const report = await runDockerProbe(options(), { exec: readOnlyDocker(() => ({ stdout: Buffer.from("partial table") as unknown as string })) });
    expect(report.items).toEqual([]);
    expect(report.skipped?.reason).toContain("docker probe failed");
  });

  it("does not start native commands after an expired budget", async () => {
    const exec = readOnlyDocker(() => ({ stdout: "" }));
    const report = await runDockerProbe(options({ deadline: 0 }), { exec });
    expect(exec).not.toHaveBeenCalled();
    expect(report.items).toEqual([]);
    expect(report.skipped?.reason).toContain("time budget");
  });

  it("uses the read-only native adapter and clamps its timeout to the remaining budget", async () => {
    vi.spyOn(Date, "now").mockReturnValue(now);
    mocks.exec.mockResolvedValue({ stdout: "", stderr: "" });
    const report = await dockerProbe.run(options({ deadline: now + 25 }));
    expect(report.items.every((item) => !item.due)).toBe(true);
    expect(mocks.exec).toHaveBeenCalledWith("docker", ["system", "df", "-v"], expect.objectContaining({ timeout: 25 }));
  });
});

describe("Xcode probe safe skips and preview boundaries", () => {
  const quietExec: XcodeExec = async () => ({ stdout: '{"devices":{}}' });

  it.each([null, {}, { devices: null }, { devices: [] }, { devices: { runtime: "truncated" } }])("keeps malformed simulator data out of recommendations: %j", async (payload) => {
    const report = await runXcodeProbe(options(), { platform: "darwin", home, exec: async () => ({ stdout: JSON.stringify(payload) }) });
    expect(report.items).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("cannot read simctl output"));
  });

  it("ignores primitive simulator records and available/unknown devices", async () => {
    const report = await runXcodeProbe(options(), { platform: "darwin", home, exec: async () => ({ stdout: '{"devices":{"runtime":[null,7,"bad",{}, {"isAvailable":true}]}}' }) });
    expect(report.items).toEqual([]);
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each([errno("EACCES"), errno("ENOTDIR")])("silently skips known inaccessible filesystem paths: %j", async (failure) => {
    mocks.stat.mockRejectedValue(failure);
    mocks.readdir.mockRejectedValue(failure);
    const report = await runXcodeProbe(options(), { platform: "darwin", home, exec: quietExec });
    expect(report.items).toEqual([]);
    expect(report.skipped).toBeNull();
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each([errno("EIO"), "filesystem unavailable"])("reports unexpected filesystem failures without collateral actions: %j", async (failure) => {
    mocks.stat.mockRejectedValue(failure);
    const report = await runXcodeProbe(options(), { platform: "darwin", home, exec: quietExec });
    expect(report.items).toEqual([]);
    expect(report.skipped?.reason).toContain("xcode probe failed");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("[hygiene-xcode] probe failed"));
  });

  it("reports unexpected DeviceSupport enumeration failures", async () => {
    mocks.readdir.mockRejectedValue(errno("EIO"));
    const report = await runXcodeProbe(options(), { platform: "darwin", home, exec: quietExec });
    expect(report.items).toEqual([]);
    expect(report.skipped?.reason).toContain("EIO");
  });

  it.each([null, 0, -1])("does not mark uncertain or empty DerivedData due: %j", async (bytes) => {
    await actualFs.mkdir(join(home, "Library", "Developer", "Xcode", "DerivedData"), { recursive: true });
    mocks.size.mockResolvedValue(bytes);
    const report = await runXcodeProbe(options({ sizes: true }), { platform: "darwin", home, exec: quietExec });
    if (bytes === null) expect(report.items).toMatchObject([{ bytes: null, due: false, reason: expect.stringContaining("size unavailable") }]);
    else expect(report.items).toEqual([]);
  });

  it("compares unequal version lengths and excludes non-directory DeviceSupport entries", async () => {
    const support = join(home, "Library", "Developer", "Xcode", "iOS DeviceSupport");
    for (const version of ["17.0.1", "17.0", "17.0.0"]) await actualFs.mkdir(join(support, version), { recursive: true });
    await actualFs.writeFile(join(support, "16.0"), "not a support directory");
    const report = await runXcodeProbe(options(), { platform: "darwin", home, exec: quietExec });
    expect(report.items.map((item) => item.meta.version).sort()).toEqual(["17.0", "17.0.0"]);
    expect(report.items.every((item) => item.meta.newest === "17.0.1")).toBe(true);
    expect(await actualFs.readFile(join(support, "16.0"), "utf-8")).toBe("not a support directory");
  });

  it("does not recommend the only available DeviceSupport version", async () => {
    await actualFs.mkdir(join(home, "Library", "Developer", "Xcode", "iOS DeviceSupport", "17.0"), { recursive: true });
    const report = await runXcodeProbe(options(), { platform: "darwin", home, exec: quietExec });
    expect(report.items).toEqual([]);
  });

  it.each([errno("EACCES"), "simctl bridge failed"])("does not let simulator-command failure authorize deletion: %j", async (failure) => {
    const report = await runXcodeProbe(options(), { platform: "darwin", home, exec: async () => { throw failure; } });
    expect(report.items).toEqual([]);
    if (failure instanceof Error) expect(console.error).not.toHaveBeenCalled();
    else expect(console.error).toHaveBeenCalledWith(expect.stringContaining("simctl bridge failed"));
  });

  it("stops simulator commands and DeviceSupport measurements when the budget has expired", async () => {
    const support = join(home, "Library", "Developer", "Xcode", "iOS DeviceSupport");
    await actualFs.mkdir(join(support, "16.0"), { recursive: true });
    await actualFs.mkdir(join(support, "17.0"), { recursive: true });
    const exec = vi.fn<XcodeExec>().mockResolvedValue({ stdout: '{"devices":{}}' });
    const report = await runXcodeProbe(options({ sizes: true, deadline: 0 }), { platform: "darwin", home, exec });
    expect(report.items).toEqual([]);
    expect(exec).not.toHaveBeenCalled();
    expect(mocks.size).not.toHaveBeenCalled();
  });

  it("uses only native simulator listing through the default probe adapter", async () => {
    vi.spyOn(Date, "now").mockReturnValue(now);
    mocks.exec.mockResolvedValue({ stdout: '{"devices":{}}' });
    const report = await xcodeProbe.run(options({ deadline: now + 25 }));
    expect(report.items).toEqual([]);
    if (process.platform === "darwin") expect(mocks.exec).toHaveBeenCalledWith("xcrun", ["simctl", "list", "devices", "-j"], expect.objectContaining({ timeout: 25 }));
    else expect(mocks.exec).not.toHaveBeenCalled();
  });

  it("bounds the native macOS adapter when the platform is explicitly selected", async () => {
    vi.spyOn(Date, "now").mockReturnValue(now);
    mocks.exec.mockResolvedValue({ stdout: '{"devices":{}}' });
    const report = await runXcodeProbe(options({ deadline: now + 25 }), { platform: "darwin" });
    expect(report.items).toEqual([]);
    expect(mocks.exec).toHaveBeenCalledWith("xcrun", ["simctl", "list", "devices", "-j"], expect.objectContaining({ timeout: 25 }));
  });
});
