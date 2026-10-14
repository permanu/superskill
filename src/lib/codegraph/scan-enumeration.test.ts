import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scanRepo } from "./scan.js";

const git = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", async () => {
  const { promisify } = await import("node:util");
  return { execFile: Object.assign(() => {}, { [promisify.custom]: git }) };
});

let root: string;

beforeEach(async () => {
  git.mockReset();
  root = await mkdtemp(join(tmpdir(), "codegraph-enumeration-"));
  await writeFile(join(root, "visible.ts"), "export const visible = 1;");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("Git enumeration boundary", () => {
  it("uses fixed argv, bounded output and a timeout without invoking a shell", async () => {
    git.mockResolvedValue({ stdout: Buffer.from("visible.ts\0") });
    expect((await scanRepo(root)).stats.files).toBe(1);
    expect(git).toHaveBeenCalledWith("git", ["-c", "core.fsmonitor=false", "ls-files", "-co", "--exclude-standard", "-z", "--", "."], expect.objectContaining({
      cwd: await realpath(root), encoding: "buffer", timeout: 5_000, maxBuffer: 8_000_000,
    }));
    expect(git.mock.calls[0][2].shell).toBeUndefined();
    expect(git.mock.calls[0][2].env.GIT_DIR).toBeUndefined();
  });

  it.each(["ETIMEDOUT", "ENOENT", "ERR_CHILD_PROCESS_STDIO_MAXBUFFER"])("fails closed on %s instead of bypassing ignores", async (code) => {
    git.mockRejectedValue(Object.assign(new Error("enumeration failed"), { code }));
    await expect(scanRepo(root)).rejects.toThrow(/unable to enumerate non-ignored/);
  });

  it("rejects malformed or non-UTF-8 path lists", async () => {
    for (const stdout of [Buffer.from("visible.ts"), Buffer.from([0xff, 0x00])]) {
      git.mockResolvedValue({ stdout });
      await expect(scanRepo(root)).rejects.toThrow(/unable to enumerate non-ignored/);
    }
  });

  it("falls back only for the Git not-a-repository diagnostic", async () => {
    git.mockRejectedValue(Object.assign(new Error("not a repository"), { code: 128, stderr: "fatal: not a git repository (or any of the parent directories): .git" }));
    expect((await scanRepo(root)).stats.files).toBe(1);
  });
});
