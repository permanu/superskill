// SPDX-License-Identifier: Apache-2.0

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { HarnessResult } from "../types.js";
import { splitPreamble } from "./c.js";
import { probeTool, runProcess, skippedResult, tryCandidates, withTempDir } from "./common.js";

const TOOL = "clang++";

const CPP_INCLUDES = [
  "#include <cstdint>",
  "#include <cstdio>",
  "#include <cstdlib>",
  "#include <iostream>",
  "#include <string>",
  "#include <vector>",
].join("\n");

export function wrapCppMain(code: string): string {
  const { preamble, rest } = splitPreamble(code);
  return `${preamble}\n${CPP_INCLUDES}\n\nint main() {\n${rest}\nreturn 0;\n}\n`;
}

export async function compileCpp(code: string): Promise<HarnessResult> {
  const tool = await probeTool(TOOL, "clang++", ["--version"]);
  if (!tool.available) return skippedResult(TOOL);
  return withTempDir("cpp", async (dir) => {
    const file = join(dir, "snippet.cpp");
    return tryCandidates(tool.compiler, [code, wrapCppMain(code)], async (candidate) => {
      await writeFile(file, `${candidate}\n`, "utf-8");
      return runProcess("clang++", ["-fsyntax-only", "-std=c++23", file], { cwd: dir });
    });
  });
}
