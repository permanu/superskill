---
id: java-ffi-memory-access
lang: java
prefix: ffi
title: "Access native memory through layout-typed MemorySegment reads"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ffm, memorysegment, valuelayout, access]
  files: ["**/*.java"]
  symbols: [MemorySegment.get, ValueLayout]
related: [java-ffi-downcall]
sources:
  - title: "MemorySegment API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/foreign/MemorySegment.html
---
> Read and write with the layout that describes the data, not by assembling bytes.

## Why

The MemorySegment documentation says "a memory segment provides access to a contiguous region of memory", and its get and set methods take a ValueLayout that names the type and byte order of the access. Assembling an int from four JAVA_BYTE reads duplicates the endianness decision in application code and makes an off-by-one in the offsets impossible to see; a single JAVA_INT access states both.

## Bad

```java
import java.lang.foreign.MemorySegment;
import java.lang.foreign.ValueLayout;

class Buffer {
    int readInt(MemorySegment segment) {
        return segment.get(ValueLayout.JAVA_BYTE, 0) << 24
                | segment.get(ValueLayout.JAVA_BYTE, 1) << 16
                | segment.get(ValueLayout.JAVA_BYTE, 2) << 8
                | segment.get(ValueLayout.JAVA_BYTE, 3);
    }
}
```

## Good

```java
import java.lang.foreign.MemorySegment;
import java.lang.foreign.ValueLayout;

class Buffer {
    int readInt(MemorySegment segment) {
        return segment.get(ValueLayout.JAVA_INT, 0);
    }
}
```

## See Also

- [java-ffi-downcall](ffi-downcall.md) - passing segments to foreign functions
