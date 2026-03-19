import type { CommandContext, Middleware, MCPErrorResponse } from "../types.js";
import { VaultError } from "../../lib/vault-fs.js";

export const errorHandlerMiddleware: Middleware = async (
  ctx: CommandContext,
  next: () => Promise<unknown>
) => {
  try {
    return await next();
  } catch (error) {
    let response: MCPErrorResponse;

    if (error instanceof VaultError) {
      response = {
        error: error.code,
        message: error.message,
      };
    } else if (error instanceof Error) {
      response = {
        error: "INTERNAL_ERROR",
        message: error.message,
      };
    } else {
      response = {
        error: "INTERNAL_ERROR",
        message: String(error),
      };
    }

    throw new Error(JSON.stringify(response));
  }
};
