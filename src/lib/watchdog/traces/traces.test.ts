// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chmod, mkdir, mkdtemp, rm, utimes, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { listTraceSessions, loadTraceByRef } from "./index.js";
import { codexSource } from "./codex.js";
import { claudeCodeSource } from "./claude-code.js";
import { opencodeSource } from "./opencode.js";

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, JSON.stringify(value), "utf-8");
}

describe("opencode trace adapter", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "watchdog-oc-"));
    process.env.SUPERSKILL_OPENCODE_DATA = root;
  });

  afterEach(async () => {
    delete process.env.SUPERSKILL_OPENCODE_DATA;
    await rm(root, { recursive: true, force: true });
  });

  async function seed(): Promise<void> {
    await writeJson(join(root, "storage/session/hash1/ses_test123.json"), {
      id: "ses_test123",
      title: "Fix failing tests",
      directory: "/tmp/proj",
      time: { created: 1000, updated: 2000 },
      summary: { additions: 10, deletions: 2, files: 2 },
    });
    await writeJson(join(root, "storage/message/ses_test123/msg_1.json"), {
      id: "msg_1",
      role: "user",
      time: { created: 1 },
    });
    await writeJson(join(root, "storage/message/ses_test123/msg_2.json"), {
      id: "msg_2",
      role: "assistant",
      modelID: "test-model",
      providerID: "test-provider",
      cost: 0.01,
      tokens: { input: 100, output: 50, cache: { read: 10, write: 0 } },
      time: { created: 2 },
    });
    await writeJson(join(root, "storage/part/msg_1/prt_1.json"), { type: "text", text: "fix the failing test" });
    await writeJson(join(root, "storage/part/msg_2/prt_2.json"), {
      type: "tool",
      tool: "bash",
      state: { status: "completed", input: { command: "npm test" }, output: "ok" },
    });
    await writeJson(join(root, "storage/part/msg_2/prt_3.json"), {
      type: "tool",
      tool: "bash",
      state: { status: "error", input: { command: "npm test" }, output: "Error: 1 failed" },
    });
    await writeJson(join(root, "storage/part/msg_2/prt_4.json"), {
      type: "tool",
      tool: "read",
      state: { status: "completed", input: { filePath: "src/a.ts" }, output: "file contents" },
    });
  }

  it("lists sessions and loads a normalized trace", async () => {
    await seed();
    const refs = await listTraceSessions({ tool: "opencode" });
    expect(refs).toHaveLength(1);
    expect(refs[0].title).toBe("Fix failing tests");

    const trace = await loadTraceByRef(refs[0]);
    expect(trace.userTurns).toEqual(["fix the failing test"]);
    expect(trace.toolCalls).toHaveLength(3);
    expect(trace.toolCalls[0].name).toBe("bash");
    expect(trace.toolCalls[1].status).toBe("error");
    expect(trace.toolCalls[2].name).toBe("read");
    expect(trace.filesRead).toContain("src/a.ts");
    expect(trace.commands).toContain("npm test");
    expect(trace.tokens?.input).toBe(100);
    expect(trace.tokens?.output).toBe(50);
    expect(trace.diff).toEqual({ files: 2, additions: 10, deletions: 2 });
  });

  it("filters by since and limit", async () => {
    await seed();
    expect(await listTraceSessions({ tool: "opencode", since: 5000 })).toHaveLength(0);
    expect(await listTraceSessions({ tool: "opencode", limit: 1 })).toHaveLength(1);
  });
});

describe("claude-code trace adapter", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "watchdog-cc-"));
    process.env.SUPERSKILL_CLAUDE_PROJECTS = root;
  });

  afterEach(async () => {
    delete process.env.SUPERSKILL_CLAUDE_PROJECTS;
    await rm(root, { recursive: true, force: true });
  });

  it("parses prompts, tool calls, results, and token usage", async () => {
    const dir = join(root, "-tmp-proj");
    await mkdir(dir, { recursive: true });
    const lines = [
      { type: "user", cwd: "/tmp/proj", message: { role: "user", content: "fix it" } },
      {
        type: "assistant",
        cwd: "/tmp/proj",
        message: {
          role: "assistant",
          model: "claude-test",
          content: [{ type: "tool_use", id: "t1", name: "Bash", input: { command: "npm test" } }],
          usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 2 },
        },
      },
      {
        type: "user",
        message: {
          role: "user",
          content: [{ type: "tool_result", tool_use_id: "t1", is_error: true, content: [{ type: "text", text: "Error: tests failed" }] }],
        },
      },
      { type: "user", isSidechain: true, message: { role: "user", content: "subagent prompt" } },
    ];
    await writeFile(join(dir, "abc.jsonl"), `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`, "utf-8");

    const refs = await listTraceSessions({ tool: "claude-code" });
    expect(refs).toHaveLength(1);
    const trace = await loadTraceByRef(refs[0]);
    expect(trace.userTurns).toEqual(["fix it"]);
    expect(trace.toolCalls).toHaveLength(1);
    expect(trace.toolCalls[0].status).toBe("error");
    expect(trace.toolCalls[0].errorText).toContain("tests failed");
    expect(trace.commands).toContain("npm test");
    expect(trace.model).toBe("claude-test");
    expect(trace.tokens?.input).toBe(10);
    expect(trace.tokens?.cacheRead).toBe(2);
  });
});

