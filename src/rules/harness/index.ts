// SPDX-License-Identifier: Apache-2.0

import type { HarnessResult } from "../types.js";
import { compileC } from "./c.js";
import { compileCpp } from "./cpp.js";
import { compileGo } from "./go.js";
import { compileJava } from "./java.js";
import { compilePython } from "./python.js";
import { compileRust } from "./rust.js";
import { compileSwift } from "./swift.js";
import { compileTypeScript } from "./typescript.js";

const COMPILERS: Record<string, (code: string) => Promise<HarnessResult>> = {
  rust: compileRust,
  typescript: compileTypeScript,
  python: compilePython,
  go: compileGo,
  swift: compileSwift,
  java: compileJava,
  c: compileC,
  cpp: compileCpp,
};

export async function compileSnippet(lang: string, code: string): Promise<HarnessResult> {
  const compiler = COMPILERS[lang];
  if (!compiler) {
    return { ok: false, skipped: true, compiler: "skipped", output: `no harness for language "${lang}"` };
  }
  if (code.trim() === "") {
    return { ok: false, skipped: false, compiler: "n/a", output: "snippet is empty" };
  }
  return compiler(code);
}

export {
  compileC,
  compileCpp,
  compileGo,
  compileJava,
  compilePython,
  compileRust,
  compileSwift,
  compileTypeScript,
};
