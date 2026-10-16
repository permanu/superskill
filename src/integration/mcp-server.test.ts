import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CallToolResult, GetPromptResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import type { CommandRegistry } from "../core/registry.js";
import type { CommandContext } from "../core/types.js";
import { createTestContext } from "../test-helpers.js";
import { VaultError } from "../lib/vault-fs.js";

type Request = { params: { name?: string; arguments?: Record<string, unknown>; uri?: string } };

const harness = vi.hoisted(() => ({
  handlers: new Map<string, (request: Request) => Promise<unknown>>(),
  registry: null as CommandRegistry | null,
  createScopedCtx: vi.fn(),
  listActive: vi.fn(),
  list: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: class {
    setRequestHandler(schema: { shape: { method: { value: string } } }, handler: (request: Request) => Promise<unknown>) {
      harness.handlers.set(schema.shape.method.value, handler);
    }
    async connect() {}
  },
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({ StdioServerTransport: class {} }));
vi.mock("../setup/refresh.js", () => ({ refreshStartupState: vi.fn() }));
vi.mock("../app-context.js", () => ({
  createScopedCtx: harness.createScopedCtx,
  getSessionRegistry: () => ({ listActive: harness.listActive }),
}));
vi.mock("../commands/read.js", async importOriginal => ({
  ...await importOriginal<typeof import("../commands/read.js")>(),
  listCommand: harness.list,
}));
vi.mock("../core/registry.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../core/registry.js")>();
  return {
    ...actual,
    createRegistry: () => {
      harness.registry = actual.createRegistry();
      return harness.registry;
    },
  };
});

async function call(name: string, args: Record<string, unknown> = {}): Promise<CallToolResult> {
  return await harness.handlers.get("tools/call")!({ params: { name, arguments: args } }) as CallToolResult;
}

function text(result: CallToolResult): string {
  const content = result.content[0];
  if (content.type !== "text") throw new Error("Expected text content");
  return content.text;
}

