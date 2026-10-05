// SPDX-License-Identifier: Apache-2.0

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { HarnessResult } from "../types.js";
import { failResult, okResult, probeTool, runProcess, skippedResult, withTempDir } from "./common.js";

const TOOL = "python3";

export async function compilePython(code: string): Promise<HarnessResult> {
  const tool = await probeTool(TOOL, "python3", ["--version"]);
  if (!tool.available) return skippedResult(TOOL);
  return withTempDir("python", async (dir) => {
    const file = join(dir, "snippet.py");
    await writeFile(file, `${code}\n`, "utf-8");
    const result = await runProcess("python3", ["-m", "py_compile", file], { cwd: dir });
    if (result.missing) return skippedResult(TOOL);
    return result.ok ? okResult(tool.compiler, result.output) : failResult(tool.compiler, result.output);
  });
}
