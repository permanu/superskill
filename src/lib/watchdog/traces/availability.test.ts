import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectTraceSessions, listTraceSessions } from "./index.js";
import { listDirs, listFiles, readJson } from "./source.js";

let root: string;
let oldClaudeRoot: string | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "trace-availability-"));
  oldClaudeRoot = process.env.SUPERSKILL_CLAUDE_PROJECTS;
});

afterEach(async () => {
  if (oldClaudeRoot === undefined) delete process.env.SUPERSKILL_CLAUDE_PROJECTS;
  else process.env.SUPERSKILL_CLAUDE_PROJECTS = oldClaudeRoot;
  await rm(root, { recursive: true, force: true });
});

describe("trace source availability", () => {
  it("keeps genuinely missing directories empty but reports invalid directory and JSON inputs", async () => {
    const missing = join(root, "missing");
    expect(await listDirs(missing)).toEqual([]);
    expect(await listFiles(missing)).toEqual([]);
    expect(await readJson(join(missing, "session.json"))).toBeNull();

    const notDirectory = join(root, "not-directory");
    await writeFile(notDirectory, "private trace payload");
    await expect(listDirs(notDirectory)).rejects.toMatchObject({ code: "ENOTDIR" });
    await expect(listFiles(notDirectory)).rejects.toMatchObject({ code: "ENOTDIR" });
    await expect(readJson(root)).rejects.toMatchObject({ code: "EISDIR" });
    await writeFile(join(root, "corrupt.json"), "private trace payload");
    await expect(readJson(join(root, "corrupt.json"))).rejects.toMatchObject({ code: "INVALID_DATA" });
  });

  it("returns bounded source errors for partial listings and never masks them as zero sessions", async () => {
    const invalidRoot = join(root, "not-a-directory");
    await writeFile(invalidRoot, "private trace payload");
    process.env.SUPERSKILL_CLAUDE_PROJECTS = invalidRoot;

    const result = await collectTraceSessions({ tool: "claude-code" });
    expect(result).toEqual({ sessions: [], sourceErrors: [{ source: "claude-code", code: "ENOTDIR" }] });
    expect(JSON.stringify(result)).not.toContain("private trace payload");
    await expect(listTraceSessions({ tool: "claude-code" })).rejects.toThrow("claude-code:ENOTDIR");
  });

  it("preserves empty listing behavior for an absent harness root", async () => {
    process.env.SUPERSKILL_CLAUDE_PROJECTS = join(root, "missing-root");
    expect(await collectTraceSessions({ tool: "claude-code" })).toEqual({ sessions: [], sourceErrors: [] });
    expect(await listTraceSessions({ tool: "claude-code" })).toEqual([]);
  });
});
