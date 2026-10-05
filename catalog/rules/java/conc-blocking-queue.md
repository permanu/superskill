---
id: java-conc-blocking-queue
lang: java
prefix: conc
title: "Hand off work between threads with a BlockingQueue, not wait/notify"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [blockingqueue, producer, consumer, wait, notify]
  files: ["**/*.java"]
  symbols: [BlockingQueue, ArrayBlockingQueue]
related: [java-conc-concurrent-collections, java-conc-latch-not-poll]
sources:
  - title: "java.util.concurrent package summary"
    url: https://docs.oracle.com/javase/23/docs/api/java.base/java/util/concurrent/package-summary.html
---
> Move items between producer and consumer threads through a BlockingQueue.

## Why

The java.util.concurrent package summary presents the blocking queues as ready-made producer-consumer handoffs: "Five implementations in java.util.concurrent support the extended BlockingQueue interface... The different classes cover the most common usage contexts for producer-consumer, messaging, parallel tasking, and related concurrent designs." A hand-written wait/notify queue reimplements that protocol and gets the loop, the condition, and the missed-signal edge cases wrong; the package also gives the happens-before guarantee that a put is visible to the corresponding take.

## Bad

```java
import java.util.ArrayDeque;
import java.util.Queue;

class Handoff {
    private final Queue<String> items = new ArrayDeque<>();

    synchronized void put(String item) {
        items.add(item);
        notifyAll();
    }

    synchronized String take() throws InterruptedException {
        while (items.isEmpty()) {
            wait();
        }
        return items.remove();
    }
}
```

## Good

```java
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

class Handoff {
    private final BlockingQueue<String> items = new ArrayBlockingQueue<>(16);

    void put(String item) throws InterruptedException {
        items.put(item);
    }

    String take() throws InterruptedException {
        return items.take();
    }
}
```

## See Also

- [java-conc-concurrent-collections](conc-concurrent-collections.md) - the map/set side of the same package
- [java-conc-latch-not-poll](conc-latch-not-poll.md) - waiting for a condition rather than an item
