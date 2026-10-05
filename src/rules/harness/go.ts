// SPDX-License-Identifier: Apache-2.0

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { HarnessResult } from "../types.js";
import { failResult, okResult, probeTool, runProcess, skippedResult, withTempDir } from "./common.js";

const TOOL = "go";

const GO_STDLIB_PACKAGES = [
  "fmt",
  "os",
  "io",
  "io/fs",
  "strings",
  "strconv",
  "sync",
  "sync/atomic",
  "sync/semaphore",
  "time",
  "context",
  "errors",
  "sort",
  "slices",
  "maps",
  "cmp",
  "iter",
  "math",
  "math/big",
  "math/bits",
  "math/rand",
  "bytes",
  "bufio",
  "path",
  "path/filepath",
  "net",
  "net/http",
  "net/url",
  "net/http/httptest",
  "encoding/json",
  "encoding/xml",
  "encoding/csv",
  "encoding/hex",
  "encoding/base64",
  "encoding/binary",
  "regexp",
  "testing",
  "testing/fstest",
  "testing/synctest",
  "log",
  "log/slog",
  "runtime",
  "runtime/debug",
  "runtime/pprof",
  "runtime/trace",
  "net/http/pprof",
  "unsafe",
  "flag",
  "expvar",
  "crypto/rand",
  "crypto/subtle",
  "crypto/tls",
  "crypto/md5",
  "crypto/sha1",
  "crypto/sha256",
  "html/template",
  "text/template",
  "database/sql",
  "os/exec",
  "os/signal",
  "os/user",
  "reflect",
  "unicode",
  "unicode/utf8",
  "unicode/utf16",
  "container/heap",
  "hash/crc32",
  "hash/fnv",
];

const CRYPTO_RAND_RE = /rand\.(?:Read|Reader|Prime|Text)\b/;
const PPROF_RUNTIME_RE = /pprof\.(?:Do|Labels|Label|StartCPUProfile|StopCPUProfile|Lookup|WriteHeapProfile|Profiles|SetLabel|ForLabels|NewProfile)\b/;
const PPROF_HTTP_RE = /pprof\.(?:Index|Profile|Trace|Cmdline|Handler|Symbol)\b/;

function goCompiler(raw: string): string {
  const match = raw.match(/go version go(\S+)/);
  return match ? `go ${match[1]}` : "go";
}

export function stripGoCommentsAndStrings(code: string): string {
  let out = "";
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      while (i < code.length) {
        if (code[i] === "\\") {
          i += 2;
          continue;
        }
        if (code[i] === quote || code[i] === "\n") {
          i += 1;
          break;
        }
        i += 1;
      }
      out += " ";
      continue;
    }
    if (ch === "`") {
      i += 1;
      while (i < code.length && code[i] !== "`") i += 1;
      i += 1;
      out += " ";
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      while (i < code.length && code[i] !== "\n") i += 1;
      out += " ";
      continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      i += 2;
      while (i < code.length && !(code[i] === "*" && code[i + 1] === "/")) i += 1;
      i += 2;
      out += " ";
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function pickPath(ident: string, paths: string[], code: string): string {
  if (ident === "pprof") {
    if (PPROF_RUNTIME_RE.test(code)) return "runtime/pprof";
    if (PPROF_HTTP_RE.test(code)) return "net/http/pprof";
  }
  if (ident === "rand" && CRYPTO_RAND_RE.test(code)) return "crypto/rand";
  return paths[0];
}

export function detectStdlibImports(source: string): string[] {
  const code = stripGoCommentsAndStrings(source);
  const byIdent = new Map<string, string[]>();
  for (const pkg of GO_STDLIB_PACKAGES) {
    const ident = pkg.slice(pkg.lastIndexOf("/") + 1);
    const paths = byIdent.get(ident) ?? [];
    paths.push(pkg);
    byIdent.set(ident, paths);
  }
  const selected: string[] = [];
  for (const [ident, paths] of byIdent) {
    if (!new RegExp(`(^|[^\\w.])${ident}\\.`).test(code)) continue;
    selected.push(pickPath(ident, paths, code));
  }
  return selected.sort();
}

function insertImportBlock(source: string, imports: string[]): string {
  const lines = source.split("\n");
  const packageIndex = lines.findIndex((line) => /^\s*package\s+\w+/.test(line));
  const block = ["import (", ...imports.map((pkg) => `\t"${pkg}"`), ")"];
  if (packageIndex === -1) return `${block.join("\n")}\n\n${source}`;
  const before = lines.slice(0, packageIndex + 1);
  const after = lines.slice(packageIndex + 1);
  while (after.length > 0 && after[0].trim() === "") after.shift();
  return [...before, "", ...block, "", ...after].join("\n");
}

export function wrapGoSource(code: string): string {
  let source = code;
  const stripped = stripGoCommentsAndStrings(source);
  if (!/^\s*package\s/m.test(stripped)) {
    source = `package main\n\n${source}`;
  }
  if (!/(?:^|\n)\s*import\s/.test(stripped)) {
    const imports = detectStdlibImports(stripped);
    if (imports.length > 0) source = insertImportBlock(source, imports);
  }
  const finalStripped = stripGoCommentsAndStrings(source);
  if (/^\s*package\s+main\b/m.test(finalStripped) && !/\bfunc\s+main\s*\(/.test(finalStripped)) {
    source = `${source.replace(/\s*$/, "")}\n\nfunc main() {}\n`;
  }
  return source;
}

export async function compileGo(code: string): Promise<HarnessResult> {
  const tool = await probeTool(TOOL, "go", ["version"], goCompiler);
  if (!tool.available) return skippedResult(TOOL);
  const versionMatch = tool.compiler.match(/\bgo (\d+\.\d+)/);
  const goVersion = versionMatch ? versionMatch[1] : "1.21";
  return withTempDir("go", async (dir) => {
    await writeFile(join(dir, "go.mod"), `module rulesnippet\n\ngo ${goVersion}\n`, "utf-8");
    await writeFile(join(dir, "main.go"), `${wrapGoSource(code)}\n`, "utf-8");
    const result = await runProcess("go", ["build", "./..."], { cwd: dir });
    if (result.missing) return skippedResult(TOOL);
    return result.ok ? okResult(tool.compiler, result.output) : failResult(tool.compiler, result.output);
  });
}
