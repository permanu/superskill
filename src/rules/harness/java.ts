// SPDX-License-Identifier: Apache-2.0

import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
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

interface JarArtifact {
  readonly path: string;
  readonly sha256: string;
}

export const JAR_ARTIFACTS: readonly JarArtifact[] = [
  { path: "org/junit/jupiter/junit-jupiter-api/5.11.4/junit-jupiter-api-5.11.4.jar", sha256: "ab83ef9e51ac4597d59d26b4b58812129550e2f579a404c8af7d09f5ce5b4293" },
  { path: "org/junit/jupiter/junit-jupiter-params/5.11.4/junit-jupiter-params-5.11.4.jar", sha256: "02a6e015de7ce94ac7f256e7fa05b8091dea861fe79a555a7993313d0f6c7d96" },
  { path: "org/junit/platform/junit-platform-commons/1.11.4/junit-platform-commons-1.11.4.jar", sha256: "9edd969b0d0670c54105bc91ae79bd1c6f503e12115faba82073b84c86bbc334" },
  { path: "org/opentest4j/opentest4j/1.3.0/opentest4j-1.3.0.jar", sha256: "48e2df636cab6563ced64dcdff8abb2355627cb236ef0bf37598682ddf742f1b" },
  { path: "org/apiguardian/apiguardian-api/1.1.2/apiguardian-api-1.1.2.jar", sha256: "b509448ac506d607319f182537f0b35d71007582ec741832a1f111e5b5b70b38" },
  { path: "org/openjdk/jmh/jmh-core/1.37/jmh-core-1.37.jar", sha256: "dc0eaf2bbf0036a70b60798c785d6e03a9daf06b68b8edb0f1ba9eb3421baeb3" },
  { path: "net/sf/jopt-simple/jopt-simple/5.0.4/jopt-simple-5.0.4.jar", sha256: "df26cc58f235f477db07f753ba5a3ab243ebe5789d9f89ecf68dd62ea9a66c28" },
  { path: "org/apache/commons/commons-math3/3.6.1/commons-math3-3.6.1.jar", sha256: "1e56d7b058d28b65abd256b8458e3885b674c1d588fa43cd7d1cbb9c7ef2b308" },
];

type JarState = { ok: true; output: string; classpath: string } | { ok: false; output: string };

let jarPromise: Promise<JarState> | null = null;

const MAX_JAR_BYTES = 8 * 1024 * 1024;
const JAR_DOWNLOAD_TIMEOUT_MS = 15_000;

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function fetchPinnedJar(relative: string): Promise<Buffer> {
  const response = await fetch(`https://repo.maven.apache.org/maven2/${relative}`, {
    redirect: "error",
    signal: AbortSignal.timeout(JAR_DOWNLOAD_TIMEOUT_MS),
  });
  if (!response.ok || Number(response.headers.get("content-length")) > MAX_JAR_BYTES) {
    await response.body?.cancel();
    if (!response.ok) throw new Error(`download failed (${response.status}) for ${relative}`);
    throw new Error(`jar download exceeds ${MAX_JAR_BYTES} bytes: ${relative}`);
  }
  if (!response.body) throw new Error(`empty download for ${relative}`);
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > MAX_JAR_BYTES) throw new Error(`jar download exceeds ${MAX_JAR_BYTES} bytes: ${relative}`);
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, size);
}

async function readCachedJar(file: string): Promise<Buffer | null> {
  let handle;
  try {
    handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
  try {
    const info = await handle.stat();
    if (!info.isFile() || (process.getuid && info.uid !== process.getuid())) throw new Error(`unsafe cached jar: ${file}`);
    if (info.size > MAX_JAR_BYTES) throw new Error(`cached jar exceeds ${MAX_JAR_BYTES} bytes: ${file}`);
    await handle.chmod(0o600);
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      size += chunk.length;
      if (size > MAX_JAR_BYTES) throw new Error(`cached jar exceeds ${MAX_JAR_BYTES} bytes: ${file}`);
      chunks.push(chunk);
    }
    return Buffer.concat(chunks, size);
  } finally {
    await handle.close();
  }
}

async function writeCachedJar(file: string, bytes: Buffer): Promise<void> {
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, bytes, { flag: "wx", mode: 0o600 });
    await rename(temp, file);
  } finally {
    await unlink(temp).catch((e: NodeJS.ErrnoException) => {
      if (e.code !== "ENOENT") console.error(`[java-harness] could not remove temporary jar: ${e.message}`);
    });
  }
}

export async function prepareJavaJars(cacheDir = JAR_CACHE_DIR, artifacts: readonly JarArtifact[] = JAR_ARTIFACTS): Promise<JarState> {
  try {
    if (cacheDir.includes(delimiter)) throw new Error("jar cache path contains a classpath delimiter");
    await mkdir(cacheDir, { recursive: true, mode: 0o700 });
    const directory = await open(cacheDir, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_DIRECTORY);
    try {
      const info = await directory.stat();
      if (!info.isDirectory() || (process.getuid && info.uid !== process.getuid())) throw new Error(`unsafe jar cache: ${cacheDir}`);
      await directory.chmod(0o700);
    } finally {
      await directory.close();
    }
    const files: string[] = [];
    for (const artifact of artifacts) {
      if (!/^(?:[\w.-]+\/)+[\w.-]+\.jar$/.test(artifact.path) || artifact.path.split("/").some((part) => part === "." || part === "..") || !/^[a-f0-9]{64}$/.test(artifact.sha256)) {
        throw new Error("invalid pinned jar artifact");
      }
      const name = artifact.path.slice(artifact.path.lastIndexOf("/") + 1);
      const file = join(cacheDir, name);
      const existing = await readCachedJar(file);
      const bytes = existing ?? await fetchPinnedJar(artifact.path);
      if (sha256(bytes) !== artifact.sha256) throw new Error(`integrity check failed for ${name}: content does not match the pinned sha256`);
      if (!existing) await writeCachedJar(file, bytes);
      files.push(file);
    }
    return { ok: true, output: "", classpath: files.join(delimiter) };
  } catch (e) {
    return { ok: false, output: e instanceof Error ? e.message : String(e) };
  }
}

function ensureJars(): Promise<JarState> {
  if (!jarPromise) jarPromise = prepareJavaJars().finally(() => { jarPromise = null; });
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
    classpath = jars.classpath;
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
