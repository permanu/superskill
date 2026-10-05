---
id: java-mem-cleaner-no-capture
lang: java
prefix: mem
title: "Never let a cleaning action reference the object being cleaned"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cleaner, capture, phantom, cleanup]
  files: ["**/*.java"]
  symbols: [Cleaner, Runnable]
related: [java-mem-cleaner-explicit-clean]
sources:
  - title: "Cleaner API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/ref/Cleaner.html
---
> Put cleanup state in a static carrier; an action that captures the object prevents it from ever becoming phantom reachable.

## Why

The Cleaner documentation states that "the cleaning action must not refer to the object being registered" because "if so, the object will not become phantom reachable and the cleaning action will not be invoked automatically". The API note warns that a lambda "all too easily will capture the object reference, by referring to fields of the object being cleaned", and recommends a static nested class that holds only the state needed for cleanup.

## Bad

```java
import java.lang.ref.Cleaner;

class NativeBuffer {
    private static final Cleaner CLEANER = Cleaner.create();
    private final long handle;

    NativeBuffer(long handle) {
        this.handle = handle;
        CLEANER.register(this, () -> cleanup());
    }

    private void cleanup() {
        release(handle);
    }

    private static void release(long handle) {
    }
}
```

## Good

```java
import java.lang.ref.Cleaner;

class NativeBuffer {
    private static final Cleaner CLEANER = Cleaner.create();

    private record State(long handle) implements Runnable {
        @Override
        public void run() {
            release(handle);
        }
    }

    private final Cleaner.Cleanable cleanable;

    NativeBuffer(long handle) {
        this.cleanable = CLEANER.register(this, new State(handle));
    }

    private static void release(long handle) {
    }
}
```

## See Also

- [java-mem-cleaner-explicit-clean](mem-cleaner-explicit-clean.md) - calling clean() as the primary release path
