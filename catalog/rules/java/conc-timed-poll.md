---
id: java-conc-timed-poll
lang: java
prefix: conc
title: "Use timed poll so workers can observe shutdown"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [queue, poll, shutdown, worker]
  files: ["**/*.java"]
  symbols: [BlockingQueue.poll]
related: [java-conc-bounded-queue]
sources:
  - title: "BlockingQueue API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/BlockingQueue.html
---
> Poll with a timeout instead of taking forever, so the loop can check its stop flag.

## Why

BlockingQueue offers operations that "wait for the queue to become non-empty when retrieving an element", including a timed form: "poll(long timeout, TimeUnit unit) retrieves and removes the head of this queue, waiting up to the specified wait time if necessary for an element to become available." An unbounded take() parks the worker until work arrives, so a shutdown request cannot be noticed between items; the timed poll turns waiting into a bounded sleep the loop can re-check.

## Bad

```java
import java.util.concurrent.BlockingQueue;

class Worker {
    void run(BlockingQueue<String> queue) throws InterruptedException {
        while (true) {
            String item = queue.take();
            process(item);
        }
    }

    private void process(String item) {
    }
}
```

## Good

```java
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;

class Worker {
    private volatile boolean running = true;

    void run(BlockingQueue<String> queue) throws InterruptedException {
        while (running) {
            String item = queue.poll(1, TimeUnit.SECONDS);
            if (item != null) {
                process(item);
            }
        }
    }

    private void process(String item) {
    }
}
```

## See Also

- [java-conc-bounded-queue](conc-bounded-queue.md) - sizing the queue this loop drains
