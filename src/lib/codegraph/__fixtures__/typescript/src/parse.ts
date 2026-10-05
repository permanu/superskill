import { normalize } from "./util.js";
import type { Options } from "./types.js";

export type Level = "error" | "warn";

export const DEFAULT_LEVEL: Level = "warn";

export class Reporter {
  private count = 0;

  constructor(private options: Options) {}

  report(message: string): Level {
    this.count += 1;
    return format(message, this.options.strict);
  }
}

export function format(message: string, strict: boolean): Level {
  if (strict) {
    return "error";
  }
  return normalize(message);
}