describe("codex trace adapter", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "watchdog-cx-"));
    process.env.SUPERSKILL_CODEX_SESSIONS = root;
  });

  afterEach(async () => {
    delete process.env.SUPERSKILL_CODEX_SESSIONS;
    await rm(root, { recursive: true, force: true });
  });

  it("parses rollouts and skips subagent threads", async () => {
    const dir = join(root, "2026", "01", "02");
    await mkdir(dir, { recursive: true });
    const main = [
      { type: "session_meta", payload: { cwd: "/tmp/proj", session_id: "s1" } },
      { type: "response_item", payload: { type: "custom_tool_call", name: "exec", input: "npm test\n", call_id: "c1", status: "completed" } },
      { type: "response_item", payload: { type: "custom_tool_call_output", call_id: "c1", output: [{ type: "input_text", text: "ok" }] } },
      { type: "token_usage_record", payload: { usage: { input_tokens: 20, cached_input_tokens: 5, output_tokens: 7, reasoning_output_tokens: 1 } } },
      { type: "event_msg", payload: { type: "user_message", text: "fix it" } },
    ];
    const sub = [{ type: "session_meta", payload: { cwd: "/tmp/proj", thread_source: "subagent" } }];
    await writeFile(join(dir, "rollout-2026-01-02T03-04-05-main.jsonl"), main.map((l) => JSON.stringify(l)).join("\n"), "utf-8");
    await writeFile(join(dir, "rollout-2026-01-02T03-05-05-sub.jsonl"), sub.map((l) => JSON.stringify(l)).join("\n"), "utf-8");

    const refs = await listTraceSessions({ tool: "codex" });
    expect(refs).toHaveLength(1);
    const trace = await loadTraceByRef(refs[0]);
    expect(trace.userTurns).toEqual(["fix it"]);
    expect(trace.toolCalls).toHaveLength(1);
    expect(trace.toolCalls[0].status).toBe("ok");
    expect(trace.tokens).toEqual({ input: 20, output: 7, cacheRead: 5, cacheWrite: 0, reasoning: 1 });
  });
});

