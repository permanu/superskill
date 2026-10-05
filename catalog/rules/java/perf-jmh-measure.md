---
id: java-perf-jmh-measure
lang: java
prefix: perf
title: "Benchmark JVM code with JMH, not hand-rolled timing loops"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [benchmark, microbenchmark, performance, measure]
  files: ["**/*.java"]
  symbols: [Benchmark, JMH]
related: [java-perf-parallel-stream-gate]
sources:
  - title: "JMH project page"
    url: https://openjdk.org/projects/code-tools/jmh/
  - title: "JEP 230: Microbenchmark Suite"
    url: https://openjdk.org/jeps/230
---
> Measure JVM performance with JMH; a hand-rolled nanoTime loop reports the interpreter, not the optimized code.

## Why

JEP 230 added the JDK microbenchmark suite "based on the Java Microbenchmark Harness (JMH)" so that only "stable, tuned, and accurate microbenchmarks" ship, and the JMH project page describes it as "a Java harness for building, running, and analysing nano/micro/milli/macro benchmarks written in Java and other languages targetting the JVM". A hand-rolled loop runs in a single JVM with no warmup control: early iterations measure the interpreter, the JIT can eliminate work whose result is unused, and runs are not forked. JMH supplies warmup, forking, and measurement modes so the numbers mean something.

## Bad

```java
public class StringJoinTimer {

    public static void main(String[] args) {
        String[] parts = { "a", "b", "c" };
        long start = System.nanoTime();
        String result = "";
        for (int i = 0; i < 1_000_000; i++) {
            result = String.join(",", parts);
        }
        long elapsed = System.nanoTime() - start;
        System.out.println(result + " took " + elapsed + " ns");
    }
}
```

## Good

```java
import org.openjdk.jmh.annotations.Benchmark;
import org.openjdk.jmh.annotations.BenchmarkMode;
import org.openjdk.jmh.annotations.Fork;
import org.openjdk.jmh.annotations.Mode;
import org.openjdk.jmh.annotations.Scope;
import org.openjdk.jmh.annotations.Setup;
import org.openjdk.jmh.annotations.State;

@BenchmarkMode(Mode.Throughput)
@Fork(2)
@State(Scope.Thread)
public class StringJoinBenchmark {

    private String[] parts;

    @Setup
    public void setUp() {
        parts = new String[] { "a", "b", "c" };
    }

    @Benchmark
    public String join() {
        return String.join(",", parts);
    }
}
```

## See Also

- [java-perf-parallel-stream-gate](perf-parallel-stream-gate.md) - whether parallelism pays off is a measurement question
