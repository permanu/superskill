---
id: java-conc-bounded-queue
lang: java
prefix: conc
title: "Bound queues to apply backpressure"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [queue, backpressure, bounded, producer]
  files: ["**/*.java"]
  symbols: [ArrayBlockingQueue]
related: [java-conc-blocking-queue]
sources:
  - title: "ArrayBlockingQueue API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/ArrayBlockingQueue.html
---
> Give producer-consumer queues a capacity so a full queue blocks producers instead of growing.

## Why

ArrayBlockingQueue is documented as "a bounded blocking queue backed by an array" and "a classic 'bounded buffer', in which a fixed-sized array holds elements inserted by producers and extracted by consumers. Once created, the capacity cannot be changed. Attempts to put an element into a full queue will result in the operation blocking." An unbounded queue never blocks the producer, so when consumers fall behind, the backlog grows until memory runs out and the failure appears far from its cause.

## Bad

```java
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

class Pipeline {
    private final BlockingQueue<String> work = new LinkedBlockingQueue<>();

    void submit(String item) throws InterruptedException {
        work.put(item);
    }
}
```

## Good

```java
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

class Pipeline {
    private final BlockingQueue<String> work = new ArrayBlockingQueue<>(100);

    void submit(String item) throws InterruptedException {
        work.put(item);
    }
}
```

## See Also

- [java-conc-blocking-queue](conc-blocking-queue.md) - handing work between threads with a queue
