// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { HarnessResult } from "../types.js";
import { probeTool, runProcess, skippedResult, tryCandidates, withTempDir } from "./common.js";

const TOOL = "javac";

const JAVAC_FEATURE_RE = /javac\s+(\d+)/;

export function compilerFeatureVersion(reported: string): string | null {
  const match = reported.match(JAVAC_FEATURE_RE);
  if (!match) return null;
  const major = Number(match[1]);
  return major >= 11 ? String(major) : null;
}

const TYPE_DECL_RE =
  /(?:^|\n)\s*(?:public\s+|final\s+|abstract\s+|sealed\s+|non-sealed\s+|strictfp\s+)*(?:@\s*interface|class|interface|enum|record)\s+\w+/;

const PUBLIC_TYPE_NAME_RE =
  /(?:^|\n)\s*public\s+(?:final\s+|abstract\s+|sealed\s+|non-sealed\s+|strictfp\s+)*(?:@\s*interface|class|interface|enum|record)\s+(\w+)/;

const METHOD_LIKE_RE =
  /(?:^|\n)\s*(?:(?:public|protected|private|static|final|abstract|synchronized|native|default)\s+|(?:[\w.$<>\[\],?]+\s+)){1,3}\w+\s*\([^;]*\)\s*(?:throws\s+[\w.,\s]+)?\{/;

const PACKAGE_DECL_RE = /(?:^|\n)\s*package\s+[\w.]+\s*;/;

const MODULE_DECL_RE = /(?:^|\n)\s*(?:open\s+)?module\s+[\w.]+\s*\{/;

const JUNIT_IMPORT_RE = /(?:^|\n)\s*import\s+(?:static\s+)?org\.junit\./;
const JMH_IMPORT_RE = /(?:^|\n)\s*import\s+(?:static\s+)?org\.openjdk\.jmh\./;

const JAR_CACHE_DIR = process.env.SUPERSKILL_JAVA_JAR_CACHE ?? join(homedir(), ".superskill", "cache", "jars");

const JAR_ARTIFACTS = [
  "org/junit/jupiter/junit-jupiter-api/5.11.4/junit-jupiter-api-5.11.4.jar",
  "org/junit/jupiter/junit-jupiter-params/5.11.4/junit-jupiter-params-5.11.4.jar",
  "org/junit/platform/junit-platform-commons/1.11.4/junit-platform-commons-1.11.4.jar",
  "org/opentest4j/opentest4j/1.3.0/opentest4j-1.3.0.jar",
  "org/apiguardian/apiguardian-api/1.1.2/apiguardian-api-1.1.2.jar",
  "org/openjdk/jmh/jmh-core/1.37/jmh-core-1.37.jar",
  "net/sf/jopt-simple/jopt-simple/5.0.4/jopt-simple-5.0.4.jar",
  "org/apache/commons/commons-math3/3.6.1/commons-math3-3.6.1.jar",
];

interface JarState {
  ok: boolean;
  output: string;
}

let jarPromise: Promise<JarState> | null = null;

const JAR_MANIFEST_FILE = "manifest.json";

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function readJarManifest(): Promise<Record<string, string>> {
  const file = join(JAR_CACHE_DIR, JAR_MANIFEST_FILE);
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf-8"));
    const manifest: Record<string, string> = {};
    if (parsed && typeof parsed === "object") {
      for (const [name, digest] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof digest === "string" && /^[0-9a-f]{64}$/.test(digest)) manifest[name] = digest;
      }
    }
    return manifest;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error(`[java-harness] jar manifest unreadable: ${(e as Error).message}`);
    return {};
  }
}

