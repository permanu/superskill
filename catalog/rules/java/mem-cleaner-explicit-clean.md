---
id: java-mem-cleaner-explicit-clean
lang: java
prefix: mem
title: "Call clean() explicitly; the Cleaner is only a backstop"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cleaner, cleanup, resource, close]
  files: ["**/*.java"]
  symbols: [Cleaner, Cleanable]
related: [java-api-no-finalize, java-mem-cleaner-no-capture]
sources:
  - title: "Cleaner API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/ref/Cleaner.html
---
> Release resources through close() or clean(), not by waiting for the cleaner thread to notice.

## Why

The Cleaner documentation says "the most efficient use is to explicitly invoke the clean method when the object is closed or no longer needed", with the cleaning action running "at most once when the object has become phantom reachable unless it has already been explicitly cleaned". Explicit release returns the resource at a defined point; relying on phantom reachability ties release to an unspecified garbage collection cycle and multiplies the window in which the resource is still held.

## Bad

```java
import java.lang.ref.Cleaner;

class NativeBuffer {
    private static final Cleaner CLEANER = Cleaner.create();
    private final long handle;

    NativeBuffer(long handle) {
        this.handle = handle;
        long h = handle;
        CLEANER.register(this, () -> release(h));
    }

    private static void release(long handle) {
    }
}
```

## Good

```java
import java.lang.ref.Cleaner;

class NativeBuffer implements AutoCloseable {
    private static final Cleaner CLEANER = Cleaner.create();
    private final long handle;
    private final Cleaner.Cleanable cleanable;

    NativeBuffer(long handle) {
        this.handle = handle;
        long h = handle;
        this.cleanable = CLEANER.register(this, () -> release(h));
    }

    private static void release(long handle) {
    }

    @Override
    public void close() {
        cleanable.clean();
    }
}
```

## See Also

- [java-api-no-finalize](api-no-finalize.md) - why finalization is not the answer
- [java-mem-cleaner-no-capture](mem-cleaner-no-capture.md) - the capture rule for the registered action
