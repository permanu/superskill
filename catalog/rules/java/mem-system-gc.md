---
id: java-mem-system-gc
lang: java
prefix: mem
title: "Never call System.gc() to solve a memory problem"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [gc, garbage-collection, memory, runtime]
  files: ["**/*.java"]
  symbols: [System.gc, Runtime.gc]
related: [java-mem-lru-bound]
sources:
  - title: "Runtime API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Runtime.html
---
> Treat System.gc() as a no-op hint; the VM reclaims memory automatically and decides when.

## Why

The Runtime.gc documentation says a call "suggests that the Java Virtual Machine expend effort toward recycling unused objects", with "no guarantee that this effort will recycle any particular number of unused objects, reclaim any particular amount of space, or complete at any particular time", and it closes with "the Java Virtual Machine performs this recycling process automatically as needed, in a separate thread, even if the gc method is not invoked explicitly". A call site that depends on System.gc() for correctness is relying on a hint the VM may ignore, and frequent calls can stall throughput.

## Bad

```java
import java.util.List;

class BatchJob {
    void process(List<byte[]> payloads) {
        for (byte[] payload : payloads) {
            consume(payload);
        }
        System.gc();
    }

    private void consume(byte[] payload) {
    }
}
```

## Good

```java
import java.util.List;

class BatchJob {
    void process(List<byte[]> payloads) {
        for (byte[] payload : payloads) {
            consume(payload);
        }
    }

    private void consume(byte[] payload) {
    }
}
```

## See Also

- [java-mem-lru-bound](mem-lru-bound.md) - fixing retention instead of poking the collector
