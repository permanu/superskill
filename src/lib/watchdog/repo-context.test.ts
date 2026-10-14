import { afterEach, expect, it, vi } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, open, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { constants, realpathSync } from "node:fs";
import { promisify } from "node:util";
import { collectRepoContext, collectSteeringFiles } from "./repo-context.js";
import { estimateTokens } from "../token-estimator.js";
import { detectSteering } from "./detectors.js";

vi.mock("node:fs/promises", async importOriginal => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, readFile: vi.fn(original.readFile), open: vi.fn(async (...args: Parameters<typeof original.open>) => {
    const handle = await original.open(...args);
    vi.spyOn(handle, "read");
    return handle;
  }) };
});

let root: string | undefined;
afterEach(async () => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  if (root) await rm(root, { recursive: true, force: true });
});

it("uses the git root and its checks when called from a subdirectory", async () => {
  root = await mkdtemp(join(tmpdir(), "watchdog-repo-root-"));
  vi.stubEnv("HOME", root);
  await promisify(execFile)("git", ["init", "-q", root]);
  await mkdir(join(root, "src", "nested"), { recursive: true });
  await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "vitest" } }));
  await writeFile(join(root, "AGENTS.md"), "one\n两\n");
  const repo = await collectRepoContext(join(root, "src", "nested"));
  expect(repo.root).toBe(realpathSync(root));
  expect(repo.isGit).toBe(true);
  expect(repo.checkScripts).toContain("test");
  expect(repo.steering[0]).toMatchObject({ content: "one\n两\n", lines: 3, truncated: false });
});

it("caps a 2 MiB steering file before decoding and computing prefix-only metrics", async () => {
  root = await mkdtemp(join(tmpdir(), "watchdog-steering-cap-"));
  vi.stubEnv("HOME", root);
  const path = join(root, "AGENTS.md");
  await writeFile(path, `${"界".repeat(700_000)}UNREAD_SUFFIX`);
  const file = (await collectSteeringFiles(root)).find(file => file.path === path)!;
  expect(file).toBeDefined();
  expect(file.truncated).toBe(true);
  expect(Buffer.byteLength(file.content)).toBeLessThanOrEqual(40_000);
  expect(file.content).not.toContain("UNREAD_SUFFIX");
  expect(file.content).not.toContain("\uFFFD");
  expect(file.chars).toBe(file.content.length);
  expect(file.lines).toBe(file.content.split(/\r?\n/).length);
  expect(file.estimatedTokens).toBe(estimateTokens(file.content));
  const findings = detectSteering({ root, isGit: true, scripts: {}, checkScripts: [], hasCi: false, hasPreCommit: false, steering: [file] });
  expect(findings[0].detail).toContain("metrics are incomplete");
  expect(readFile).not.toHaveBeenCalled();
  const index = vi.mocked(open).mock.calls.findIndex(args => args[0] === path);
  expect(index).toBeGreaterThanOrEqual(0);
  expect(vi.mocked(open).mock.calls[index][1]).toBe(constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  const handle = await vi.mocked(open).mock.results[index].value;
  const requested = (vi.mocked(handle.read).mock.calls as unknown[][]).reduce((total, args) => total + Number(args[2]), 0);
  expect(requested).toBeLessThanOrEqual(40_000);
});

it("does not follow a steering-file symlink", async () => {
  root = await mkdtemp(join(tmpdir(), "watchdog-steering-link-"));
  vi.stubEnv("HOME", root);
  const target = join(root, "private.txt");
  await writeFile(target, "not a steering source");
  await symlink(target, join(root, "AGENTS.md"));
  expect((await collectSteeringFiles(root)).filter(file => file.scope === "project")).toEqual([]);
});

it("refuses FIFO and directory steering paths without issuing payload reads", async () => {
  root = await mkdtemp(join(tmpdir(), "watchdog-steering-special-"));
  vi.stubEnv("HOME", root);
  await promisify(execFile)("mkfifo", [join(root, "AGENTS.md")]);
  await mkdir(join(root, "CLAUDE.md"));
  expect((await collectSteeringFiles(root)).filter(file => file.scope === "project")).toEqual([]);
  for (const result of vi.mocked(open).mock.results) {
    try {
      const handle = await result.value;
      expect(handle.read).not.toHaveBeenCalled();
    } catch (err) {
      expect((err as NodeJS.ErrnoException).code).toBe("ENOENT");
    }
  }
}, 2000);
