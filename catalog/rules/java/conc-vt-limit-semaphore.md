---
id: java-conc-vt-limit-semaphore
lang: java
prefix: conc
title: "Limit concurrent access to a resource with a Semaphore, not a thread pool"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [virtual thread, semaphore, concurrency, limit]
  files: ["**/*.java"]
  symbols: [Semaphore]
related: [java-conc-vt-not-pooled, java-conc-latch-not-poll]
sources:
  - title: "JEP 444: Virtual Threads"
    url: https://openjdk.org/jeps/444
---
> Cap concurrency at the scarce resource with permits; leave the executor free to create a thread per task.

## Why

JEP 444 anticipates the migration habit directly: developers use pools "to limit concurrent access to limited resources", but with virtual threads "do not be tempted to pool virtual threads in order to limit concurrency. Instead use constructs specifically designed for that purpose, such as semaphores." A pool caps the number of threads, which conflates a resource limit with a scheduling policy; a semaphore caps exactly the accesses you want to limit while each task still gets its own thread.

## Bad

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

class Database {
    private final ExecutorService calls = Executors.newFixedThreadPool(20);

    void query(String sql) {
        calls.submit(() -> System.out.println(sql));
    }
}
```

## Good

```java
import java.util.concurrent.Semaphore;

class Database {
    private final Semaphore connections = new Semaphore(20);

    void query(String sql) throws InterruptedException {
        connections.acquire();
        try {
            System.out.println(sql);
        } finally {
            connections.release();
        }
    }
}
```

## See Also

- [java-conc-vt-not-pooled](conc-vt-not-pooled.md) - why the executor must stay unbounded
- [java-conc-latch-not-poll](conc-latch-not-poll.md) - the other synchronizer that replaces a pool idiom
