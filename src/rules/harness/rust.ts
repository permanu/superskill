// SPDX-License-Identifier: Apache-2.0

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { HarnessResult } from "../types.js";
import {
  COMPILE_TIMEOUT_MS,
  failResult,
  okResult,
  probeTool,
  runProcess,
  skippedResult,
  withTempDir,
} from "./common.js";

const TOOL = "rustc";
const FETCH_TIMEOUT_MS = 300_000;
const WARM_TIMEOUT_MS = 900_000;

const RUSTC_FLAGS = ["--edition", "2024", "--crate-type", "lib", "--emit", "metadata"];

const PROC_MACRO_RE = /proc_macro\s*::|#\[\s*proc_macro/;
const UNRESOLVED_CRATE_RE = /\bE0432\b|\bE0433\b|\bE0463\b/;

const LIB_MANIFEST = `[package]
name = "snippet-fixture"
version = "0.1.0"
edition = "2024"
publish = false

[workspace]

[lib]
path = "src/lib.rs"

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
thiserror = "2"
anyhow = "1"
indexmap = "2"
rayon = "1"
criterion = "0.5"
proptest = "1"
once_cell = "1"
rand = "0.9"
futures = "0.3"
bytes = "1"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
env_logger = "0.11"
syn = { version = "2", features = ["full", "extra-traits"] }
quote = "1"
proc-macro2 = "1"
rustc-hash = "2"
ahash = "0.8"
smallvec = "1"
thin-vec = "0.2"
static_assertions = "1"
compact_str = "0.8"
bumpalo = "3"
arrayvec = "0.7"
reqwest = { version = "0.12", features = ["blocking", "json"] }
toml = "0.8"
regex = "1"
itertools = "0.14"
log = "0.4"
lazy_static = "1"
tempfile = "3"
mockall = "0.13"
insta = { version = "1", features = ["json"] }
async-trait = "0.1"
tokio-util = { version = "0.7", features = ["full"] }
autocfg = "1"
`;

const PROC_MACRO_MANIFEST = `[package]
name = "snippet-proc-fixture"
version = "0.1.0"
edition = "2024"
publish = false

[workspace]

[lib]
path = "src/lib.rs"
proc-macro = true

[dependencies]
syn = { version = "2", features = ["full", "extra-traits"] }
quote = "1"
proc-macro2 = "1"
`;

const PLACEHOLDER_LIB = "// placeholder for the superskill rust harness fixture\n";

type FixtureKind = "lib" | "proc-macro";

interface ProjectState {
  ok: boolean;
  output: string;
}

const projectPromises = new Map<FixtureKind, Promise<ProjectState>>();

export function rustHarnessBaseDir(): string {
  return process.env.SUPERSKILL_RUST_HARNESS_DIR ?? join(homedir(), ".superskill", "cache", "rust-harness");
}

function manifestFor(kind: FixtureKind): string {
  return kind === "proc-macro" ? PROC_MACRO_MANIFEST : LIB_MANIFEST;
}

