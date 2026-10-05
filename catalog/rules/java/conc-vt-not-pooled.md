---
id: java-conc-vt-not-pooled
lang: java
prefix: conc
title: "Create a virtual thread per task instead of pooling virtual threads"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [virtual thread, pool, executor, task]
  files: ["**/*.java"]
  symbols: [Thread.ofVirtual, Executors.newVirtualThreadPerTaskExecutor]
related: [java-conc-vt-limit-semaphore, java-conc-executor-close]
sources:
  - title: "JEP 444: Virtual Threads"
    url: https://openjdk.org/jeps/444
---
> Give every task its own virtual thread; never put virtual threads in a pool.

## Why

JEP 444 states the rule without qualification: "Virtual threads are cheap and plentiful, and thus should never be pooled: A new virtual thread should be created for every application task." A pool exists to amortize the cost of an expensive resource, and virtual threads are not expensive; wrapping them in a pool adds queueing and lifetime coupling without saving anything.

## Bad

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;

class Jobs {
    private final ThreadFactory virtual = Thread.ofVirtual().factory();
    private final ExecutorService pool = Executors.newFixedThreadPool(200, virtual);

    void submit(Runnable job) {
        pool.submit(job);
    }
}
```

## Good

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

class Jobs {
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    void submit(Runnable job) {
        executor.submit(job);
    }
}
```

## See Also

- [java-conc-vt-limit-semaphore](conc-vt-limit-semaphore.md) - the legitimate reason people reach for pools
- [java-conc-executor-close](conc-executor-close.md) - managing the per-task executor's lifetime
