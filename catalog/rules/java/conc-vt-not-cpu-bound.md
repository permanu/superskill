---
id: java-conc-vt-not-cpu-bound
lang: java
prefix: conc
title: "Run CPU-bound work on platform threads, not virtual threads"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [virtual thread, cpu-bound, parallelism, computation]
  files: ["**/*.java"]
  symbols: [Executors.newFixedThreadPool, Thread.ofVirtual]
related: [java-conc-vt-blocking-style, java-conc-vt-not-pooled]
sources:
  - title: "Thread API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Thread.html
  - title: "JEP 444: Virtual Threads"
    url: https://openjdk.org/jeps/444
---
> Send computation to a bounded platform-thread pool; reserve virtual threads for tasks that wait.

## Why

The Thread API states that virtual threads "are not intended for long running CPU intensive operations", and JEP 444 is blunt about why: "Virtual threads are not faster threads — they do not run code any faster than platform threads." Their value is scale for tasks that block; a CPU-bound task never unmounts, so a million virtual threads running computations simply contend for the same cores while adding scheduling and memory overhead.

## Bad

```java
import java.util.concurrent.Executors;

class Compress {
    void compressAll(java.util.List<byte[]> blocks) {
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (byte[] block : blocks) {
                executor.submit(() -> compress(block));
            }
        }
    }

    private void compress(byte[] block) {
    }
}
```

## Good

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

class Compress {
    private final ExecutorService cpuPool =
            Executors.newFixedThreadPool(Runtime.getRuntime().availableProcessors());

    void compressAll(java.util.List<byte[]> blocks) {
        for (byte[] block : blocks) {
            cpuPool.submit(() -> compress(block));
        }
    }

    private void compress(byte[] block) {
    }
}
```

## See Also

- [java-conc-vt-blocking-style](conc-vt-blocking-style.md) - the blocking workload virtual threads are built for
- [java-conc-vt-not-pooled](conc-vt-not-pooled.md) - why this platform pool is a different decision
