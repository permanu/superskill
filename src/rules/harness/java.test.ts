// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { compileJava, compilerFeatureVersion } from "./java.js";

describe("compileJava unit-level snippets", () => {
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