describe("codex trace adapter branch coverage", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "watchdog-cx-branch-"));
    process.env.SUPERSKILL_CODEX_SESSIONS = root;
  });

  afterEach(async () => {
    delete process.env.SUPERSKILL_CODEX_SESSIONS;
    await rm(root, { recursive: true, force: true });
  });

  async function writeRollout(relDir: string, name: string, lines: unknown[]): Promise<string> {
    const dir = join(root, relDir);
    await mkdir(dir, { recursive: true });
    const path = join(dir, name);
    await writeFile(path, lines.map((line) => (typeof line === "string" ? line : JSON.stringify(line))).join("\n") + "\n", "utf-8");
    return path;
  }

  it("lists rollouts across years, skipping non-year dirs and applying since/limit/project filters", async () => {
    await writeRollout("not-a-year", "rollout-2026-01-01T00-00-00-skip.jsonl", [
      { type: "session_meta", payload: { cwd: "/tmp/codex-alpha" } },
    ]);
    await writeRollout("2026/01/01", "rollout-2026-01-01T00-00-00-a.jsonl", [
      { type: "session_meta", payload: { cwd: "/tmp/codex-alpha" } },
    ]);
    const bPath = await writeRollout("2026/02/01", "rollout-2026-02-01T00-00-00-b.jsonl", [
      { type: "session_meta", payload: { cwd: "/tmp/codex-alpha/sub" } },
    ]);
    await writeRollout("2026/03/01", "rollout-2026-03-01T00-00-00-c.jsonl", [
      { type: "session_meta", payload: { cwd: "/tmp/other" } },
    ]);
    const plainPath = await writeRollout("2026/04/01", "plain.jsonl", [{ type: "session_meta", payload: {} }]);
    const invalidPath = await writeRollout("2026/05/01", "rollout-2026-13-40T99-99-99-d.jsonl", [
      { type: "session_meta", payload: { cwd: "/tmp/codex-alpha/deep" } },
    ]);
    const old = new Date("2025-06-01T00:00:00Z");
    await utimes(plainPath, old, old);
    await utimes(invalidPath, old, old);
    await utimes(bPath, new Date("2026-02-02T00:00:00Z"), new Date("2026-02-02T00:00:00Z"));

    const all = await listTraceSessions({ tool: "codex" });
    expect(all.map((ref) => ref.id).sort()).toEqual(["plain", "rollout-2026-01-01T00-00-00-a", "rollout-2026-02-01T00-00-00-b", "rollout-2026-03-01T00-00-00-c", "rollout-2026-13-40T99-99-99-d"]);
    const plain = all.find((ref) => ref.id === "plain");
    expect(plain?.startedAt).toBe(Math.round(old.getTime()));
    expect(plain?.project).toBeUndefined();
    const invalid = all.find((ref) => ref.id === "rollout-2026-13-40T99-99-99-d");
    expect(invalid?.startedAt).toBe(Math.round(old.getTime()));

    const since = await listTraceSessions({ tool: "codex", since: Date.parse("2026-01-15T00:00:00Z") });
    expect(since.map((ref) => ref.id).sort()).toEqual(["rollout-2026-02-01T00-00-00-b", "rollout-2026-03-01T00-00-00-c"]);

    const limited = await listTraceSessions({ tool: "codex", limit: 1 });
    expect(limited).toHaveLength(1);

    const filtered = await listTraceSessions({ tool: "codex", project: "/tmp/codex-alpha" });
    expect(filtered.map((ref) => ref.id).sort()).toEqual([
      "rollout-2026-01-01T00-00-00-a",
      "rollout-2026-02-01T00-00-00-b",
      "rollout-2026-13-40T99-99-99-d",
    ]);

    const excluded = await listTraceSessions({ tool: "codex", project: "/tmp/nonexistent" });
    expect(excluded).toHaveLength(0);
  });

  it("treats an unreadable rollout head as having no cwd", async () => {
    const path = await writeRollout("2026/06/01", "rollout-2026-06-01T00-00-00-lock.jsonl", [
      { type: "session_meta", payload: { cwd: "/tmp/hidden" } },
    ]);
    await chmod(path, 0o000);
    try {
      const refs = await listTraceSessions({ tool: "codex" });
      const ref = refs.find((entry) => entry.id === "rollout-2026-06-01T00-00-00-lock");
      expect(ref).toBeDefined();
      expect(ref?.project).toBeUndefined();
    } finally {
      await chmod(path, 0o600);
    }
  });

  it("normalizes every codex line shape", async () => {
    const lines: unknown[] = [
      { type: "session_meta", payload: { cwd: "/tmp/codex-deep" } },
      { type: "session_meta", payload: { cwd: 42 } },
      { type: "token_usage_record", payload: {} },
      { type: "token_usage_record", payload: { usage: { output_tokens: 5 } } },
      { type: "response_item" },
      { type: "response_item", payload: { type: "custom_tool_call", input: "npm test\n", call_id: "c1", status: "failed" } },
      { type: "response_item", payload: { type: "custom_tool_call", name: "shell", input: "ls\n", call_id: "c2" } },
      { type: "response_item", payload: { type: "custom_tool_call", name: "bash", input: "pwd\n" } },
      { type: "response_item", payload: { type: "custom_tool_call", name: "other", input: "raw text" } },
      { type: "response_item", payload: { type: "function_call", name: "exec", input: { command: "git status" } } },
      { type: "response_item", payload: { type: "function_call", name: "exec", input: { other: "x" } } },
      { type: "response_item", payload: { type: "function_call", input: 42 } },
      { type: "response_item", payload: { type: "custom_tool_call", name: "bash", input: "oops\n", call_id: "c3", status: "failed" } },
      { type: "response_item", payload: { type: "custom_tool_call_output", call_id: "c1", output: "boom" } },
      { type: "response_item", payload: { type: "custom_tool_call_output", call_id: "c3", output: "" } },
      { type: "response_item", payload: { type: "function_call_output", call_id: "c2", output: [{ text: "ok" }, { nope: 1 }] } },
      { type: "response_item", payload: { type: "function_call_output", call_id: "missing", output: 5 } },
      { type: "response_item", payload: { type: "message", role: "user", message: "hello via message" } },
      { type: "response_item", payload: { type: "message", role: "user", content: "hello via content" } },
      { type: "response_item", payload: { type: "message", role: "user", content: [{ text: "one" }, { text: "" }, 5] } },
      { type: "response_item", payload: { type: "message", role: "user", content: [] } },
      { type: "response_item", payload: { type: "message", role: "assistant", text: "ignored" } },
      { type: "response_item", payload: { type: "message", role: "user" } },
      { type: "event_msg", payload: { type: "user_message", text: "event text" } },
      { type: "event_msg", payload: { type: "user_message", text: "" } },
      "",
      "not json",
    ];
    const path = await writeRollout("2026/07/01", "rollout-2026-07-01T00-00-00-deep.jsonl", lines);
    const ref = { tool: "codex" as const, id: "deep", startedAt: 0, updatedAt: 0, storagePath: path };

    const trace = await loadTraceByRef(ref);
    expect(trace.userTurns).toEqual(["hello via message", "hello via content", "one", "event text"]);
    expect(trace.commands).toEqual(["npm test", "ls", "pwd", "git status", "oops"]);
    expect(trace.toolCalls).toHaveLength(8);
    expect(trace.toolCalls[0].name).toBe("exec");
    expect(trace.toolCalls[0].status).toBe("error");
    expect(trace.toolCalls[0].errorText).toBe("boom");
    expect(trace.toolCalls[7].name).toBe("bash");
    expect(trace.toolCalls[7].status).toBe("error");
    expect(trace.toolCalls[7].errorText).toBeUndefined();
    expect(trace.toolCalls[6].inputSummary).toBeUndefined();
    expect(trace.tokens).toEqual({ input: 0, output: 5, cacheRead: 0, cacheWrite: 0, reasoning: 0 });
    expect(trace.truncated).toBe(false);
  });

  it("sets tokens from cache reads only, or not at all", async () => {
    const cachePath = await writeRollout("2026/08/01", "rollout-2026-08-01T00-00-00-cache.jsonl", [
      { type: "session_meta", payload: { cwd: "/tmp/codex-cache" } },
      { type: "token_usage_record", payload: { usage: { cached_input_tokens: 9 } } },
    ]);
    const cacheTrace = await loadTraceByRef({ tool: "codex", id: "cache", startedAt: 0, updatedAt: 0, storagePath: cachePath });
    expect(cacheTrace.tokens).toEqual({ input: 0, output: 0, cacheRead: 9, cacheWrite: 0, reasoning: 0 });

    const barePath = await writeRollout("2026/08/02", "rollout-2026-08-02T00-00-00-bare.jsonl", [
      { type: "session_meta", payload: { cwd: "/tmp/codex-bare" } },
      { type: "event_msg", payload: { type: "user_message", text: "hi" } },
    ]);
    const bareTrace = await loadTraceByRef({ tool: "codex", id: "bare", startedAt: 0, updatedAt: 0, storagePath: barePath });
    expect(bareTrace.tokens).toBeUndefined();
  });

  it("truncates oversized payloads, long lines, and call lists", async () => {
    const path = await writeRollout("2026/09/01", "rollout-2026-09-01T00-00-00-trunc.jsonl", [
      { type: "session_meta", payload: { cwd: "/tmp/codex-trunc" } },
      { type: "response_item", payload: { type: "custom_tool_call", name: "exec", input: "one\n" } },
      { type: "response_item", payload: { type: "custom_tool_call", name: "exec", input: "two\n" } },
      { type: "response_item", payload: { type: "custom_tool_call", name: "exec", input: "three\n" } },
    ]);
    const budget = await loadTraceByRef(
      { tool: "codex", id: "trunc", startedAt: 0, updatedAt: 0, storagePath: path },
      { maxBytes: 40 },
    );
    expect(budget.truncated).toBe(true);

    const capped = await loadTraceByRef(
      { tool: "codex", id: "trunc", startedAt: 0, updatedAt: 0, storagePath: path },
      { maxCalls: 1 },
    );
    expect(capped.toolCalls).toHaveLength(1);
    expect(capped.truncated).toBe(true);

    const longLine = JSON.stringify({ type: "event_msg", payload: { type: "user_message", text: "x".repeat(4 * 1024 * 1024) } });
    const longPath = await writeRollout("2026/09/02", "rollout-2026-09-02T00-00-00-long.jsonl", [longLine]);
    const longTrace = await loadTraceByRef({ tool: "codex", id: "long", startedAt: 0, updatedAt: 0, storagePath: longPath });
    expect(longTrace.truncated).toBe(true);
    expect(longTrace.userTurns).toEqual([]);
  });

  it("returns an empty trace for a missing file and exposes the source root", async () => {
    const missing = await loadTraceByRef({
      tool: "codex",
      id: "gone",
      startedAt: 0,
      updatedAt: 0,
      storagePath: join(root, "definitely-missing.jsonl"),
    });
    expect(missing.toolCalls).toEqual([]);
    expect(missing.truncated).toBe(false);
    expect(codexSource.root()).toBe(root);
    expect(codexSource.id).toBe("codex");
    expect(codexSource.label).toBe("Codex CLI");
  });
});

