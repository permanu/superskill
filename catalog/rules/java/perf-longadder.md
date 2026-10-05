---
id: java-perf-longadder
lang: java
prefix: perf
title: "Use LongAdder for counters updated from many threads"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [counter, contention, metrics, atomic]
  files: ["**/*.java"]
  symbols: [LongAdder, AtomicLong]
related: [java-conc-atomic-counters, java-perf-threadlocalrandom]
sources:
  - title: "LongAdder API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/atomic/LongAdder.html
---
> Prefer LongAdder over AtomicLong for statistics counters that many threads update.

## Why

The LongAdder documentation calls the class "usually preferable to AtomicLong when multiple threads update a common sum", with expected throughput that is "significantly higher" under high contention. AtomicLong funnels every increment through a single CAS that retries as threads collide; LongAdder spreads updates across cells and combines them on read. Use AtomicLong where an atomic snapshot or CAS semantics are required, and LongAdder where the value is a statistic.

## Bad

```java
import java.util.concurrent.atomic.AtomicLong;

class RequestMetrics {

    private final AtomicLong requests = new AtomicLong();

    void record() {
        requests.incrementAndGet();
    }

    long total() {
        return requests.get();
    }
}
```

## Good

```java
import java.util.concurrent.atomic.LongAdder;

class RequestMetrics {

    private final LongAdder requests = new LongAdder();

    void record() {
        requests.increment();
    }

    long total() {
        return requests.sum();
    }
}
```

## See Also

- [java-conc-atomic-counters](conc-atomic-counters.md) - the atomicity rule this refines
- [java-perf-threadlocalrandom](perf-threadlocalrandom.md) - another contention fix