function fixtureEnv(targetDir: string, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return { CARGO_TARGET_DIR: targetDir, CARGO_TERM_COLOR: "never", ...extra };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function prepareProject(kind: FixtureKind): Promise<ProjectState> {
  const base = rustHarnessBaseDir();
  const dir = join(base, kind);
  const target = join(base, "target");
  const manifestPath = join(dir, "Cargo.toml");
  const libPath = join(dir, "src", "lib.rs");
  const lockPath = join(dir, "Cargo.lock");
  try {
    await mkdir(join(dir, "src"), { recursive: true });
    await mkdir(target, { recursive: true });
    let existing: string | null = null;
    try {
      existing = await readFile(manifestPath, "utf-8");
    } catch {
      existing = null;
    }
    if (existing !== manifestFor(kind) || !(await fileExists(lockPath))) {
      await writeFile(manifestPath, manifestFor(kind), "utf-8");
      await writeFile(libPath, PLACEHOLDER_LIB, "utf-8");
      const fetch = await runProcess("cargo", ["fetch"], {
        cwd: dir,
        timeoutMs: FETCH_TIMEOUT_MS,
        env: fixtureEnv(target),
      });
      if (!fetch.ok) return { ok: false, output: fetch.output || "cargo fetch failed" };
      const warm = await runProcess("cargo", ["check", "--quiet"], {
        cwd: dir,
        timeoutMs: WARM_TIMEOUT_MS,
        env: fixtureEnv(target),
      });
      if (!warm.ok) return { ok: false, output: warm.output || "cargo check warmup failed" };
    }
    return { ok: true, output: "" };
  } catch (e) {
    return { ok: false, output: e instanceof Error ? e.message : String(e) };
  }
}

function ensureProject(kind: FixtureKind): Promise<ProjectState> {
  const cached = projectPromises.get(kind);
  if (cached) return cached;
  const promise = prepareProject(kind);
  projectPromises.set(kind, promise);
  return promise;
}

async function cargoCompile(
  rustcCompiler: string,
  kind: FixtureKind,
  candidates: string[],
): Promise<HarnessResult> {
  const cargo = await probeTool("cargo", "cargo", ["--version"]);
  if (!cargo.available) return skippedResult("cargo");
  const label = `${rustcCompiler} (cargo fixture)`;
  const project = await ensureProject(kind);
  if (!project.ok) {
    const reason = project.output.split(/\r?\n/)[0]?.trim() || "fixture preparation failed";
    return { ok: false, skipped: true, compiler: "skipped", output: `${kind} cargo fixture unavailable: ${reason}` };
  }
  const base = rustHarnessBaseDir();
  const target = join(base, "target");
  const lock = join(base, kind, "Cargo.lock");
  return withTempDir(`rust-${kind}`, async (dir) => {
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(join(dir, "Cargo.toml"), manifestFor(kind), "utf-8");
    await copyFile(lock, join(dir, "Cargo.lock"));
    let firstFailure = "";
    for (const candidate of candidates) {
      await writeFile(join(dir, "src", "lib.rs"), `${candidate}\n`, "utf-8");
      const result = await runProcess("cargo", ["check", "--offline", "--quiet"], {
        cwd: dir,
        timeoutMs: COMPILE_TIMEOUT_MS,
        env: fixtureEnv(target, { CARGO_NET_OFFLINE: "true" }),
      });
      if (result.missing) return skippedResult("cargo");
      if (result.ok) return okResult(label, result.output);
      firstFailure = firstFailure || result.output;
    }
    return failResult(label, firstFailure);
  });
}

export async function compileRust(code: string): Promise<HarnessResult> {
  const tool = await probeTool(TOOL, "rustc", ["--version"]);
  if (!tool.available) return skippedResult(TOOL);
  const procMacro = PROC_MACRO_RE.test(code);
  const candidates = procMacro ? [code] : [...new Set([code, `fn main() {\n${code}\n}`])];
  if (!procMacro) {
    const fast = await withTempDir("rust", async (dir): Promise<HarnessResult | null> => {
      const file = join(dir, "snippet.rs");
      const outputs: string[] = [];
      for (const candidate of candidates) {
        await writeFile(file, `${candidate}\n`, "utf-8");
        const result = await runProcess("rustc", [...RUSTC_FLAGS, "--out-dir", dir, file]);
        if (result.missing) return skippedResult(TOOL);
        if (result.ok) return okResult(tool.compiler, result.output);
        outputs.push(result.output);
        if (UNRESOLVED_CRATE_RE.test(result.output)) return null;
      }
      return failResult(tool.compiler, outputs[0] ?? "");
    });
    if (fast) return fast;
  }
  return cargoCompile(tool.compiler, procMacro ? "proc-macro" : "lib", candidates);
}
