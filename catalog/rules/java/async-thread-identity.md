---
id: java-async-thread-identity
lang: java
prefix: async
title: "Do not assume which thread runs a dependent stage"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [completablefuture, thread, callback, thenapply]
  files: ["**/*.java"]
  symbols: [CompletableFuture.thenApply, thenApplyAsync]
related: [java-async-explicit-executor]
sources:
  - title: "CompletableFuture API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/CompletableFuture.html
---
> Use the *Async variants when the callback needs a specific thread; the default may run anywhere.

## Why

The CompletableFuture documentation warns that "actions supplied for dependent completions of non-async methods may be performed by the thread that completes the current CompletableFuture, or by any other caller of a completion method". A callback written with thenApply can therefore run on the thread that completed the stage, on the caller that attached it, or on whatever thread a chained call uses; when the callback touches thread-confined state, the *Async form with an explicit executor is the only way to pin it.

## Bad

```java
import java.util.concurrent.CompletableFuture;

class Session {
    private String user;

    CompletableFuture<String> bind(CompletableFuture<String> stage) {
        return stage.thenApply(name -> user = name);
    }
}
```

## Good

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

class Session {
    private final Executor executor;
    private String user;

    Session(Executor executor) {
        this.executor = executor;
    }

    CompletableFuture<String> bind(CompletableFuture<String> stage) {
        return stage.thenApplyAsync(name -> user = name, executor);
    }
}
```

## See Also

- [java-async-explicit-executor](async-explicit-executor.md) - choosing the executor the callback needs
