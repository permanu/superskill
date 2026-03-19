import type { CommandContext, Middleware } from "../types.js";

export function loggingMiddleware(moduleName: string): Middleware {
  return async (ctx: CommandContext, next: () => Promise<unknown>) => {
    const start = Date.now();
    ctx.log.debug(`[${moduleName}] Starting`);

    try {
      const result = await next();
      const elapsed = Date.now() - start;
      ctx.log.debug(`[${moduleName}] Completed in ${elapsed}ms`);
      return result;
    } catch (error) {
      const elapsed = Date.now() - start;
      ctx.log.error(`[${moduleName}] Failed after ${elapsed}ms:`, error);
      throw error;
    }
  };
}