describe("claude-code trace adapter branch coverage", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "watchdog-cc-branch-"));
    process.env.SUPERSKILL_CLAUDE_PROJECTS = root;
  });

  afterEach(async () => {
    delete process.env.SUPERSKILL_CLAUDE_PROJECTS;
    await rm(root, { recursive: true, force: true });
  });

  async function writeSession(dir: string, name: string, lines: unknown[]): Promise<string> {
    await mkdir(join(root, dir), { recursive: true });
    const path = join(root, dir, name);
    await writeFile(path, lines.map((line) => (typeof line === "string" ? line : JSON.stringify(line))).join("\n") + "\n", "utf-8");
    return path;
  }

  it("lists sessions, decoding slugs and honoring head cwd, since, limit, and project filters", async () => {
    const matchPath = await writeSession("-tmp-cc-match", "aaa.jsonl", [
      { type: "user", cwd: "/tmp/cc/target", message: { role: "user", content: "hi" } },
    ]);
    const otherPath = await writeSession("-tmp-cc-other", "bbb.jsonl", [
      { type: "user", message: { role: "user", content: "no cwd" } },
    ]);
    const noSlugPath = await writeSession("plain-dir", "ccc.jsonl", []);
    const old = new Date("2024-01-01T00:00:00Z");
    await utimes(otherPath, old, old);
    await utimes(noSlugPath, old, old);

    const all = await listTraceSessions({ tool: "claude-code" });
    expect(all.map((ref) => ref.id).sort()).toEqual(["aaa", "bbb", "ccc"]);
    const other = all.find((ref) => ref.id === "bbb");
    expect(other?.project).toBe("/tmp/cc/other");
    const noSlug = all.find((ref) => ref.id === "ccc");
    expect(noSlug?.project).toBe("plain-dir");

    const filtered = await listTraceSessions({ tool: "claude-code", project: "/tmp/cc/target" });
    expect(filtered.map((ref) => ref.id)).toEqual(["aaa"]);

    const otherFiltered = await listTraceSessions({ tool: "claude-code", project: "/tmp/cc/other" });
    expect(otherFiltered.map((ref) => ref.id)).toEqual(["bbb"]);

    const since = await listTraceSessions({ tool: "claude-code", since: Date.parse("2025-01-01T00:00:00Z") });
    expect(since.map((ref) => ref.id)).toEqual(["aaa"]);

    const limited = await listTraceSessions({ tool: "claude-code", limit: 1 });
    expect(limited).toHaveLength(1);
    expect(matchPath).toContain("aaa.jsonl");
  });

  it("normalizes assistant blocks, tool results, and prompts", async () => {
    const lines: unknown[] = [
      { type: "user", cwd: "/tmp/cc-proj", message: { role: "user", content: "string prompt" } },
      { type: "assistant", message: { role: "assistant", model: "m1", content: "not array", usage: {} } },
      {
        type: "assistant",
        cwd: "/tmp/cc-proj",
        message: {
          role: "assistant",
          model: "m2",
          content: [
            null,
            5,
            { type: "text", text: "ignored" },
            { type: "tool_use" },
            { type: "tool_use", name: "Read", input: "bad-input", id: "t-read-bad" },
            { type: "tool_use", name: "Read", input: { file_path: "src/a.ts" }, id: "t-read" },
            { type: "tool_use", name: "Write", input: { file_path: "src/b.ts" } },
            { type: "tool_use", name: "Edit", input: { file_path: "src/c.ts" } },
            { type: "tool_use", name: "MultiEdit", input: { file_path: "src/d.ts" } },
            { type: "tool_use", name: "NotebookEdit", input: { file_path: "src/e.ts" } },
            { type: "tool_use", name: "Grep", input: { pattern: "needle" }, id: "t-grep" },
            { type: "tool_use", name: "Task", input: { description: "do things" }, id: "t-task" },
            { type: "tool_use", name: "Odd", input: {}, id: "t-odd" },
            { type: "tool_use", name: "Bash", input: { command: "npm test" }, id: "t-bash" },
          ],
          usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 4 },
        },
      },
      {
        type: "user",
        message: {
          role: "user",
          content: [
            null,
            { type: "tool_result" },
            { type: "tool_result", tool_use_id: "nope" },
            { type: "tool_result", tool_use_id: "t-read-bad", is_error: true, content: [{ type: "text", text: "ENOENT missing" }] },
            { type: "tool_result", tool_use_id: "t-read", content: [{ type: "text", text: "ok" }] },
            { type: "tool_result", tool_use_id: "t-bash", is_error: true, content: "string error body" },
          ],
        },
      },
      { type: "user", isSidechain: true, message: { role: "user", content: "sidechain prompt" } },
      { type: "user", message: { role: "user", content: "plain string" } },
      { type: "user", message: { role: "user", content: [{ type: "text", text: "array no results" }] } },
      { type: "user", message: { role: "user", content: [{ type: "text", text: "" }] } },
      { type: "user", message: { role: "user", content: 42 } },
      "",
      "not json",
    ];
    const path = await writeSession("-tmp-cc-deep", "deep.jsonl", lines);

    const trace = await loadTraceByRef({
      tool: "claude-code",
      id: "deep",
      startedAt: 0,
      updatedAt: 0,
      storagePath: path,
    });
    expect(trace.userTurns).toEqual(["string prompt", "plain string", "array no results"]);
    expect(trace.model).toBe("m1");
    expect(trace.toolCalls).toHaveLength(10);
    expect(trace.toolCalls[0].inputSummary).toBeUndefined();
    expect(trace.toolCalls[0].status).toBe("error");
    expect(trace.toolCalls[0].errorText).toBe("ENOENT missing");
    expect(trace.toolCalls[1].status).toBe("ok");
    expect(trace.toolCalls[2].filePath).toBe("src/b.ts");
    expect(trace.toolCalls[10 - 1].name).toBe("Bash");
    expect(trace.toolCalls[10 - 1].status).toBe("error");
    expect(trace.toolCalls[10 - 1].errorText).toBe("string error body");
    expect(trace.commands).toEqual(["npm test"]);
    expect(trace.filesRead).toEqual(["src/a.ts"]);
    expect(trace.filesWritten).toEqual(["src/b.ts", "src/c.ts", "src/d.ts", "src/e.ts"]);
    expect(trace.tokens).toEqual({ input: 0, output: 0, cacheRead: 0, cacheWrite: 4, reasoning: 0 });
  });

  it("sets tokens from output reads, cache reads, or nothing at all", async () => {
    const outputPath = await writeSession("-tmp-cc-out", "out.jsonl", [
      { type: "assistant", message: { role: "assistant", content: [], usage: { output_tokens: 3 } } },
    ]);
    const outputTrace = await loadTraceByRef({ tool: "claude-code", id: "out", startedAt: 0, updatedAt: 0, storagePath: outputPath });
    expect(outputTrace.tokens?.output).toBe(3);

    const cachePath = await writeSession("-tmp-cc-cache", "cache.jsonl", [
      { type: "assistant", message: { role: "assistant", content: [], usage: { cache_read_input_tokens: 7 } } },
    ]);
    const cacheTrace = await loadTraceByRef({ tool: "claude-code", id: "cache", startedAt: 0, updatedAt: 0, storagePath: cachePath });
    expect(cacheTrace.tokens?.cacheRead).toBe(7);

    const barePath = await writeSession("-tmp-cc-bare", "bare.jsonl", [
      { type: "user", message: { role: "user", content: "no usage" } },
    ]);
    const bareTrace = await loadTraceByRef({ tool: "claude-code", id: "bare", startedAt: 0, updatedAt: 0, storagePath: barePath });
    expect(bareTrace.tokens).toBeUndefined();
  });

  it("truncates oversized payloads and skips over-long lines", async () => {
    const path = await writeSession("-tmp-cc-trunc", "trunc.jsonl", [
      { type: "user", message: { role: "user", content: "hello" } },
    ]);
    const budget = await loadTraceByRef(
      { tool: "claude-code", id: "trunc", startedAt: 0, updatedAt: 0, storagePath: path },
      { maxBytes: 10 },
    );
    expect(budget.truncated).toBe(true);

    const longPath = await writeSession("-tmp-cc-long", "long.jsonl", ["x".repeat(1024 * 1024 + 10)]);
    const longTrace = await loadTraceByRef({ tool: "claude-code", id: "long", startedAt: 0, updatedAt: 0, storagePath: longPath });
    expect(longTrace.truncated).toBe(true);

    const missing = await loadTraceByRef({
      tool: "claude-code",
      id: "gone",
      startedAt: 0,
      updatedAt: 0,
      storagePath: join(root, "missing.jsonl"),
    });
    expect(missing.toolCalls).toEqual([]);
    expect(claudeCodeSource.root()).toBe(root);
    expect(claudeCodeSource.label).toBe("Claude Code");
  });
});

