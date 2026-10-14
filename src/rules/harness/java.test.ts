// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, stat, symlink, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compileJava, compilerFeatureVersion, JAR_ARTIFACTS, prepareJavaJars } from "./java.js";

describe("compileJava unit-level snippets", () => {
  it("preserves compilation of statement and class-member snippets", async () => {
    for (const code of ["System.out.println(42);", "int answer() { return 42; }"]) {
      const result = await compileJava(code);
      if (result.skipped) return;
      expect(result.ok, result.output).toBe(true);
    }
  }, 60_000);

  it("compiles @interface declarations as-is", async () => {
    const result = await compileJava(`import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
@interface Audited {
}`);
    if (result.skipped) return;
    expect(result.ok, result.output).toBe(true);
  }, 60_000);
});

describe("compileJava dependency classpath", () => {
  it("compiles JUnit snippets via the cached jar classpath", async () => {
    const result = await compileJava(`import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

class PointTest {
    @Test
    void coordinates() {
        assertAll(
                () -> assertEquals(3, 3),
                () -> assertEquals(4, 4));
    }
}`);
    if (result.skipped) {
      expect(result.output).toContain("missing-dependency");
      return;
    }
    expect(result.ok, result.output).toBe(true);
  }, 120_000);

  it("compiles JMH snippets via the cached jar classpath", async () => {
    const result = await compileJava(`import org.openjdk.jmh.annotations.Benchmark;

public class StringJoinBenchmark {
    @Benchmark
    public String join() {
        return String.join(",", "a", "b");
    }
}`);
    if (result.skipped) {
      expect(result.output).toContain("missing-dependency");
      return;
    }
    expect(result.ok, result.output).toBe(true);
  }, 120_000);
});

describe("compilerFeatureVersion", () => {
  it("parses the JDK feature version for preview and release flags", () => {
    expect(compilerFeatureVersion("javac 21.0.12.1")).toBe("21");
    expect(compilerFeatureVersion("javac 23")).toBe("23");
    expect(compilerFeatureVersion("javac 1.8.0_401")).toBeNull();
    expect(compilerFeatureVersion("unknown")).toBeNull();
  });
});

describe("compileJava preview APIs", () => {
  it("compiles FFM snippets via --enable-preview on the installed JDK", async () => {
    const result = await compileJava(`import java.lang.foreign.Arena;
import java.lang.foreign.MemorySegment;

class ArenaDemo {
    long size() {
        try (Arena arena = Arena.ofConfined()) {
            MemorySegment segment = arena.allocate(64);
            return segment.byteSize();
        }
    }
}`);
    if (result.skipped) return;
    const feature = Number(compilerFeatureVersion(result.compiler) ?? "0");
    if (!Number.isFinite(feature) || feature < 21) return;
    expect(result.ok, result.output).toBe(true);
  }, 120_000);
});

