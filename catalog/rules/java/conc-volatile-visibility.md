---
id: java-conc-volatile-visibility
lang: java
prefix: conc
title: "Make shared flags volatile so writes become visible to other threads"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [volatile, visibility, flag, happens-before]
  files: ["**/*.java"]
  symbols: [volatile]
related: [java-conc-atomic-counters, java-conc-lock-consistency]
sources:
  - title: "java.util.concurrent package summary"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/package-summary.html
---
> Mark state that other threads poll as volatile; plain fields give no visibility guarantee.

## Why

The java.util.concurrent package summary states the memory rule: "The results of a write by one thread are guaranteed to be visible to a read by another thread only if the write operation happens-before the read operation", and "A write to a volatile field happens-before every subsequent read of that same field." Without that edge, a polling loop can read a cached value forever even after another thread has written the new one. Volatile supplies visibility, not mutual exclusion, which is exactly what a stop flag needs.

## Bad

```java
class Flag {
    private boolean running = true;

    void stop() {
        running = false;
    }

    void loop() {
        while (running) {
            // the reader has no guarantee of seeing the write
        }
    }
}
```

## Good

```java
class Flag {
    private volatile boolean running = true;

    void stop() {
        running = false;
    }

    void loop() {
        while (running) {
            // the volatile read sees the latest write
        }
    }
}
```

## See Also

- [java-conc-atomic-counters](conc-atomic-counters.md) - when the shared state needs atomic updates too
- [java-conc-lock-consistency](conc-lock-consistency.md) - when several fields must change together
