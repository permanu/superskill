---
id: java-mem-softref-cache
lang: java
prefix: mem
title: "Treat soft references as caches that may be emptied at any time"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [softreference, cache, memory-pressure]
  files: ["**/*.java"]
  symbols: [SoftReference]
related: [java-mem-weak-cache]
sources:
  - title: "SoftReference API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/ref/SoftReference.html
---
> Recompute when a soft reference is cleared; the collector may drop it at any time under memory demand.

## Why

SoftReference objects are "cleared at the discretion of the garbage collector in response to memory demand", and apart from the guarantee that all soft references are cleared before an OutOfMemoryError, "no constraints are placed upon the time at which a soft reference will be cleared or the order in which a set of such references to different objects will be cleared". Code that dereferences get() without a null check fails unpredictably once memory pressure appears, so a cleared reference must be treated as a cache miss.

## Bad

```java
import java.lang.ref.SoftReference;

class ParserPool {
    private final SoftReference<Parser> cached = new SoftReference<>(new Parser());

    Parser parser() {
        return cached.get();
    }
}

class Parser {
}
```

## Good

```java
import java.lang.ref.SoftReference;

class ParserPool {
    private SoftReference<Parser> cached = new SoftReference<>(new Parser());

    Parser parser() {
        Parser parser = cached.get();
        if (parser == null) {
            parser = new Parser();
            cached = new SoftReference<>(parser);
        }
        return parser;
    }
}

class Parser {
}
```

## See Also

- [java-mem-weak-cache](mem-weak-cache.md) - weak keys for mappings that must not pin entries
