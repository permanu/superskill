import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CommandRegistry,
  DEFAULT_READ_MAX_BYTES,
  DEFAULT_RESPONSE_MAX_BYTES,
  READ_MAX_BYTES_CAP,
  capResponseBytes,
  maxResponseBytes,
  resolveReadMaxBytes,
  serializeToolResult,
} from "./registry.js";
import { VaultError } from "../lib/vault-fs.js";
import type { CommandContext, CommandHandler, CommandRegistration, MCPToolDefinition } from "./types.js";

function createMockContext(): CommandContext {
  return {
    vaultFs: {} as any,
    vaultPath: "/tmp/test-vault",
    config: {} as any,
    sessionRegistry: {} as any,
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
}

function createMockVaultFs(readResult?: string): any {
  return {
    root: "/tmp/test-vault",
    read: vi.fn().mockResolvedValue(readResult ?? ""),
    write: vi.fn().mockResolvedValue({ path: "test", bytes: 0 }),
    list: vi.fn().mockResolvedValue([]),
    exists: vi.fn().mockResolvedValue(false),
    verifyNoSymlinkEscape: vi.fn().mockResolvedValue(undefined),
    append: vi.fn().mockResolvedValue({ path: "test", bytes: 0 }),
  };
}

describe("CommandRegistry", () => {
  let registry: CommandRegistry;
  let ctx: CommandContext;

  beforeEach(() => {
    registry = new CommandRegistry();
    ctx = createMockContext();
  });

  describe("register and get", () => {
    it("stores and retrieves a registration", () => {
      const handler: CommandHandler = async () => null;
      const toolDef: MCPToolDefinition = {
        name: "test_tool",
        description: "A test tool",
        inputSchema: { type: "object" },
      };
      const reg: CommandRegistration = { handler, toolDef };

      registry.register("test", reg);
      expect(registry.get("test")).toBe(reg);
      expect(registry.has("test")).toBe(true);
      expect(registry.has("missing")).toBe(false);
    });

    it("returns undefined for unknown command", () => {
      expect(registry.get("unknown")).toBeUndefined();
    });
  });

  describe("execute", () => {
    it("executes a registered command handler", async () => {
      const handler = async (args: { name: string }) => `Hello, ${args.name}!`;
      const reg: CommandRegistration = {
        handler: handler as CommandHandler,
        toolDef: { name: "greet", description: "Greet", inputSchema: {} },
      };

      registry.register("greet", reg);
      const result = await registry.execute("greet", { name: "World" }, ctx);
      expect(result).toBe("Hello, World!");
    });

    it("uses adaptArgs to transform raw arguments", async () => {
      const handler = async (args: { camelCase: string }) => args.camelCase;
      const reg: CommandRegistration = {
        handler: handler as CommandHandler,
        toolDef: { name: "adapt", description: "Adapt", inputSchema: {} },
        adaptArgs: (raw: Record<string, unknown>) => ({ camelCase: raw.snake_case as string }),
      };

      registry.register("adapt", reg);
      const result = await registry.execute("adapt", { snake_case: "value" }, ctx);
      expect(result).toBe("value");
    });

    it("throws for unknown command", async () => {
      await expect(registry.execute("unknown", {}, ctx)).rejects.toThrow("Unknown command: unknown");
    });

    it("passes context through to handler", async () => {
      let receivedCtx: CommandContext | null = null;
      const handler: CommandHandler = async (_args, ctx) => {
        receivedCtx = ctx;
        return "done";
      };
      const reg: CommandRegistration = {
        handler,
        toolDef: { name: "ctx-test", description: "Ctx", inputSchema: {} },
      };

      registry.register("ctx-test", reg);
      await registry.execute("ctx-test", {}, ctx);
      expect(receivedCtx).toBe(ctx);
    });

    it("passes through errors from handlers", async () => {
      const handler: CommandHandler = async () => {
        throw new VaultError("FILE_NOT_FOUND", "not here");
      };
      const reg: CommandRegistration = {
        handler,
        toolDef: { name: "error-test", description: "Error", inputSchema: {} },
      };

      registry.register("error-test", reg);
      await expect(registry.execute("error-test", {}, ctx)).rejects.toThrow("not here");
    });
  });

  describe("getToolDefinitions", () => {
    it("returns empty array when no registrations", () => {
      expect(registry.getToolDefinitions()).toEqual([]);
    });

    it("returns tool defs from all registrations", () => {
      const handler: CommandHandler = async () => null;

      registry.register("cmd1", {
        handler,
        toolDef: { name: "tool1", description: "Tool 1", inputSchema: {} },
      });
      registry.register("cmd2", {
        handler,
        toolDef: { name: "tool2", description: "Tool 2", inputSchema: {} },
      });
      registry.register("cmd3", {
        handler,
        toolDef: { name: "tool3", description: "Tool 3", inputSchema: {} },
      });

      const defs = registry.getToolDefinitions();
      expect(defs).toHaveLength(3);
      expect(defs.map((d) => d.name)).toEqual(["tool1", "tool2", "tool3"]);
    });
  });

  describe("getToolNames", () => {
    it("returns all registered tool names", () => {
      const handler: CommandHandler = async () => null;
      registry.register("a", { handler, toolDef: { name: "a", description: "", inputSchema: {} } });
      registry.register("b", { handler, toolDef: { name: "b", description: "", inputSchema: {} } });

      expect(registry.getToolNames()).toEqual(["a", "b"]);
    });
  });
});

describe("createRegistry", () => {
  it("registers all expected MCP tools", async () => {
    const { createRegistry } = await import("./registry.js");
    const registry = createRegistry();
    const names = registry.getToolNames();

    const expectedTools = [
      "read",
      "write",
      "search",
      "project_context",
      "generate_context",
      "decide",
      "task",
      "learn",
      "brainstorm",
      "session",
      "prune",
      "stats",
      "resume",
      "deprecate",
      "init",
      "status",
      "superskill",
    ];

    for (const name of expectedTools) {
      expect(names, `Missing tool: ${name}`).toContain(name);
    }
  });

  it("provides inputSchema with required fields for each tool", async () => {
    const { createRegistry } = await import("./registry.js");
    const registry = createRegistry();
    const defs = registry.getToolDefinitions();

    for (const def of defs) {
      expect(def.inputSchema, `${def.name}: missing inputSchema`).toBeDefined();
      expect(def.inputSchema, `${def.name}: inputSchema must be object`).toHaveProperty("type", "object");
    }
  });

  it("adaptArgs for read passes path and coerces depth", async () => {
    const { createRegistry } = await import("./registry.js");
    const registry = createRegistry();
    const vaultFs = createMockVaultFs("# Hello");
    const ctx: CommandContext = { ...createMockContext(), vaultFs };

    const result = await registry.execute("read", { path: "test.md", depth: "2" }, ctx);
    expect(result).toBe("# Hello");
    expect(vaultFs.read).toHaveBeenCalledWith("test.md");
  });

  it("adaptArgs directly transforms snake_case for each tool", async () => {
    const { createRegistry } = await import("./registry.js");
    const registry = createRegistry();

    const readReg = registry.get("read");
    const readArgs = readReg!.adaptArgs!({ path: "f.md", depth: 3 });
    expect(readArgs).toEqual({ path: "f.md", depth: 3, maxBytes: DEFAULT_READ_MAX_BYTES });

    const taskReg = registry.get("task");
    const taskArgs = taskReg!.adaptArgs!({ action: "add", title: "T", blocked_by: ["x"], assigned_to: "a" });
    expect(taskArgs).toEqual({ action: "add", title: "T", blockedBy: ["x"], assignedTo: "a" });

    const sessionReg = registry.get("session");
    const sessionArgs = sessionReg!.adaptArgs!({ action: "register", tool: "t", task_summary: "s", files_touched: ["a.ts"] });
    expect(sessionArgs).toEqual({ action: "register", tool: "t", taskSummary: "s", filesTouched: ["a.ts"], allowShared: false });

    const learnReg = registry.get("learn");
    const learnArgs = learnReg!.adaptArgs!({ action: "add", title: "L", tags: ["b"], session_id: "s1" });
    expect(learnArgs).toEqual({ action: "add", title: "L", tags: ["b"], sessionId: "s1" });

    const pruneReg = registry.get("prune");
    const pruneArgs = pruneReg!.adaptArgs!({ mode: "dry-run", sessions_days: 30, done_tasks_days: 60 });
    expect(pruneArgs).toEqual({ mode: "dry-run", policy: { sessions: 30, doneTasks: 60 }, all: false });

    const ctxReg = registry.get("project_context");
    const ctxArgs = ctxReg!.adaptArgs!({ project: "p", detail_level: "full" });
    expect(ctxArgs).toEqual({ project: "p", detailLevel: "full" });

    const writeReg = registry.get("write");
    const writeArgs = writeReg!.adaptArgs!({ path: "f.md", content: "c", mode: "append" });
    expect(writeArgs).toEqual({ path: "f.md", content: "c", mode: "append" });

    const resumeReg = registry.get("resume");
    const resumeArgs = resumeReg!.adaptArgs!({ project: "p", limit: 3, format: "json" });
    expect(resumeArgs).toEqual({ project: "p", limit: 3, format: "json" });

    const searchReg = registry.get("search");
    const searchArgs = searchReg!.adaptArgs!({ query: "q", limit: 5, project: "p", path_filter: "dir" });
    expect(searchArgs).toEqual({ query: "q", project: "p", limit: 5, structured: false });
  });
});

describe("output bounding", () => {
  const savedPretty = process.env.SUPERSKILL_PRETTY;
  const savedMax = process.env.SUPERSKILL_MAX_RESPONSE_BYTES;

  afterEach(() => {
    if (savedPretty === undefined) delete process.env.SUPERSKILL_PRETTY;
    else process.env.SUPERSKILL_PRETTY = savedPretty;
    if (savedMax === undefined) delete process.env.SUPERSKILL_MAX_RESPONSE_BYTES;
    else process.env.SUPERSKILL_MAX_RESPONSE_BYTES = savedMax;
  });

  it("serializes compact JSON by default and pretty JSON only with SUPERSKILL_PRETTY=1", () => {
    delete process.env.SUPERSKILL_PRETTY;
    expect(serializeToolResult({ a: 1, b: [2] })).toBe('{"a":1,"b":[2]}');
    process.env.SUPERSKILL_PRETTY = "1";
    expect(serializeToolResult({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("returns text up to the cap and truncates beyond it at a UTF-8-safe boundary", () => {
    expect(capResponseBytes("abcdef", 6)).toBe("abcdef");
    expect(capResponseBytes("abcdef", 3)).toBe("abc\n…[truncated; full size 6 bytes]");
    expect(capResponseBytes("aé", 2)).toBe("a\n…[truncated; full size 3 bytes]");
    expect(capResponseBytes("aé", 2)).not.toContain("\uFFFD");
  });

  it("reads the global response cap from SUPERSKILL_MAX_RESPONSE_BYTES", () => {
    delete process.env.SUPERSKILL_MAX_RESPONSE_BYTES;
    expect(maxResponseBytes()).toBe(DEFAULT_RESPONSE_MAX_BYTES);
    process.env.SUPERSKILL_MAX_RESPONSE_BYTES = "12";
    expect(maxResponseBytes()).toBe(12);
    process.env.SUPERSKILL_MAX_RESPONSE_BYTES = "not-a-number";
    expect(maxResponseBytes()).toBe(DEFAULT_RESPONSE_MAX_BYTES);
  });

  it("resolves read max_bytes with the default and the 10MB cap", () => {
    expect(resolveReadMaxBytes(undefined)).toBe(DEFAULT_READ_MAX_BYTES);
    expect(resolveReadMaxBytes("not-a-number")).toBe(DEFAULT_READ_MAX_BYTES);
    expect(resolveReadMaxBytes(READ_MAX_BYTES_CAP * 2)).toBe(READ_MAX_BYTES_CAP);
    expect(resolveReadMaxBytes(128)).toBe(128);
  });
});

describe("read tool bounding", () => {
  it("documents max_bytes on the read schema", async () => {
    const { createRegistry } = await import("./registry.js");
    const properties = createRegistry().get("read")!.toolDef.inputSchema.properties as Record<string, unknown>;
    expect(properties.max_bytes).toBeDefined();
  });

  it("truncates vault reads beyond max_bytes with a marker", async () => {
    const { createRegistry } = await import("./registry.js");
    const registry = createRegistry();
    const vaultFs = createMockVaultFs("x".repeat(200));
    const ctx: CommandContext = { ...createMockContext(), vaultFs };

    const result = (await registry.execute("read", { path: "big.md", max_bytes: 50 }, ctx)) as string;
    expect(result).toBe(`${"x".repeat(50)}\n…[truncated; full size 200 bytes]`);
    expect(vaultFs.read).toHaveBeenCalledWith("big.md");
  });
});

describe("write tool mode validation", () => {
  it("rejects unknown modes instead of coercing them silently", async () => {
    const { createRegistry } = await import("./registry.js");
    const write = createRegistry().get("write")!;
    for (const mode of ["delete", "replace", "APPEND", ""]) {
      expect(() => write.adaptArgs!({ path: "f.md", content: "c", mode })).toThrow(/Invalid write mode/);
    }
    const adapted = write.adaptArgs!({ path: "f.md", content: "c" }) as { mode?: string };
    expect(adapted.mode).toBeUndefined();
    expect((write.adaptArgs!({ path: "f.md", content: "c", mode: "prepend" }) as { mode?: string }).mode).toBe("prepend");
  });
});

describe("workspace_path injection", () => {
  it("exposes workspace_path on impact and claims and maps it to root", async () => {
    const { createRegistry } = await import("./registry.js");
    const registry = createRegistry();
    for (const name of ["impact", "claims"]) {
      const properties = registry.get(name)!.toolDef.inputSchema.properties as Record<string, unknown>;
      expect(properties.workspace_path, name).toBeDefined();
    }
    expect(registry.get("impact")!.adaptArgs!({ target: "src/a.ts", workspace_path: "/repo" })).toEqual({
      target: "src/a.ts",
      to: undefined,
      root: "/repo",
    });
    expect(registry.get("impact")!.adaptArgs!({ target: "src/a.ts", root: "/fallback" })).toEqual({
      target: "src/a.ts",
      to: undefined,
      root: "/fallback",
    });
    expect(registry.get("claims")!.adaptArgs!({ claims: [], workspace_path: "/repo" })).toEqual({
      claims: [],
      root: "/repo",
    });
  });

  it("passes the new optional flags through their adapters", async () => {
    const { createRegistry } = await import("./registry.js");
    const registry = createRegistry();
    expect(registry.get("session")!.adaptArgs!({ action: "register", allow_shared: true })).toMatchObject({ allowShared: true });
    expect(registry.get("skill_install")!.adaptArgs!({ source: "o/r", allow_unaudited: true })).toMatchObject({ allowUnaudited: true });
    expect(registry.get("hygiene_report")!.adaptArgs!({ due: true })).toMatchObject({ due: true });
    expect(registry.get("project_context")!.adaptArgs!({ detail_level: "full", max_tokens: 1200 })).toMatchObject({ maxTokens: 1200 });
    expect(registry.get("evidence")!.adaptArgs!({ action: "list", ticket: "ticket-001", ts: "2026-01-01T00:00:00Z" }))
      .toMatchObject({ ts: "2026-01-01T00:00:00Z" });
  });
});
