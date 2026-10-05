---
id: java-mem-arena-confined
lang: java
prefix: mem
title: "Match the arena kind to the threads that touch the memory"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [arena, thread-confinement, native-memory]
  files: ["**/*.java"]
  symbols: [Arena.ofConfined, Arena.ofShared]
related: [java-mem-arena-offheap]
sources:
  - title: "Arena API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/foreign/Arena.html
---
> Use confined arenas for single-threaded access and shared arenas when multiple threads touch the segments.

## Why

The Arena documentation states that memory segments allocated with a confined arena "can only be accessed (and closed) by the thread that created the arena", and that "any attempt to close the confined arena from a thread other than the owner thread will fail with a WrongThreadException". Shared arenas "have no owner thread", their segments "can be accessed by any thread", and they "can be closed by any thread". Picking confined for memory that crosses threads turns every access from another thread into a runtime failure.

## Bad

```java
import java.lang.foreign.Arena;
import java.lang.foreign.MemorySegment;

class SharedScratch {
    private final Arena arena = Arena.ofConfined();

    MemorySegment allocate(long bytes) {
        return arena.allocate(bytes);
    }
}
```

## Good

```java
import java.lang.foreign.Arena;
import java.lang.foreign.MemorySegment;

class SharedScratch {
    private final Arena arena = Arena.ofShared();

    MemorySegment allocate(long bytes) {
        return arena.allocate(bytes);
    }
}
```

## See Also

- [java-mem-arena-offheap](mem-arena-offheap.md) - closing arenas to release native memory
