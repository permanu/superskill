---
id: java-conc-latch-not-poll
lang: java
prefix: conc
title: "Wait on a synchronizer such as CountDownLatch instead of polling a flag"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [countdownlatch, poll, sleep, synchronizer]
  files: ["**/*.java"]
  symbols: [CountDownLatch]
related: [java-conc-blocking-queue, java-conc-lock-consistency]
sources:
  - title: "java.util.concurrent package summary"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/package-summary.html
---
> Block on a CountDownLatch instead of sleeping in a loop until a flag flips.

## Why

The java.util.concurrent package summary lists CountDownLatch among the synchronizers, "a very simple yet very common utility for blocking until a given number of signals, events, or conditions hold", and its memory section guarantees that actions before countDown "happen-before actions subsequent to a successful acquiring method such as ... CountDownLatch.await". A polling loop burns wakeups, adds latency equal to the sleep interval, and still needs volatile or a lock for the flag to be visible at all.

## Bad

```java
class Startup {
    private volatile boolean ready;

    void markReady() {
        ready = true;
    }

    void await() throws InterruptedException {
        while (!ready) {
            Thread.sleep(10);
        }
    }
}
```

## Good

```java
import java.util.concurrent.CountDownLatch;

class Startup {
    private final CountDownLatch ready = new CountDownLatch(1);

    void markReady() {
        ready.countDown();
    }

    void await() throws InterruptedException {
        ready.await();
    }
}
```

## See Also

- [java-conc-blocking-queue](conc-blocking-queue.md) - waiting for items rather than a condition
- [java-conc-lock-consistency](conc-lock-consistency.md) - the happens-before guarantees these tools build on
