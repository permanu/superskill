---
id: java-async-or-timeout
lang: java
prefix: async
title: "Bound every asynchronous stage with a timeout"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [completablefuture, timeout, ortimeout, deadline]
  files: ["**/*.java"]
  symbols: [CompletableFuture.orTimeout]
related: [java-async-exceptionally]
sources:
  - title: "CompletableFuture API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/CompletableFuture.html
---
> Give stages a deadline with orTimeout so a stuck dependency fails instead of hanging.

## Why

CompletableFuture.orTimeout "exceptionally completes this CompletableFuture with a TimeoutException if not otherwise completed before the given timeout", which turns an unresponsive dependency into a normal completion path that exceptionally and handle can see. Without it, a stage that never completes leaves every dependent stage waiting forever, and the failure surfaces only as an unresponsive caller.

## Bad

```java
import java.util.concurrent.CompletableFuture;

class Remote {
    CompletableFuture<String> call() {
        return CompletableFuture.supplyAsync(() -> "response");
    }
}
```

## Good

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

class Remote {
    CompletableFuture<String> call() {
        return CompletableFuture.supplyAsync(() -> "response")
                .orTimeout(5, TimeUnit.SECONDS);
    }
}
```

## See Also

- [java-async-exceptionally](async-exceptionally.md) - recovering from the timeout failure