async function writeJarManifest(manifest: Record<string, string>): Promise<void> {
  await writeFile(join(JAR_CACHE_DIR, JAR_MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
}

/** Download a jar, verifying against the pinned sha256 with one re-download on mismatch. */
async function fetchPinnedJar(url: string, name: string, expected: string | undefined): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download failed (${response.status}) for ${url}`);
  let buffer = Buffer.from(await response.arrayBuffer());
  if (!expected || sha256(buffer) === expected) return buffer;
  console.error(`[java-harness] hash mismatch for ${name}; re-downloading once`);
  const retry = await fetch(url);
  if (!retry.ok) throw new Error(`download failed (${retry.status}) for ${url}`);
  buffer = Buffer.from(await retry.arrayBuffer());
  if (sha256(buffer) !== expected) {
    throw new Error(`integrity check failed for ${name}: content does not match the pinned sha256`);
  }
  return buffer;
}

async function prepareJars(): Promise<JarState> {
  try {
    await mkdir(JAR_CACHE_DIR, { recursive: true });
    const manifest = await readJarManifest();
    let manifestChanged = false;
    for (const relative of JAR_ARTIFACTS) {
      const name = relative.slice(relative.lastIndexOf("/") + 1);
      const file = join(JAR_CACHE_DIR, name);
      const url = `https://repo1.maven.org/maven2/${relative}`;
      const expected = manifest[name];
      let existing: Buffer | null = null;
      try {
        existing = await readFile(file);
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") return { ok: false, output: `cannot read cached jar ${name}: ${(e as Error).message}` };
      }
      if (existing) {
        const digest = sha256(existing);
        if (expected === undefined) {
          manifest[name] = digest;
          manifestChanged = true;
          continue;
        }
        if (digest === expected) continue;
        console.error(`[java-harness] hash mismatch for ${name}; deleting and re-downloading once`);
        try {
          await unlink(file);
        } catch (e) {
          const code = (e as NodeJS.ErrnoException).code;
          if (code !== "ENOENT") console.error(`[java-harness] could not delete ${name}: ${(e as Error).message}`);
        }
      }
      const buffer = await fetchPinnedJar(url, name, expected);
      await writeFile(file, buffer);
      const digest = sha256(buffer);
      if (manifest[name] !== digest) {
        manifest[name] = digest;
        manifestChanged = true;
      }
    }
    if (manifestChanged) await writeJarManifest(manifest);
    return { ok: true, output: "" };
  } catch (e) {
    return { ok: false, output: e instanceof Error ? e.message : String(e) };
  }
}

function ensureJars(): Promise<JarState> {
  if (!jarPromise) jarPromise = prepareJars();
  return jarPromise;
}

export function javaTypeName(code: string): string {
  const match = code.match(PUBLIC_TYPE_NAME_RE);
  return match ? match[1] : "Snippet";
}

export function wrapJavaMain(code: string): string {
  return `public class Snippet {\n  public static void main(String[] args) {\n${code}\n  }\n}\n`;
}

export function wrapJavaClass(code: string): string {
  return `public class Snippet {\n${code}\n}\n`;
}

export async function compileJava(code: string): Promise<HarnessResult> {
  const tool = await probeTool(TOOL, "javac", ["--version"]);
  if (!tool.available) return skippedResult(TOOL);
  const needsJunit = JUNIT_IMPORT_RE.test(code);
  const needsJmh = JMH_IMPORT_RE.test(code);
  let classpath: string | null = null;
  if (needsJunit || needsJmh) {
    const jars = await ensureJars();
    if (!jars.ok) {
      const missing = [needsJunit ? "junit-jupiter" : "", needsJmh ? "jmh-core" : ""].filter(Boolean).join(", ");
      return {
        ok: false,
        skipped: true,
        compiler: "skipped",
        output: `missing-dependency: ${missing} jars unavailable (${jars.output})`,
      };
    }
    classpath = join(JAR_CACHE_DIR, "*");
  }
  const candidates: { file: string; code: string }[] = [];
  if (TYPE_DECL_RE.test(code)) {
    candidates.push({ file: `${javaTypeName(code)}.java`, code });
  } else if (MODULE_DECL_RE.test(code)) {
    candidates.push({ file: "module-info.java", code });
  } else if (PACKAGE_DECL_RE.test(code)) {
    candidates.push({ file: "package-info.java", code });
  } else if (METHOD_LIKE_RE.test(code)) {
    candidates.push({ file: "Snippet.java", code: wrapJavaClass(code) });
    candidates.push({ file: "Snippet.java", code: wrapJavaMain(code) });
  } else {
    candidates.push({ file: "Snippet.java", code: wrapJavaMain(code) });
    candidates.push({ file: "Snippet.java", code: wrapJavaClass(code) });
  }
  return withTempDir("java", async (dir) => {
    return tryCandidates(
      tool.compiler,
      candidates.map((candidate) => candidate.code),
      async (candidateCode) => {
        const target = candidates.find((candidate) => candidate.code === candidateCode) ?? candidates[0];
        const file = join(dir, target.file);
        await writeFile(file, `${candidateCode}\n`, "utf-8");
        const args = ["-d", dir];
        // Preview APIs (FFM, unnamed variables) need --enable-preview plus a
        // matching --release on every JDK; it is a no-op for final APIs.
        const feature = compilerFeatureVersion(tool.compiler);
        if (feature) args.push("--enable-preview", "--release", feature);
        if (classpath) args.push("-cp", classpath);
        args.push(file);
        return runProcess("javac", args, { cwd: dir });
      },
    );
  });
}
