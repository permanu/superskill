---
id: java-perf-threadlocalrandom
lang: java
prefix: perf
title: "Use ThreadLocalRandom instead of a shared Random in concurrent code"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [random, contention, concurrency, thread]
  files: ["**/*.java"]
  symbols: [ThreadLocalRandom, Random]
related: [java-perf-longadder]
sources:
  - title: "ThreadLocalRandom API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/ThreadLocalRandom.html
---
> Give each thread its own random generator; a shared Random serializes every draw on its seed.

## Why

The ThreadLocalRandom documentation states that "use of ThreadLocalRandom rather than shared Random objects in concurrent programs will typically encounter much less overhead and contention". A single Random keeps one atomic seed that every nextInt call updates, so parallel workers retry against each other, while ThreadLocalRandom gives each thread an isolated generator. Reach for it when random numbers are generated from multiple threads and no explicit seed is required.

## Bad

```java
import java.util.Random;

class Backoff {

    private static final Random RANDOM = new Random();

    static long nextDelayMillis() {
        return RANDOM.nextInt(100);
    }
}
```

## Good

```java
import java.util.concurrent.ThreadLocalRandom;

class Backoff {

    static long nextDelayMillis() {
        return ThreadLocalRandom.current().nextInt(100);
    }
}
```

## See Also

- [java-perf-longadder](perf-longadder.md) - the same contention pattern for counters
