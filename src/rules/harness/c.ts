// SPDX-License-Identifier: Apache-2.0

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { HarnessResult } from "../types.js";
import { fallbackResult, probeTool, runProcess, skippedResult, tryCandidates, withTempDir } from "./common.js";

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

// Strict -std=c* hides POSIX/BSD declarations in glibc (strtok_r, sigaction,
// strerror_r, O_CLOEXEC, arc4random_buf); _DEFAULT_SOURCE exposes them while
// keeping the XSI strerror_r variant.
const FEATURE_MACROS = ["-D_DEFAULT_SOURCE"];

async function attemptC(cmd: string, stdFlag: string, code: string): Promise<HarnessResult> {
  const tool = await probeTool(cmd, cmd, ["--version"]);
  if (!tool.available) return skippedResult(TOOL);
  return withTempDir("c", async (dir) => {
    const file = join(dir, "snippet.c");
    return tryCandidates(tool.compiler, [code, wrapCMain(code)], async (candidate) => {
      await writeFile(file, `${candidate}\n`, "utf-8");
      return runProcess(cmd, ["-fsyntax-only", stdFlag, ...FEATURE_MACROS, file], { cwd: dir });
    });
  });
}

export async function compileC(code: string): Promise<HarnessResult> {
  // clang < 19 has no C23 `constexpr`; GCC 13+ provides it under -std=c2x.
  return fallbackResult(
    () => attemptC("clang", "-std=c23", code),
    () => attemptC("gcc", "-std=c2x", code),
  );
}
