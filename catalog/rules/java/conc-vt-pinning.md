---
id: java-conc-vt-pinning
lang: java
prefix: conc
title: "Avoid synchronized around blocking calls in virtual-thread code"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [virtual-thread, pinning, synchronized, lock]
  files: ["**/*.java"]
  symbols: [ReentrantLock]
related: [java-conc-vt-blocking-style]
sources:
  - title: "JEP 444: Virtual Threads"
    url: https://openjdk.org/jeps/444
---
> Use ReentrantLock so a virtual thread can unmount while it blocks.

## Why

JEP 444 explains that "a virtual thread cannot be unmounted during blocking operations because it is pinned to its carrier" when it "executes code inside a synchronized block or method", and that "if a virtual thread performs a blocking operation such as I/O or BlockingQueue.take() while it is pinned, then its carrier and the underlying OS thread are blocked for the duration of the operation". ReentrantLock keeps the mutual exclusion without pinning the carrier, so the platform thread stays free.

## Bad

```java
import java.util.concurrent.BlockingQueue;

class Consumer {
    private final Object lock = new Object();

    String take(BlockingQueue<String> queue) throws InterruptedException {
        synchronized (lock) {
            return queue.take();
        }
    }
}
```

## Good

```java
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.locks.ReentrantLock;

class Consumer {
    private final ReentrantLock lock = new ReentrantLock();

    String take(BlockingQueue<String> queue) throws InterruptedException {
        lock.lock();
        try {
            return queue.take();
        } finally {
            lock.unlock();
        }
    }
}
```

## See Also

- [java-conc-vt-blocking-style](conc-vt-blocking-style.md) - keeping blocking code on virtual threads
