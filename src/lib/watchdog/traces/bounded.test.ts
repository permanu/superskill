import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, open, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { claudeCodeSource } from "./claude-code.js";
import { codexSource } from "./codex.js";
import { opencodeSource } from "./opencode.js";
import type { TraceSource } from "./source.js";

vi.mock("node:fs/promises", async importOriginal => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, open: vi.fn(async (...args: Parameters<typeof original.open>) => {
    const handle = await original.open(...args);
    vi.spyOn(handle, "read");
    return handle;
  }), readFile: vi.fn(original.readFile) };
});

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), "bounded-traces-")); });
afterEach(async () => { vi.clearAllMocks(); await rm(root, { recursive: true, force: true }); });

function prompt(source: TraceSource, text: string): object {
  return source.id === "claude-code" ? { type: "user", message: { content: text } } : { type: "event_msg", payload: { type: "user_message", text } };
}

describe.each([claudeCodeSource, codexSource])("$id byte and call caps", source => {
  it("streams bounded file-handle reads and skips malformed or oversized lines", async () => {
    const path = join(root, "huge.jsonl");
    const oversized = JSON.stringify(prompt(source, "x".repeat(5 * 1024 * 1024)));
    await writeFile(path, ["null", "42", "{broken", oversized, JSON.stringify(prompt(source, "retained"))].join("\n"));
    const trace = await source.load({ tool: source.id, id: "bounded", startedAt: 0, storagePath: path });
    expect(trace.userTurns).toEqual(["retained"]);
    expect(trace.truncated).toBe(true);
    expect(trace.sourceErrors).toEqual(expect.arrayContaining(["INVALID_DATA", "TRUNCATED"]));
    expect(open).toHaveBeenCalled();
    expect(readFile).not.toHaveBeenCalled();
  });

  it("counts UTF-8 bytes and never parses a budget-cut final line", async () => {
    const path = join(root, "unicode.jsonl");
    const first = JSON.stringify(prompt(source, "🙂".repeat(40)));
    await writeFile(path, `${first}\n${JSON.stringify(prompt(source, "must-not-read"))}\n`);
    const ref = { tool: source.id, id: "unicode", startedAt: 0, storagePath: path };
    const cut = await source.load(ref, { maxBytes: first.length + 10 });
    expect(cut.userTurns).toEqual([]);
    expect(cut.truncated).toBe(true);
    const handle = await vi.mocked(open).mock.results.at(-1)!.value;
    const requested = (vi.mocked(handle.read).mock.calls as unknown[][]).reduce((sum, args) => sum + Number(args[2]), 0);
    expect(requested).toBeLessThanOrEqual(first.length + 10);
    const exact = await source.load(ref, { maxBytes: Buffer.byteLength(`${first}\n`) });
    expect(exact.userTurns).toEqual(["🙂".repeat(40)]);
    expect(exact.truncated).toBe(true);
  });

  it("does not retain commands, files, or pending results from capped calls", async () => {
    const path = join(root, "calls.jsonl");
    const lines = source.id === "claude-code" ? [
      { type: "assistant", message: { content: [
        { type: "tool_use", id: "kept", name: "Bash", input: { command: "first" } },
        { type: "tool_use", id: "ignored", name: "Bash", input: { command: "second" } },
        { type: "tool_use", id: "file", name: "Read", input: { file_path: "ignored.ts" } },
      ] } },
      { type: "user", message: { content: [{ type: "tool_result", tool_use_id: "ignored", is_error: true, content: "wrong failure" }] } },
    ] : [
      { type: "response_item", payload: { type: "function_call", call_id: "kept", name: "exec_command", arguments: '{"cmd":"first"}' } },
      { type: "response_item", payload: { type: "function_call", call_id: "ignored", name: "exec_command", arguments: '{"cmd":"cat ignored.ts"}' } },
      { type: "response_item", payload: { type: "function_call_output", call_id: "ignored", output: '{"exit_code":1}' } },
    ];
    await writeFile(path, lines.map(line => JSON.stringify(line)).join("\n"));
    const ref = { tool: source.id, id: "calls", startedAt: 0, storagePath: path };
    const trace = await source.load(ref, { maxCalls: 1 });
    expect(trace.toolCalls).toHaveLength(1);
    expect(trace.toolCalls[0].status).toBe("unknown");
    expect(trace.commands).toEqual(["first"]);
    expect(trace.filesRead).toEqual([]);
    const empty = await source.load(ref, { maxCalls: 0 });
    expect(empty.toolCalls).toEqual([]);
    expect(empty.commands).toEqual([]);
    expect(empty.filesRead).toEqual([]);
  });
});

