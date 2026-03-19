import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommandExecutor } from "./executor.js";
import { loggingMiddleware } from "./middleware/logging.js";
import { errorHandlerMiddleware } from "./middleware/error-handler.js";
import { VaultError } from "../lib/vault-fs.js";
import type { CommandContext, CommandHandler, Middleware, MCPToolDefinition } from "./types.js";

function createMockContext(): CommandContext {
  return {
    vaultFs: {} as any,
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

describe("CommandExecutor", () => {
  let executor: CommandExecutor;
  let ctx: CommandContext;

  beforeEach(() => {
    executor = new CommandExecutor();
    ctx = createMockContext();
  });

  describe("register and execute", () => {
    it("executes a registered command handler", async () => {
      const handler = async (args: { name: string }) => {
        return `Hello, ${args.name}!`;
      };

      executor.register("greet", handler as CommandHandler);
      const result = await executor.execute("greet", { name: "World" }, ctx);

      expect(result).toBe("Hello, World!");
    });

    it("throws for unknown command", async () => {
      await expect(executor.execute("unknown", {}, ctx)).rejects.toThrow("Unknown command: unknown");
    });

    it("stores tool definition when provided", () => {
      const handler: CommandHandler = async () => null;
      const toolDef: MCPToolDefinition = {
        name: "test_tool",
        description: "A test tool",
        inputSchema: { type: "object" },
      };

      executor.register("test", handler, toolDef);
      const defs = executor.getToolDefinitions();

      expect(defs).toHaveLength(1);
      expect(defs[0].name).toBe("test_tool");
      expect(defs[0].description).toBe("A test tool");
    });

    it("returns empty array when no tool definitions registered", () => {
      expect(executor.getToolDefinitions()).toEqual([]);
    });

    it("returns all registered tool definitions", () => {
      const handler: CommandHandler = async () => null;

      executor.register("cmd1", handler, { name: "tool1", description: "Tool 1", inputSchema: {} });
      executor.register("cmd2", handler, { name: "tool2", description: "Tool 2", inputSchema: {} });
      executor.register("cmd3", handler);

      const defs = executor.getToolDefinitions();
      expect(defs).toHaveLength(2);
      expect(defs.map((d: MCPToolDefinition) => d.name)).toEqual(["tool1", "tool2"]);
    });
  });

  describe("middleware", () => {
    it("executes middleware in registration order", async () => {
      const order: string[] = [];

      const mw1: Middleware = async (_ctx, next) => {
        order.push("mw1-before");
        const result = await next();
        order.push("mw1-after");
        return result;
      };

      const mw2: Middleware = async (_ctx, next) => {
        order.push("mw2-before");
        const result = await next();
        order.push("mw2-after");
        return result;
      };

      const handler: CommandHandler = async () => {
        order.push("handler");
        return "done";
      };

      executor.use(mw1);
      executor.use(mw2);
      executor.register("test", handler);

      await executor.execute("test", {}, ctx);

      expect(order).toEqual(["mw1-before", "mw2-before", "handler", "mw2-after", "mw1-after"]);
    });

    it("handler is the final next()", async () => {
      const handler: CommandHandler = async () => "handler-result";
      executor.register("test", handler);

      const result = await executor.execute("test", {}, ctx);
      expect(result).toBe("handler-result");
    });

    it("middleware can modify context", async () => {
      const mw: Middleware = async (ctx, next) => {
        (ctx as any).custom = "modified";
        return next();
      };

      let receivedCtx: CommandContext | null = null;
      const handler: CommandHandler = async (_args, ctx) => {
        receivedCtx = ctx;
        return "done";
      };

      executor.use(mw);
      executor.register("test", handler);

      await executor.execute("test", {}, ctx);

      expect((receivedCtx as any)?.custom).toBe("modified");
    });

    it("middleware can short-circuit", async () => {
      const mw: Middleware = async () => {
        return "short-circuit";
      };

      let handlerCalled = false;
      const handler: CommandHandler = async () => {
        handlerCalled = true;
        return "handler";
      };

      executor.use(mw);
      executor.register("test", handler);

      const result = await executor.execute("test", {}, ctx);

      expect(result).toBe("short-circuit");
      expect(handlerCalled).toBe(false);
    });
  });
});

describe("loggingMiddleware", () => {
  let ctx: CommandContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it("logs debug on start and success with duration", async () => {
    const start = Date.now();
    const result = await loggingMiddleware("test-cmd")(ctx, async () => "result");
    const elapsed = Date.now() - start;

    expect(ctx.log.debug).toHaveBeenCalledTimes(2);
    expect(ctx.log.debug).toHaveBeenNthCalledWith(1, "[test-cmd] Starting");
    expect(ctx.log.debug).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\[test-cmd] Completed in \d+ms/)
    );
    expect(result).toBe("result");
  });

  it("logs error on failure with duration", async () => {
    const error = new Error("test error");

    await expect(
      loggingMiddleware("test-cmd")(ctx, async () => {
        throw error;
      })
    ).rejects.toThrow(error);

    expect(ctx.log.error).toHaveBeenCalledTimes(1);
    expect(ctx.log.error).toHaveBeenCalledWith(
      expect.stringMatching(/\[test-cmd] Failed after \d+ms:/),
      error
    );
  });
});

describe("errorHandlerMiddleware", () => {
  let ctx: CommandContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it("passes through successful results", async () => {
    const result = await errorHandlerMiddleware(ctx, async () => "success");
    expect(result).toBe("success");
  });

  it("converts VaultError to MCP error format", async () => {
    const vaultError = new VaultError("FILE_NOT_FOUND", "The file was not found");

    try {
      await errorHandlerMiddleware(ctx, async () => {
        throw vaultError;
      });
      expect.fail("Should have thrown");
    } catch (e: any) {
      const parsed = JSON.parse(e.message);
      expect(parsed).toEqual({
        error: "FILE_NOT_FOUND",
        message: "The file was not found",
      });
    }
  });

  it("converts generic error to INTERNAL_ERROR", async () => {
    const genericError = new Error("Something went wrong");

    try {
      await errorHandlerMiddleware(ctx, async () => {
        throw genericError;
      });
      expect.fail("Should have thrown");
    } catch (e: any) {
      const parsed = JSON.parse(e.message);
      expect(parsed).toEqual({
        error: "INTERNAL_ERROR",
        message: "Something went wrong",
      });
    }
  });

  it("preserves VaultError code in response", async () => {
    const vaultError = new VaultError("PERMISSION_DENIED", "Access denied");

    try {
      await errorHandlerMiddleware(ctx, async () => {
        throw vaultError;
      });
      expect.fail("Should have thrown");
    } catch (e: any) {
      const parsed = JSON.parse(e.message);
      expect(parsed.error).toBe("PERMISSION_DENIED");
    }
  });
});
