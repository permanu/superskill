---
id: java-async-explicit-executor
lang: java
prefix: async
title: "Give blocking async work its own executor"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [completablefuture, executor, commonpool, blocking]
  files: ["**/*.java"]
  symbols: [CompletableFuture.supplyAsync, Executor]
related: [java-conc-vt-not-cpu-bound, java-async-thread-identity]
sources:
  - title: "CompletableFuture API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/CompletableFuture.html
---
> Pass an Executor when a stage can block; the default pool is shared and sized for CPU work.

## Why

The CompletableFuture documentation states that "all async methods without an explicit Executor argument are performed using the ForkJoinPool.commonPool() (unless it does not support a parallelism level of at least two, in which case, a new Thread is created to run each task)". The common pool is shared by the whole VM and sized for CPU-bound work, so a blocking call placed there consumes a worker that other parallel tasks needed; an explicit executor (or a virtual-thread-per-task executor) isolates that.

## Bad

```java
import java.util.concurrent.CompletableFuture;

class Fetcher {
    CompletableFuture<String> fetch(String url) {
        return CompletableFuture.supplyAsync(() -> blockingCall(url));
    }

    private static String blockingCall(String url) {
        return url;
    }
}
```

## Good

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

class Fetcher {
    private final Executor executor = Executors.newVirtualThreadPerTaskExecutor();

    CompletableFuture<String> fetch(String url) {
        return CompletableFuture.supplyAsync(() -> blockingCall(url), executor);
    }

    private static String blockingCall(String url) {
        return url;
    }
}
```

## See Also

- [java-conc-vt-not-cpu-bound](conc-vt-not-cpu-bound.md) - matching thread type to the work
- [java-async-thread-identity](async-thread-identity.md) - which thread runs a dependent stage