describe("opencode trace adapter branch coverage", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "watchdog-oc-branch-"));
    process.env.SUPERSKILL_OPENCODE_DATA = root;
  });

  afterEach(async () => {
    delete process.env.SUPERSKILL_OPENCODE_DATA;
    await rm(root, { recursive: true, force: true });
  });

  async function writeSessionFile(id: string, value: unknown): Promise<void> {
    await writeJson(join(root, `storage/session/h1/${id}.json`), value);
  }

  it("skips id-less sessions and applies project/since/limit filters", async () => {
    await writeSessionFile("ses_noid", { title: "no id" });
    await writeSessionFile("ses_nodir", { id: "ses_nodir", time: { created: 1, updated: 2 } });
    await writeSessionFile("ses_pref", { id: "ses_pref", directory: "/tmp/oc-proj/sub", time: { created: 3, updated: 4 } });
    await writeSessionFile("ses_exact", { id: "ses_exact", title: "Exact", directory: "/tmp/oc-proj", time: { created: 5 } });
    await writeSessionFile("ses_old", { id: "ses_old", directory: "/tmp/oc-old", time: { created: 1, updated: 1 } });

    const all = await listTraceSessions({ tool: "opencode" });
    expect(all.map((ref) => ref.id).sort()).toEqual(["ses_exact", "ses_nodir", "ses_old", "ses_pref"]);
    const nodir = all.find((ref) => ref.id === "ses_nodir");
    expect(nodir?.project).toBeUndefined();
    expect(nodir?.updatedAt).toBe(2);
    const exact = all.find((ref) => ref.id === "ses_exact");
    expect(exact?.updatedAt).toBe(5);

    const filtered = await listTraceSessions({ tool: "opencode", project: "/tmp/oc-proj" });
    expect(filtered.map((ref) => ref.id).sort()).toEqual(["ses_exact", "ses_pref"]);

    const excluded = await listTraceSessions({ tool: "opencode", project: "/tmp/nope" });
    expect(excluded).toHaveLength(0);

    const since = await listTraceSessions({ tool: "opencode", since: 3 });
    expect(since.map((ref) => ref.id).sort()).toEqual(["ses_exact", "ses_pref"]);

    expect(await listTraceSessions({ tool: "opencode", limit: 1 })).toHaveLength(1);
    expect(await opencodeSource.list({ limit: 1 })).toHaveLength(1);
    expect(opencodeSource.root()).toBe(root);
    expect(opencodeSource.label).toBe("OpenCode");

    delete process.env.SUPERSKILL_OPENCODE_DATA;
    expect(opencodeSource.root()).toContain(join(".local", "share", "opencode"));
    process.env.SUPERSKILL_OPENCODE_DATA = root;
  });

  it("normalizes parts, errors, outputs, and messages without ids", async () => {
    await writeJson(join(root, "storage/session/h2/ses_deep.json"), { id: "ses_deep", time: { created: 1, updated: 2 } });
    const messages: Array<[string, unknown]> = [
      ["msg_user", { id: "msg_user", role: "user", time: { created: 1 } }],
      [
        "msg_assist",
        {
          id: "msg_assist",
          role: "assistant",
          modelID: "model-z",
          providerID: "prov-z",
          cost: 0.25,
          tokens: { output: 4 },
          time: { created: 2 },
        },
      ],
    ];
    for (const [name, value] of messages) {
      await writeJson(join(root, `storage/message/ses_deep/${name}.json`), value);
    }
    await writeJson(join(root, "storage/message/ses_deep/msg_empty.json"), { id: "msg_empty", role: "user" });
    await writeJson(join(root, "storage/message/ses_deep/msg_noid.json"), { role: "user", time: { created: 3 } });

    const parts: Array<[string, unknown]> = [
      ["storage/part/msg_user/prt_1.json", { type: "text", text: "first prompt" }],
      ["storage/part/msg_user/prt_2.json", { type: "text", text: 5 }],
      ["storage/part/msg_user/prt_3.json", { type: "step" }],
      ["storage/part/msg_user/prt_4.json", { type: "tool" }],
      ["storage/part/msg_user/prt_5.json", { type: "tool", tool: "bash", state: {} }],
      ["storage/part/msg_user/prt_6.json", { type: "tool", tool: "grep", state: { status: "completed", input: { pattern: "needle" } } }],
      ["storage/part/msg_assist/prt_1.json", { type: "tool", tool: "read", state: { status: "completed", input: { filePath: "src/r.ts" }, output: { a: 1 } } }],
      ["storage/part/msg_assist/prt_2.json", { type: "tool", tool: "write", state: { status: "completed", input: { filePath: "src/w.ts" } } }],
      ["storage/part/msg_assist/prt_3.json", { type: "tool", tool: "edit", state: { status: "completed", input: { filePath: "src/e.ts" } } }],
      ["storage/part/msg_assist/prt_4.json", { type: "tool", tool: "patch", state: { status: "completed", input: { filePath: "src/p.ts" } } }],
      ["storage/part/msg_assist/prt_5.json", { type: "tool", tool: "odd", input: { num: 1 } }],
      ["storage/part/msg_assist/prt_6.json", { type: "tool", tool: "fail", state: { status: "error", error: { message: "obj" } } }],
      ["storage/part/msg_assist/prt_7.json", { type: "tool", tool: "bash", state: { status: "error", input: { command: "x" }, output: "plain" } }],
      ["storage/part/msg_assist/prt_8.json", { type: "tool", tool: "fail3", state: { status: "error", output: { nested: 1 } } }],
      ["storage/part/msg_noid/prt_1.json", { type: "text", text: "hello from no id" }],
    ];
    for (const [rel, value] of parts) {
      await writeJson(join(root, rel), value);
    }

    const sessionPath = join(root, "storage/session/h2/ses_deep.json");
    const trace = await loadTraceByRef({
      tool: "opencode",
      id: "ses_deep",
      startedAt: 1,
      updatedAt: 2,
      storagePath: sessionPath,
    });
    expect(trace.diff).toBeUndefined();
    expect(trace.userTurns).toEqual(["first prompt", "hello from no id"]);
    expect(trace.toolCalls).toHaveLength(10);
    expect(trace.toolCalls[0].name).toBe("bash");
    expect(trace.toolCalls[0].status).toBe("unknown");
    expect(trace.toolCalls[1].inputSummary).toBe("needle");
    expect(trace.toolCalls[7].errorText).toContain("obj");
    expect(trace.toolCalls[8].errorText).toBe("plain");
    expect(trace.toolCalls[8].outputBytes).toBe(Buffer.byteLength("plain", "utf-8"));
    expect(trace.toolCalls[9].errorText).toBeUndefined();
    expect(trace.commands).toEqual(["x"]);
    expect(trace.filesRead).toEqual(["src/r.ts"]);
    expect(trace.filesWritten).toEqual(["src/w.ts", "src/e.ts", "src/p.ts"]);
    expect(trace.model).toBe("model-z");
    expect(trace.provider).toBe("prov-z");
    expect(trace.tokens).toEqual({ input: 0, output: 4, cacheRead: 0, cacheWrite: 0, reasoning: 0 });
    expect(trace.cost).toBe(0.25);
    expect(trace.truncated).toBe(false);
  });

  it("marks the trace truncated when the part budget is exhausted", async () => {
    await writeJson(join(root, "storage/session/h3/ses_budget.json"), { id: "ses_budget", time: { created: 1, updated: 2 } });
    await writeJson(join(root, "storage/message/ses_budget/msg_1.json"), { id: "msg_1", role: "assistant", time: { created: 1 } });
    await writeJson(join(root, "storage/part/msg_1/prt_1.json"), { type: "tool", tool: "bash", state: { status: "completed", input: { command: "ls" } } });

    const trace = await loadTraceByRef(
      {
        tool: "opencode",
        id: "ses_budget",
        startedAt: 1,
        updatedAt: 2,
        storagePath: join(root, "storage/session/h3/ses_budget.json"),
      },
      { maxBytes: 1 },
    );
    expect(trace.truncated).toBe(true);
    expect(trace.toolCalls).toEqual([]);
  });

  it("reads session summaries and reports availability", async () => {
    await writeJson(join(root, "storage/session/h4/ses_summary.json"), {
      id: "ses_summary",
      time: { created: 1, updated: 2 },
      summary: { additions: 5 },
    });
    const refs = await opencodeSource.list({});
    const ref = refs.find((entry) => entry.id === "ses_summary");
    expect(ref).toBeDefined();
    const trace = await opencodeSource.load(ref!);
    expect(trace.diff).toEqual({ files: 0, additions: 5, deletions: 0 });
    expect(opencodeSource.root()).toBe(root);
  });
});
