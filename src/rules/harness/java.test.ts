// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { compileJava } from "./java.js";

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
