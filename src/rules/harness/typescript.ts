// SPDX-License-Identifier: Apache-2.0

import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { HarnessResult } from "../types.js";
import { failResult, okResult, probeTool, runProcess, skippedResult, withTempDir } from "./common.js";

const TSC_FLAGS = [
  "--noEmit",
  "--strict",
  "--target",
  "es2022",
  "--module",
  "nodenext",
  "--moduleResolution",
  "nodenext",
];

function tscCompiler(raw: string): string {
  const match = raw.match(/Version\s+(\S+)/);
  return match ? `tsc ${match[1]}` : "tsc";
}

function localTscPath(): string | null {
  const candidate = fileURLToPath(new URL("../../../node_modules/typescript/bin/tsc", import.meta.url));
  return existsSync(candidate) ? candidate : null;
}

export async function compileTypeScript(code: string): Promise<HarnessResult> {
  const local = localTscPath();
  const tool = local
    ? await probeTool("tsc-local", process.execPath, [local, "--version"], tscCompiler)
    : await probeTool("tsc-global", "tsc", ["--version"], tscCompiler);
  if (!tool.available) return skippedResult("tsc");
  const base = local ? [process.execPath, local] : ["tsc"];
  return withTempDir("typescript", async (dir) => {
    const file = join(dir, "snippet.ts");
    await writeFile(file, `${code}\n`, "utf-8");
    const result = await runProcess(base[0], [...base.slice(1), ...TSC_FLAGS, file], { cwd: dir });
    if (result.missing) return skippedResult("tsc");
    return result.ok ? okResult(tool.compiler, result.output) : failResult(tool.compiler, result.output);
  });
}
