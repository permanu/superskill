// SPDX-License-Identifier: Apache-2.0

import { mkdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { HarnessResult } from "../types.js";
import { probeTool, runProcess, skippedResult, tryCandidates, withTempDir } from "./common.js";

const TOOL = "javac";

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

async function prepareJars(): Promise<JarState> {
  try {
    await mkdir(JAR_CACHE_DIR, { recursive: true });
    for (const relative of JAR_ARTIFACTS) {
      const file = join(JAR_CACHE_DIR, relative.slice(relative.lastIndexOf("/") + 1));
      try {
        await stat(file);
        continue;
      } catch {
        // missing — download below
      }
      const url = `https://repo1.maven.org/maven2/${relative}`;
      const response = await fetch(url);
      if (!response.ok) return { ok: false, output: `download failed (${response.status}) for ${url}` };
      await writeFile(file, Buffer.from(await response.arrayBuffer()));
    }
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
        if (classpath) args.push("-cp", classpath);
        args.push(file);
        return runProcess("javac", args, { cwd: dir });
      },
    );
  });
}