describe("Java jar supply chain", () => {
  const bytes = Buffer.from("verified test jar");
  const artifact = {
    path: "example/tool/1.0/tool-1.0.jar",
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  let root: string;
  let cache: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "java-jar-integrity-"));
    cache = join(root, "cache");
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  it("pins a SHA-256 for every fixed Maven artifact", () => {
    expect(JAR_ARTIFACTS).toHaveLength(8);
    for (const entry of JAR_ARTIFACTS) {
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.path).toMatch(/\/[^/]+-\d[^/]*\.jar$/);
    }
  });

  it("verifies downloads, restricts permissions, and excludes unlisted jars from the classpath", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(bytes));
    vi.stubGlobal("fetch", fetchMock);
    await mkdir(cache, { mode: 0o755 });
    await writeFile(join(cache, "unverified.jar"), "untrusted");
    const result = await prepareJavaJars(cache, [artifact]);
    expect(result.ok, result.output).toBe(true);
    expect(result.ok && result.classpath.split(delimiter)).toEqual([join(cache, "tool-1.0.jar")]);
    expect(await readFile(join(cache, "tool-1.0.jar"))).toEqual(bytes);
    expect((await stat(cache)).mode & 0o777).toBe(0o700);
    expect((await stat(join(cache, "tool-1.0.jar"))).mode & 0o777).toBe(0o600);
    expect(fetchMock).toHaveBeenCalledWith(`https://repo.maven.apache.org/maven2/${artifact.path}`, {
      redirect: "error",
      signal: expect.any(AbortSignal),
    });
  });

  it("rechecks cached bytes on every preparation instead of trusting a writable manifest", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(bytes)));
    expect((await prepareJavaJars(cache, [artifact])).ok).toBe(true);
    await writeFile(join(cache, "tool-1.0.jar"), "tampered");
    await writeFile(join(cache, "manifest.json"), JSON.stringify({
      "tool-1.0.jar": createHash("sha256").update("tampered").digest("hex"),
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await prepareJavaJars(cache, [artifact]);
    expect(result.ok).toBe(false);
    expect(result.output).toContain("integrity check failed");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await readFile(join(cache, "tool-1.0.jar"), "utf-8")).toBe("tampered");
  });

  it("uses a verified cached jar without fetching and tightens its permissions", async () => {
    await mkdir(cache);
    await writeFile(join(cache, "tool-1.0.jar"), bytes, { mode: 0o644 });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await prepareJavaJars(cache, [artifact])).ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await stat(join(cache, "tool-1.0.jar"))).mode & 0o777).toBe(0o600);
  });

  it("fails closed on a downloaded digest mismatch without caching it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("tampered")));
    const result = await prepareJavaJars(cache, [artifact]);
    expect(result.ok).toBe(false);
    expect(result.output).toContain("integrity check failed");
    await expect(stat(join(cache, "tool-1.0.jar"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects oversized declared downloads before reading the body", async () => {
    const response = new Response(bytes, { headers: { "content-length": String(8 * 1024 * 1024 + 1) } });
    const reader = vi.spyOn(response.body!, "getReader");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    const result = await prepareJavaJars(cache, [artifact]);
    expect(result.ok).toBe(false);
    expect(result.output).toContain("exceeds");
    expect(reader).not.toHaveBeenCalled();
  });

  it("caps streamed downloads even without a content length and cancels the body", async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(8 * 1024 * 1024));
        controller.enqueue(new Uint8Array(1));
      },
      cancel,
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    const result = await prepareJavaJars(cache, [artifact]);
    expect(result.ok).toBe(false);
    expect(result.output).toContain("exceeds");
    expect(cancel).toHaveBeenCalled();
    await expect(stat(join(cache, "tool-1.0.jar"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("sets a finite timeout for each download and reports HTTP failures", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    const result = await prepareJavaJars(cache, [artifact]);
    expect(result.ok).toBe(false);
    expect(result.output).toContain("503");
    expect(timeout).toHaveBeenCalledWith(15_000);
  });

  it("rejects oversized cached files without fetching", async () => {
    await mkdir(cache);
    const file = join(cache, "tool-1.0.jar");
    await writeFile(file, bytes);
    await truncate(file, 8 * 1024 * 1024 + 1);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await prepareJavaJars(cache, [artifact]);
    expect(result.ok).toBe(false);
    expect(result.output).toContain("exceeds");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects symlink cache directories without altering their targets", async () => {
    const target = join(root, "target");
    await mkdir(target, { mode: 0o755 });
    await symlink(target, cache);
    const result = await prepareJavaJars(cache, [artifact]);
    expect(result.ok).toBe(false);
    expect((await stat(target)).mode & 0o777).toBe(0o755);
  });

  it("rejects symlink jar files without reading or overwriting their targets", async () => {
    await mkdir(cache);
    const target = join(root, "target.jar");
    await writeFile(target, bytes, { mode: 0o644 });
    await symlink(target, join(cache, "tool-1.0.jar"));
    const result = await prepareJavaJars(cache, [artifact]);
    expect(result.ok).toBe(false);
    expect((await stat(target)).mode & 0o777).toBe(0o644);
    expect(await readFile(target)).toEqual(bytes);
  });

  it("rejects cache paths that would inject another classpath entry", async () => {
    const unsafe = `${cache}${delimiter}other`;
    const result = await prepareJavaJars(unsafe, [artifact]);
    expect(result.ok).toBe(false);
    expect(result.output).toContain("classpath delimiter");
    await expect(stat(unsafe)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects non-file cached jars and invalid artifact pins without fetching", async () => {
    await mkdir(join(cache, "tool-1.0.jar"), { recursive: true });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await prepareJavaJars(cache, [artifact])).output).toContain("unsafe cached jar");
    for (const invalid of [{ ...artifact, path: "../tool.jar" }, { ...artifact, sha256: "" }]) {
      const result = await prepareJavaJars(cache, [invalid]);
      expect(result.ok).toBe(false);
      expect(result.output).toContain("invalid pinned jar");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports download timeouts and empty responses without leaving a cached jar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("download timed out", "TimeoutError")));
    expect((await prepareJavaJars(cache, [artifact])).output).toContain("timed out");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null)));
    expect((await prepareJavaJars(cache, [artifact])).output).toContain("empty download");
    await expect(stat(join(cache, "tool-1.0.jar"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
