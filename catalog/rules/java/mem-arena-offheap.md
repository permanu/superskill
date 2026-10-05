---
id: java-mem-arena-offheap
lang: java
prefix: mem
title: "Manage off-heap memory with an Arena you close"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [off-heap, native-memory, arena, foreign]
  files: ["**/*.java"]
  symbols: [Arena, MemorySegment]
related: [java-mem-arena-confined]
sources:
  - title: "Arena API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/foreign/Arena.html
---
> Give native memory an owner: allocate through an arena and close it, instead of using the never-freed global arena.

## Why

Arena "controls the lifecycle of native memory segments, providing both flexible allocation and timely deallocation". Segments allocated with the global arena "are always accessible and their backing regions of memory are never deallocated", so repeated use leaks off-heap memory for the life of the process, while closing a bounded arena releases "any off-heap region of memory backing the segments obtained from this arena". Wrapping the work in try-with-resources makes the release deterministic.

## Bad

```java
import java.lang.foreign.Arena;
import java.lang.foreign.MemorySegment;

class FrameBuffer {
    MemorySegment allocate(long bytes) {
        return Arena.global().allocate(bytes);
    }
}
```

## Good

```java
import java.lang.foreign.Arena;
import java.lang.foreign.MemorySegment;
import java.lang.foreign.ValueLayout;

class FrameBuffer {
    void process(byte[] frame) {
        try (Arena arena = Arena.ofConfined()) {
            MemorySegment segment = arena.allocateFrom(ValueLayout.JAVA_BYTE, frame);
            consume(segment);
        }
    }

    private void consume(MemorySegment segment) {
    }
}
```

## See Also

- [java-mem-arena-confined](mem-arena-confined.md) - choosing the arena kind for the accessing threads
