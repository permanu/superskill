import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { createScopedCtx } from "../src/app-context.js";
import { searchCommand } from "../src/commands/search.js";
import { pruneCommand } from "../src/commands/prune.js";
import { resumeCommand } from "../src/commands/resume.js";
import { taskCommand } from "../src/commands/task.js";
import { learnCommand } from "../src/commands/learn.js";
import { ticketsCommand } from "../src/commands/tickets.js";
import { evidenceCommand } from "../src/commands/evidence.js";
import { contextCommand } from "../src/commands/context.js";
import { sessionCommand } from "../src/commands/session.js";
import { telemetryCommand } from "../src/commands/telemetry.js";
import { watchdogCommand } from "../src/commands/watchdog.js";
import { worktreeApplyCommand } from "../src/commands/worktree/apply.js";
import { worktreeGcCommand } from "../src/commands/worktree/gc.js";
import { worktreeEnvCommand } from "../src/commands/worktree/env.js";
import { activateSkills } from "../src/commands/skill/activate.js";

const vault = vi.hoisted(() => ({ read: vi.fn(), list: vi.fn() }));

vi.mock("../src/app-context.js", () => ({
  createScopedCtx: vi.fn(async () => ({ vaultFs: vault })),
  createCtx: vi.fn(async () => ({ vaultFs: vault })),
}));
vi.mock("../src/commands/search.js", () => ({ searchCommand: vi.fn(async () => []) }));
vi.mock("../src/commands/prune.js", () => ({
  pruneCommand: vi.fn(async () => []), statsCommand: vi.fn(), deprecateCommand: vi.fn(),
}));
vi.mock("../src/commands/resume.js", () => ({
  resumeCommand: vi.fn(async () => ({})), formatResumeContext: vi.fn(() => "resume"),
}));
vi.mock("../src/commands/task.js", () => ({ taskCommand: vi.fn(async () => ({ tasks: [], board: {} })) }));
vi.mock("../src/commands/learn.js", () => ({ learnCommand: vi.fn(async () => ({ learnings: [] })) }));
vi.mock("../src/commands/tickets.js", () => ({ ticketsCommand: vi.fn(async () => ({ tickets: [], board: {}, ready: [] })) }));
vi.mock("../src/commands/evidence.js", () => ({ evidenceCommand: vi.fn(async () => ({ evidence: [] })) }));
vi.mock("../src/commands/context.js", () => ({ contextCommand: vi.fn(async () => ({ context_md: "context" })) }));
vi.mock("../src/commands/session.js", () => ({ sessionCommand: vi.fn(async () => ({})) }));
vi.mock("../src/commands/telemetry.js", () => ({ telemetryCommand: vi.fn(async () => ({ message: "telemetry" })) }));
vi.mock("../src/commands/watchdog.js", () => ({ watchdogCommand: vi.fn(async () => ({ action: "dig", rendered: "watchdog" })) }));
vi.mock("../src/commands/worktree/apply.js", () => ({
  worktreeApplyCommand: vi.fn(async () => ({})), renderWorktreeApply: vi.fn(() => "apply"),
}));
vi.mock("../src/commands/worktree/gc.js", () => ({
  worktreeGcCommand: vi.fn(async () => ({})), renderWorktreeGc: vi.fn(() => "gc"),
}));
vi.mock("../src/commands/worktree/env.js", () => ({
  worktreeEnvCommand: vi.fn(async () => ({})), renderWorktreeEnv: vi.fn(() => "env"),
}));
vi.mock("../src/commands/skill/activate.js", () => ({
  activateSkills: vi.fn(), compactActivationResult: vi.fn(),
}));

let createProgram: typeof import("../src/cli.js").createProgram;
let listenersAdded = 0;
let previousExitCode: typeof process.exitCode;

beforeAll(async () => {
  const before = process.listenerCount("unhandledRejection");
  ({ createProgram } = await import("../src/cli.js"));
  listenersAdded = process.listenerCount("unhandledRejection") - before;
});

beforeEach(() => {
  previousExitCode = process.exitCode;
  process.exitCode = undefined;
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  vault.read.mockResolvedValue("a".repeat(100));
  vault.list.mockResolvedValue(["a.md"]);
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = previousExitCode;
});