describe("MCP request boundaries", () => {
  let ctx: CommandContext;
  let cleanup: () => Promise<void>;
  let now = Date.now();

  beforeAll(async () => {
    const fixture = await createTestContext({ project: "test-project" });
    ctx = { ...fixture.ctx, projectSlug: "test-project" };
    cleanup = fixture.cleanup;
    await import("../mcp-server.js");
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    now += 120_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    vi.spyOn(console, "error").mockImplementation(() => {});
    harness.createScopedCtx.mockReset().mockResolvedValue(ctx);
    harness.listActive.mockReset().mockResolvedValue([]);
    harness.list.mockReset().mockResolvedValue([]);
    for (const name of harness.registry!.getToolNames()) {
      harness.registry!.get(name)!.handler = vi.fn().mockResolvedValue({ ok: true });
    }
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await cleanup();
  });

  it("validates tool fields before resolving a workspace or invoking adapters", async () => {
    const result = await call("evidence", { action: "add", ticket: "ticket-001", exit: "1" });
    expect(result.isError).toBe(true);
    expect(JSON.parse(text(result))).toMatchObject({ error: "INVALID_ARGUMENT" });
    expect(harness.createScopedCtx).not.toHaveBeenCalled();
    expect(harness.registry!.get("evidence")!.handler).not.toHaveBeenCalled();
  });

  it("marks unsuccessful skill delivery as a tool error", async () => {
    vi.mocked(harness.registry!.get("superskill")!.handler).mockResolvedValue({ success: false, status: "blocked", skills_loaded: [] });
    expect((await call("superskill", { task: "load a skill" })).isError).toBe(true);
  });

  it("does not spend write budget on invalid requests", async () => {
    for (let index = 0; index < 35; index++) {
      expect(JSON.parse(text(await call("write", { path: "x.md" })))).toMatchObject({ error: "INVALID_ARGUMENT" });
    }
    expect((await call("write", { path: "x.md", content: "ok" })).isError).not.toBe(true);
  });

  it.each(["superskill", "knowledge_viz", "knowledge_rebuild", "graph_traverse", "graph_related", "search", "spec", "tickets", "evidence"])(
    "limits %s when it can mutate graph or project state",
    async name => {
      const args: Record<string, Record<string, unknown>> = {
        graph_traverse: { action: "children", id: "rules" }, graph_related: { path: "x.md" }, search: { query: "test" },
        spec: { action: "list" }, tickets: { action: "list" }, evidence: { action: "list", ticket: "ticket-001" },
      };
      for (let index = 0; index < 30; index++) {
        expect((await call(name, args[name])).isError).not.toBe(true);
      }
      const result = await call(name, args[name]);
      expect(result.isError).toBe(true);
      expect(JSON.parse(text(result))).toMatchObject({ error: "RATE_LIMITED" });
      expect(harness.registry!.get(name)!.handler).toHaveBeenCalledTimes(30);
    },
  );

  it("keeps task list write-budget semantics and resets the sliding window", async () => {
    for (let index = 0; index < 30; index++) await call("task", { action: "list" });
    expect(JSON.parse(text(await call("task", { action: "list" })))).toMatchObject({ error: "RATE_LIMITED" });
    now += 60_001;
    expect((await call("task", { action: "list" })).isError).not.toBe(true);
  });

  it("bounds read-only request volume separately from write operations", async () => {
    for (let index = 0; index < 60; index++) {
      expect((await call("stats")).isError).not.toBe(true);
    }
    expect(JSON.parse(text(await call("stats")))).toMatchObject({ error: "RATE_LIMITED" });
    expect((await call("write", { path: "x.md", content: "ok" })).isError).not.toBe(true);
  });

  it.each(["doctor", "generate_context", "impact", "claims", "worktree_audit", "worktree_status", "hygiene_report", "skill_validate"])(
    "uses a conservative separate budget for expensive read-only %s calls", async name => {
      const args: Record<string, Record<string, unknown>> = {
        generate_context: { project_path: "/repo" }, impact: { target: "x.ts" }, claims: { claims: [] },
      };
      for (let index = 0; index < 10; index++) expect((await call(name, args[name])).isError).not.toBe(true);
      expect(JSON.parse(text(await call(name, args[name])))).toMatchObject({ error: "RATE_LIMITED", message: expect.stringContaining("Retry") });
      expect((await call("stats")).isError).not.toBe(true);
    },
  );

  it("hides unexpected internal error details from responses and diagnostics", async () => {
    const failure = new Error("EACCES reading /Users/private/secret-vault/config.json");
    vi.mocked(harness.registry!.get("write")!.handler).mockRejectedValue(failure);
    const result = await call("write", { path: "x.md", content: "ok" });
    expect(result.isError).toBe(true);
    expect(JSON.parse(text(result))).toMatchObject({ error: "INTERNAL_ERROR" });
    expect(text(result)).not.toContain("/Users/private");
    expect(text(result)).not.toContain("EACCES");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls).includes("/Users/private")).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it("does not serialize credentials, PII, subprocess output or hostile error getters", async () => {
    const sentinel = "synthetic-sensitive-canary";
    const getter = vi.fn(() => { throw new Error(sentinel); });
    const failures = [
      Object.assign(new Error(sentinel, { cause: new Error(sentinel) }), { stdout: sentinel, stderr: sentinel, code: "EACCES" }),
      { toString: getter, toJSON: getter, get message() { return getter(); } },
    ];
    for (const failure of failures) {
      vi.mocked(harness.registry!.get("write")!.handler).mockRejectedValue(failure);
      const result = await call("write", { path: "x.md", content: "ok" });
      expect(text(result).includes(sentinel)).toBe(false);
    }
    expect(JSON.stringify(vi.mocked(console.error).mock.calls).includes(sentinel)).toBe(false);
    expect(getter).not.toHaveBeenCalled();
  });

  it("preserves actionable vault validation errors", async () => {
    vi.mocked(harness.registry!.get("write")!.handler).mockRejectedValue(new VaultError("PERMISSION_DENIED", "Path traversal not allowed"));
    expect(JSON.parse(text(await call("write", { path: "x.md", content: "ok" })))).toEqual({
      error: "PERMISSION_DENIED", message: "Access denied. Check project scope and path permissions.",
    });
  });

  it("does not echo sensitive paths or values through public error messages", async () => {
    const sentinel = "synthetic-sensitive-canary";
    for (const code of ["INVALID_ARGUMENT", "PERMISSION_DENIED", "FILE_NOT_FOUND", "SECRET_REJECTED"]) {
      vi.mocked(harness.registry!.get("write")!.handler).mockRejectedValue(new VaultError(code, sentinel));
      const result = await call("write", { path: "x.md", content: "ok" });
      expect(JSON.parse(text(result)).error).toBe(code);
      expect(text(result).includes(sentinel)).toBe(false);
    }
    expect(JSON.stringify(vi.mocked(console.error).mock.calls).includes(sentinel)).toBe(false);
  });

  it("classifies invalid write modes as argument errors", async () => {
    const result = await call("write", { path: "x.md", content: "x", mode: "delete" });
    expect(result.isError).toBe(true);
    expect(JSON.parse(text(result))).toMatchObject({ error: "INVALID_ARGUMENT" });
    expect(harness.registry!.get("write")!.handler).not.toHaveBeenCalled();
  });

  it("never upgrades prune all-project requests to an unscoped context", async () => {
    expect((await call("prune", { mode: "dry-run", all: true })).isError).not.toBe(true);
    expect(harness.createScopedCtx).toHaveBeenCalledWith(undefined, "prune", undefined);
    expect(harness.registry!.get("prune")!.handler).toHaveBeenCalledWith(expect.objectContaining({ all: true }), ctx);
    expect(JSON.parse(text(await call("prune", { all: "true" })))).toMatchObject({ error: "INVALID_ARGUMENT" });
  });

  it("keeps truncated structured responses and directory listings parseable", async () => {
    vi.stubEnv("SUPERSKILL_MAX_RESPONSE_BYTES", "128");
    try {
      vi.mocked(harness.registry!.get("task")!.handler).mockResolvedValue({ tasks: ["é\"\n".repeat(500)] });
      const result = await call("task", { action: "list" });
      expect(JSON.parse(text(result))).toMatchObject({ truncated: true, bytes: expect.any(Number), preview: expect.any(String) });
      expect(Buffer.byteLength(text(result))).toBeLessThanOrEqual(128);
      vi.mocked(harness.registry!.get("read")!.handler).mockRejectedValue(new VaultError("FILE_NOT_FOUND", "Not found"));
      harness.list.mockResolvedValue(["x".repeat(500)]);
      const listing = await call("read", { path: "notes", max_bytes: 128 });
      expect(JSON.parse(text(listing))).toMatchObject({ truncated: true, bytes: expect.any(Number) });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("reconstructs a 105KB graph-open result across bounded MCP pages without gaps or duplicate bytes", async () => {
    vi.stubEnv("SUPERSKILL_MAX_RESPONSE_BYTES", "65536");
    const source = (`quote " and slash \\\nline 世界😀\n`).repeat(4200);
    const sourceBytes = Buffer.from(source, "utf8");
    expect(sourceBytes.byteLength).toBeGreaterThan(105 * 1024);
    vi.mocked(harness.registry!.get("graph_traverse")!.handler).mockImplementation(async (args) => {
      const offset = (args as { offsetBytes?: number }).offsetBytes ?? 0;
      const content = sourceBytes.subarray(offset).toString("utf8");
      return {
        id: "skill:fixture",
        kind: "skill",
        bytes: sourceBytes.byteLength,
        tokens: 1,
        offset_bytes: offset,
        next_offset_bytes: null,
        read_complete: true,
        content_bytes: Buffer.byteLength(content, "utf8"),
        content,
        truncated: false,
      };
    });

    try {
      let offset = 0;
      let assembled = Buffer.alloc(0);
      let pageCount = 0;
      while (pageCount < 10) {
        const response = await call("graph_traverse", {
          action: "open", id: "skill:fixture", full: true, offset_bytes: offset,
        });
        expect(response.isError).not.toBe(true);
        const page = JSON.parse(text(response)) as {
          bytes: number;
          offset_bytes: number;
          next_offset_bytes: number | null;
          read_complete: boolean;
          content_bytes: number;
          content: string;
          truncated: boolean;
        };
        const chunk = Buffer.from(page.content, "utf8");
        expect(Buffer.byteLength(text(response), "utf8")).toBeLessThanOrEqual(65536);
        expect(page.bytes).toBe(sourceBytes.byteLength);
        expect(page.offset_bytes).toBe(offset);
        expect(page.content_bytes).toBe(chunk.byteLength);
        expect(sourceBytes.subarray(offset, offset + chunk.byteLength).equals(chunk)).toBe(true);
        expect(page.truncated).toBe(!page.read_complete);
        assembled = Buffer.concat([assembled, chunk]);
        pageCount += 1;
        if (page.read_complete) {
          expect(page.next_offset_bytes).toBeNull();
          break;
        }
        expect(page.next_offset_bytes).toBe(offset + chunk.byteLength);
        expect(page.next_offset_bytes).toBeGreaterThan(offset);
        if (page.next_offset_bytes === null) throw new Error("Incomplete graph page has no continuation cursor");
        offset = page.next_offset_bytes;
      }

      expect(pageCount).toBeGreaterThan(1);
      expect(pageCount).toBeLessThan(10);
      expect(assembled.equals(sourceBytes)).toBe(true);
      expect(assembled.toString("utf8")).not.toContain("\uFFFD");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("returns an actionable graph-open error when metadata cannot fit the response cap", async () => {
    vi.stubEnv("SUPERSKILL_MAX_RESPONSE_BYTES", "128");
    vi.mocked(harness.registry!.get("graph_traverse")!.handler).mockResolvedValue({
      id: "skill:fixture", kind: "skill", bytes: 200, tokens: 10, offset_bytes: 0,
      next_offset_bytes: null, read_complete: true, content_bytes: 200, content: "x".repeat(200), truncated: false,
    });
    try {
      const response = await call("graph_traverse", { action: "open", id: "skill:fixture", full: true });
      expect(response.isError).toBe(true);
      expect(text(response)).toContain("SUPERSKILL_MAX_RESPONSE_BYTES");
      expect(Buffer.byteLength(text(response), "utf8")).toBeLessThanOrEqual(128);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("rejects host-absolute and traversal skill paths before resolving a workspace", async () => {
    for (const path of ["/etc/passwd", "../outside/SKILL.md", "skills\\..\\outside\\SKILL.md"]) {
      const response = await call("skill_validate", { path });
      expect(response.isError).toBe(true);
      expect(JSON.parse(text(response))).toMatchObject({ error: "INVALID_ARGUMENT" });
    }
    expect(harness.createScopedCtx).not.toHaveBeenCalled();
    expect(harness.registry!.get("skill_validate")!.handler).not.toHaveBeenCalled();
  });

  it("passes a contained skill path and explicit workspace to the validator", async () => {
    const response = await call("skill_validate", {
      path: "skills/demo/SKILL.md", profile: "portable", workspace_path: "/workspace/project",
    });
    expect(response.isError).not.toBe(true);
    expect(harness.createScopedCtx).toHaveBeenCalledWith(undefined, "skill_validate", "/workspace/project");
    expect(harness.registry!.get("skill_validate")!.handler).toHaveBeenCalledWith(
      { path: "skills/demo/SKILL.md", profile: "portable" }, ctx,
    );
  });

  it("never lists all active sessions for an unmapped resource request", async () => {
    harness.createScopedCtx.mockResolvedValue({ ...ctx, projectSlug: null });
    const result = await harness.handlers.get("resources/read")!({ params: { uri: "vault://coordination/active-sessions" } }) as ReadResourceResult;
    const content = result.contents[0];
    if (!("text" in content)) throw new Error("Expected text content");
    expect(JSON.parse(content.text)).toMatchObject({ error: "PERMISSION_DENIED" });
    expect(harness.listActive).not.toHaveBeenCalled();
  });

  it("lists active sessions only for the mapped project", async () => {
    await harness.handlers.get("resources/read")!({ params: { uri: "vault://coordination/active-sessions" } });
    expect(harness.listActive).toHaveBeenCalledWith("test-project");
  });

  it.each(["resources/read", "prompts/get"])("sanitizes internal failures in %s", async method => {
    const failure = new Error("Cannot access /Users/private/vault");
    harness.createScopedCtx.mockRejectedValue(failure);
    const result = await harness.handlers.get(method)!({ params: {
      uri: "vault://project/test-project/context", name: "inject-project-context", arguments: { project: "test-project" },
    } });
    expect(JSON.stringify(result)).not.toContain("/Users/private");
    expect(JSON.stringify(result)).toContain("INTERNAL_ERROR");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls).includes("/Users/private")).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it.each(["inject-project-context", "summarize-session"])("validates project fields in the %s prompt", async name => {
    for (const args of [{ project: "../../private" }, { project: 42 }, { project: "test-project", extra: "ignored" }]) {
      const result = await harness.handlers.get("prompts/get")!({ params: { name, arguments: args } }) as GetPromptResult;
      const content = result.messages[0].content;
      if (content.type !== "text") throw new Error("Expected text content");
      expect(content.text).toContain("INVALID_ARGUMENT");
    }
    expect(harness.createScopedCtx).not.toHaveBeenCalled();
  });
});
