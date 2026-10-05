---
id: java-async-handle
lang: java
prefix: async
title: "Map both outcomes in one function with handle"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [completablefuture, handle, recovery, mapping]
  files: ["**/*.java"]
  symbols: [CompletableFuture.handle]
related: [java-async-exceptionally]
sources:
  - title: "CompletableFuture API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/CompletableFuture.html
---
> When the next step needs the value and the failure together, use handle.

## Why

CompletableFuture.handle "returns a new CompletionStage that, when this stage completes either normally or exceptionally, is executed with this stage's result and exception as arguments to the supplied function". Splitting the two outcomes across thenApply and exceptionally puts the success mapping and the fallback in separate lambdas that can drift apart; handle states both in one place, which is also the natural fit when the fallback depends on the failure.

## Bad

```java
import java.util.concurrent.CompletableFuture;

class Fallback {
    CompletableFuture<String> read(CompletableFuture<String> stage) {
        return stage.thenApply(value -> value.toUpperCase()).exceptionally(error -> "DEFAULT");
    }
}
```

## Good

```java
import java.util.concurrent.CompletableFuture;

class Fallback {
    CompletableFuture<String> read(CompletableFuture<String> stage) {
        return stage.handle((value, error) -> error == null ? value.toUpperCase() : "DEFAULT");
    }
}
```

## See Also

- [java-async-exceptionally](async-exceptionally.md) - the failure-only fallback
