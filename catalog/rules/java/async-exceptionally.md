---
id: java-async-exceptionally
lang: java
prefix: async
title: "Recover a failed stage with exceptionally"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [completablefuture, exceptionally, recovery, fallback]
  files: ["**/*.java"]
  symbols: [CompletableFuture.exceptionally]
related: [java-async-handle]
sources:
  - title: "CompletableFuture API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/CompletableFuture.html
---
> Give a failed stage a fallback value on the stage itself, not around a join.

## Why

CompletableFuture.exceptionally "returns a new CompletionStage that, when this stage completes exceptionally, is executed with this stage's exception as the argument to the supplied function". Recovering on the stage keeps the pipeline composable: later stages can still chain, time out, or observe the result, whereas catching around a blocking join only recovers at the one call site that happened to wait.

## Bad

```java
import java.util.concurrent.CompletableFuture;

class Cache {
    String read(CompletableFuture<String> stage) {
        try {
            return stage.join();
        } catch (RuntimeException e) {
            return "default";
        }
    }
}
```

## Good

```java
import java.util.concurrent.CompletableFuture;

class Cache {
    String read(CompletableFuture<String> stage) {
        return stage.exceptionally(error -> "default").join();
    }
}
```

## See Also

- [java-async-handle](async-handle.md) - when the mapping needs both the value and the failure
