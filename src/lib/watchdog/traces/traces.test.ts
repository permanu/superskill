// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { listTraceSessions, loadTraceByRef } from "./index.js";

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
