// SPDX-License-Identifier: Apache-2.0

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { HarnessResult } from "../types.js";
import { probeTool, runProcess, skippedResult, tryCandidates, withTempDir } from "./common.js";

const TOOL = "clang";

const C_INCLUDES = [
  "#include <stdbool.h>",
  "#include <stdint.h>",
  "#include <stdio.h>",
  "#include <stdlib.h>",
  "#include <string.h>",
].join("\n");

export function splitPreamble(code: string): { preamble: string; rest: string } {
  const lines = code.split("\n");
  let end = 0;
  while (end < lines.length) {
    const line = lines[end].trim();
    if (line === "" || line.startsWith("//") || /^#\s*(?:include|define|undef|pragma|if|ifdef|ifndef|endif|else|elif|error|line)\b/.test(line)) {
      end += 1;
      continue;
    }
    break;
  }
  return { preamble: lines.slice(0, end).join("\n"), rest: lines.slice(end).join("\n") };
}

export function wrapCMain(code: string): string {
  const { preamble, rest } = splitPreamble(code);
  return `${preamble}\n${C_INCLUDES}\n\nint main(void) {\n${rest}\nreturn 0;\n}\n`;
}

export async function compileC(code: string): Promise<HarnessResult> {
  const tool = await probeTool(TOOL, "clang", ["--version"]);
  if (!tool.available) return skippedResult(TOOL);
  return withTempDir("c", async (dir) => {
    const file = join(dir, "snippet.c");
    return tryCandidates(tool.compiler, [code, wrapCMain(code)], async (candidate) => {
      await writeFile(file, `${candidate}\n`, "utf-8");
      return runProcess("clang", ["-fsyntax-only", "-std=c23", file], { cwd: dir });
    });
  });
}
