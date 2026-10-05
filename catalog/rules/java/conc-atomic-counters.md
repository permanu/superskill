---
id: java-conc-atomic-counters
lang: java
prefix: conc
title: "Use atomic classes for shared counters instead of plain increments"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [atomic, counter, increment, race]
  files: ["**/*.java"]
  symbols: [AtomicLong, AtomicInteger]
related: [java-conc-volatile-visibility, java-conc-lock-consistency]
sources:
  - title: "java.util.concurrent.atomic package summary"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/atomic/package-summary.html
---
> Update shared counters through atomic classes; a plain read-modify-write loses concurrent updates.

## Why

The java.util.concurrent.atomic package is "a small toolkit of classes that support lock-free thread-safe programming on single variables", and its summary shows the sequence-number idiom built on AtomicLong.getAndIncrement(). A plain `count++` is a read followed by a write with no happens-before edge between threads, so two concurrent increments can both read the same value and one update is lost. Volatile alone does not fix this because it does not make the read-modify-write atomic.

## Bad

```java
class Hits {
    private long count;

    void hit() {
        count++;
    }

    long count() {
        return count;
    }
}
```

## Good

```java
import java.util.concurrent.atomic.AtomicLong;

class Hits {
    private final AtomicLong count = new AtomicLong();

    void hit() {
        count.incrementAndGet();
    }

    long count() {
        return count.get();
    }
}
```

## See Also

- [java-conc-volatile-visibility](conc-volatile-visibility.md) - visibility without atomicity
- [java-conc-lock-consistency](conc-lock-consistency.md) - when a group of fields must change as one unit