async function run(args: string[]): Promise<void> {
  await createProgram().exitOverride().parseAsync(args, { from: "user" });
}

describe("CLI audit regressions", () => {
  it("has no process-wide rejection listener when imported", () => {
    expect(listenersAdded).toBe(0);
  });

  it.each(["3junk", "2.5", "Infinity", "NaN", "", " "])("rejects a non-integer limit %j before creating context", async (limit) => {
    await run(["search", "query", "--limit", limit]);
    expect(searchCommand).not.toHaveBeenCalled();
    expect(createScopedCtx).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("honors a zero search limit", async () => {
    await run(["search", "query", "--limit", "0"]);
    expect(searchCommand).toHaveBeenCalledWith(expect.objectContaining({ limit: 0 }), expect.anything());
  });

  it.each([
    ["list", ".", "--depth", "2.5"],
    ["read", "a.md", "--depth", "1tail"],
    ["read", "a.md", "--max-bytes", "2.5"],
    ["context", "--max-tokens", "255"],
    ["resume", "--limit", "3tail"],
    ["task", "list", "--limit", "-1"],
    ["graph", "related", "note.md", "--hops", "1tail"],
    ["graph", "children", "rules", "--limit", "1tail"],
    ["graph", "resolve", "task", "--limit", "2.5"],
    ["graph", "cross-project", "query", "--limit", "2.5"],
    ["prune", "--sessions", "30days"],
    ["prune", "--done-tasks", "2.5"],
    ["evidence", "add", "ticket-001", "--command", "test", "--exit", "0junk"],
    ["worktree", "gc", "--keep-latest", "2.5"],
    ["watchdog", "dig", "--count", "2.5"],
    ["telemetry", "report", "--top", "2.5"],
    ["skill", "activate", "task", "--max-tokens", "500.5"],
  ])("validates numeric flags without truncating %j", async (...args) => {
    await run(args);
    expect(process.exitCode).toBe(1);
    expect(createScopedCtx).not.toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("honors zero retention days", async () => {
    await run(["prune", "--sessions", "0", "--done-tasks", "0"]);
    expect(pruneCommand).toHaveBeenCalledWith(expect.objectContaining({ policy: { sessions: 0, doneTasks: 0 } }), expect.anything());
  });

  it.each([["0", 1], ["1000", 200]])("shares resume clamping for %s", async (raw, limit) => {
    await run(["resume", "--limit", raw, "--json"]);
    expect(resumeCommand).toHaveBeenCalledWith(expect.objectContaining({ limit }), expect.anything());
  });

  it.each([
    [["task", "list"], taskCommand],
    [["task", "board"], taskCommand],
    [["learn", "list"], learnCommand],
    [["tickets", "list"], ticketsCommand],
    [["tickets", "board"], ticketsCommand],
    [["tickets", "ready"], ticketsCommand],
    [["evidence", "list", "ticket-001"], evidenceCommand],
  ] as const)("exposes bounded list limits for %j", async (args, handler) => {
    await run([...args]);
    expect(handler).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 50 }), expect.anything());
    await run([...args, "--limit", "0"]);
    expect(handler).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 0 }), expect.anything());
    await run([...args, "--limit", "900"]);
    expect(handler).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 500 }), expect.anything());
  });

  it("exposes the context token budget", async () => {
    await run(["context", "--max-tokens", "800"]);
    expect(contextCommand).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: 800 }), expect.anything());
  });

  it("exposes bounded file reads", async () => {
    await run(["read", "a.md", "--max-bytes", "10"]);
    expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining("truncated"));
  });

  it("exposes directory read depth", async () => {
    vault.read.mockRejectedValueOnce(Object.assign(new Error("directory"), { code: "EISDIR" }));
    await run(["read", "notes", "--depth", "3"]);
    expect(vault.list).toHaveBeenCalledWith("notes", 3);
    expect(process.exitCode).toBeUndefined();
  });

  it("exposes complete session details", async () => {
    await run(["session", "complete", "opencode-test", "--completed", "fixed", "--commands-to-resume", "npm test"]);
    expect(sessionCommand).toHaveBeenCalledWith(expect.objectContaining({ completed: ["fixed"], commandsToResume: ["npm test"] }), expect.anything());
  });

  it("exposes task sprint and learning session metadata", async () => {
    await run(["task", "add", "task", "--sprint", "sprint-1"]);
    expect(taskCommand).toHaveBeenLastCalledWith(expect.objectContaining({ action: "add", sprint: "sprint-1" }), expect.anything());
    await run(["task", "update", "task-001", "--sprint", "sprint-2"]);
    expect(taskCommand).toHaveBeenLastCalledWith(expect.objectContaining({ action: "update", sprint: "sprint-2" }), expect.anything());
    await run(["learn", "add", "--title", "lesson", "--discovery", "found", "--session-id", "opencode-test"]);
    expect(learnCommand).toHaveBeenLastCalledWith(expect.objectContaining({ sessionId: "opencode-test" }), expect.anything());
  });

  it("exposes worktree-local undo through the existing apply command", async () => {
    await run(["worktree", "apply", "--undo", "journal-1", "--yes", "--json"]);
    expect(worktreeApplyCommand).toHaveBeenCalledWith(expect.objectContaining({ undo: "journal-1", yes: true }), expect.anything());
  });

  it("forwards explicit GC restore consent and purge journal selection", async () => {
    await run(["worktree", "gc", "--undo", "restore-1", "--yes", "--json"]);
    expect(worktreeGcCommand).toHaveBeenLastCalledWith(expect.objectContaining({ undo: "restore-1", yes: true }), expect.anything());
    await run(["worktree", "gc", "--purge", "--journal-id", "selected-1", "--json"]);
    expect(worktreeGcCommand).toHaveBeenLastCalledWith(expect.objectContaining({ purge: true, journalId: "selected-1" }), expect.anything());
  });

  it.each(["1", "30000"])("forwards a bounded environment timeout %s", async (timeout) => {
    await run(["worktree", "env", "--timeout-ms", timeout, "--json"]);
    expect(worktreeEnvCommand).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: Number(timeout) }), expect.anything());
  });

  it.each(["0", "-1", "30001", "1.5", "10ms", "Infinity", " "])("rejects invalid environment timeout %j before probing", async (timeout) => {
    await run(["worktree", "env", "--timeout-ms", timeout]);
    expect(worktreeEnvCommand).not.toHaveBeenCalled();
    expect(createScopedCtx).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it.each(["enable", "disable", "clear"])("requires explicit telemetry %s authorization", async (action) => {
    await run(["telemetry", action]);
    expect(telemetryCommand).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    await run(["telemetry", action, "--confirm"]);
    expect(telemetryCommand).toHaveBeenCalledWith(expect.objectContaining({ action, confirm: true }), expect.anything());
  });

  it("requires cross-project watchdog authorization and exposes prompt consent", async () => {
    await run(["watchdog", "dig", "--all-projects"]);
    expect(watchdogCommand).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    await run(["watchdog", "dig", "--all-projects", "--confirm", "--include-prompts"]);
    expect(watchdogCommand).toHaveBeenCalledWith(expect.objectContaining({ allProjects: true, confirm: true, includePrompts: true }), expect.anything());
  });

  it.each(["denied", undefined])("stops failed activation before printing normal success output (%s)", async (error) => {
    vi.mocked(activateSkills).mockResolvedValueOnce({ success: false, error, warnings: [], skills_loaded: [{ id: "x", source: "catalog" }] } as never);
    await run(["skill", "activate", "task"]);
    expect(process.exitCode).toBe(1);
    expect(process.exit).not.toHaveBeenCalled();
    expect(process.stdout.write).not.toHaveBeenCalled();
    expect(process.stderr.write).not.toHaveBeenCalledWith(expect.stringContaining("Loaded"));
  });

  it("does not install a process.exit or raw-stack failure handler in either entrypoint", async () => {
    for (const file of ["../src/cli.ts", "../src/main.ts"]) {
      const source = await readFile(new URL(file, import.meta.url), "utf-8");
      expect(/process\.exit\(/.test(source)).toBe(false);
      expect(source).not.toContain('console.error("superskill failed to start:", e)');
    }
  });
});