it("returns a safe source error code for nonmissing IO failures", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(open).mockRejectedValueOnce(Object.assign(new Error("sensitive error payload"), { code: "EACCES" }));
  try {
    const trace = await claudeCodeSource.load({ tool: "claude-code", id: "denied", startedAt: 0, storagePath: join(root, "denied.jsonl") });
    expect(trace.sourceErrors).toEqual(["EACCES"]);
    expect(JSON.stringify(trace)).not.toContain("sensitive error payload");
    expect(error).not.toHaveBeenCalled();
  } finally { error.mockRestore(); }
});

it("bounds OpenCode command/file side effects by retained calls", async () => {
  const old = process.env.SUPERSKILL_OPENCODE_DATA;
  process.env.SUPERSKILL_OPENCODE_DATA = root;
  try {
    const path = join(root, "session.json");
    await writeFile(path, "{}");
    await mkdir(join(root, "storage/message/session"), { recursive: true });
    await writeFile(join(root, "storage/message/session/m.json"), '{"id":"m","role":"assistant"}');
    await mkdir(join(root, "storage/part/m"), { recursive: true });
    for (let i = 0; i < 4; i += 1) await writeFile(join(root, `storage/part/m/${i}.json`), JSON.stringify({ type: "tool", tool: "bash", state: { input: { command: `cat file${i}.ts`, filePath: `file${i}.ts` } } }));
    const trace = await opencodeSource.load({ tool: "opencode", id: "session", startedAt: 0, storagePath: path }, { maxCalls: 1 });
    expect(trace.toolCalls).toHaveLength(1);
    expect(trace.commands).toHaveLength(1);
    expect(trace.filesRead.length + trace.filesWritten.length).toBeLessThanOrEqual(1);
    expect(trace.truncated).toBe(true);
  } finally {
    if (old === undefined) delete process.env.SUPERSKILL_OPENCODE_DATA; else process.env.SUPERSKILL_OPENCODE_DATA = old;
  }
});

it("caps nested Codex command and file metadata even for a single stored call", async () => {
  const path = join(root, "nested.jsonl");
  const input = 'tools.exec_command({cmd:"cat a.ts b.ts c.ts"}); tools.exec_command({cmd:"cat d.ts"});';
  await writeFile(path, JSON.stringify({ type: "response_item", payload: { type: "custom_tool_call", name: "exec", input } }));
  const trace = await codexSource.load({ tool: "codex", id: "nested", startedAt: 0, storagePath: path }, { maxCalls: 1 });
  expect(trace.commands).toHaveLength(1);
  expect(trace.filesRead).toHaveLength(1);
  expect(trace.truncated).toBe(true);
});

it.each([claudeCodeSource, codexSource, opencodeSource])("$id treats a null project filter as no authorized source", async source => {
  expect(await source.list({ project: null })).toEqual([]);
  expect(open).not.toHaveBeenCalled();
});

it("filters stale Codex files before header reads but includes recently updated old rollouts", async () => {
  const oldRoot = process.env.SUPERSKILL_CODEX_SESSIONS;
  process.env.SUPERSKILL_CODEX_SESSIONS = root;
  try {
    const dir = join(root, "2020", "01", "01");
    await mkdir(dir, { recursive: true });
    const path = join(dir, "rollout-2020-01-01T00-00-00-old.jsonl");
    await writeFile(path, JSON.stringify({ type: "session_meta", payload: { cwd: "/repo" } }));
    await utimes(path, new Date(0), new Date(0));
    expect(await codexSource.list({ since: Date.parse("2026-01-01"), project: "/repo" })).toEqual([]);
    expect(open).not.toHaveBeenCalled();
    await utimes(path, new Date(), new Date());
    expect(await codexSource.list({ since: Date.parse("2026-01-01"), project: "/repo" })).toHaveLength(1);
  } finally {
    if (oldRoot === undefined) delete process.env.SUPERSKILL_CODEX_SESSIONS; else process.env.SUPERSKILL_CODEX_SESSIONS = oldRoot;
  }
});
