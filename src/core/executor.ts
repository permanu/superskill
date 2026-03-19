import type { CommandContext, CommandHandler, Middleware, MCPToolDefinition } from "./types.js";

export class CommandExecutor {
  private handlers = new Map<string, CommandHandler>();
  private toolDefinitions = new Map<string, MCPToolDefinition>();
  private middlewares: Middleware[] = [];

  register(name: string, handler: CommandHandler, toolDef?: MCPToolDefinition): void {
    this.handlers.set(name, handler);
    if (toolDef) {
      this.toolDefinitions.set(name, toolDef);
    }
  }

  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  async execute(name: string, args: unknown, ctx: CommandContext): Promise<unknown> {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`Unknown command: ${name}`);
    }

    const chain = this.buildChain(handler);
    return chain(ctx, args);
  }

  getToolDefinitions(): MCPToolDefinition[] {
    const defs: MCPToolDefinition[] = [];
    for (const def of this.toolDefinitions.values()) {
      defs.push(def);
    }
    return defs;
  }

  private buildChain(handler: CommandHandler): (ctx: CommandContext, args: unknown) => Promise<unknown> {
    let chain = async (ctx: CommandContext, args: unknown) => handler(args, ctx);

    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const mw = this.middlewares[i];
      const next = chain;
      chain = async (ctx: CommandContext, args: unknown) => {
        const boundNext = () => next(ctx, args);
        return mw(ctx, boundNext);
      };
    }

    return chain;
  }
}
