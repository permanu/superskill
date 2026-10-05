---
id: java-async-when-complete
lang: java
prefix: async
title: "Observe completion with whenComplete, not a mapping call"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [completablefuture, whencomplete, observation, logging]
  files: ["**/*.java"]
  symbols: [CompletableFuture.whenComplete]
related: [java-async-handle]
sources:
  - title: "CompletableFuture API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/CompletableFuture.html
---
> Use whenComplete for side effects; it preserves the result and also sees the failure.

## Why

CompletableFuture.whenComplete "returns a new CompletionStage with the same result or exception as this stage, that executes the given action when this stage completes". Observing through thenApply forces the lambda to re-return the value unchanged and gives no access to the failure, while whenComplete documents that the result passes through untouched and hands the callback both the value and the exception.

## Bad

```java
import java.util.concurrent.CompletableFuture;

class Audit {
    CompletableFuture<String> log(CompletableFuture<String> stage) {
        return stage.thenApply(value -> {
            System.out.println("completed: " + value);
            return value;
        });
    }
}
```

## Good

```java
import java.util.concurrent.CompletableFuture;

class Audit {
    CompletableFuture<String> log(CompletableFuture<String> stage) {
        return stage.whenComplete((value, error) -> System.out.println("completed: " + value));
    }
}
```

## See Also

- [java-async-handle](async-handle.md) - when the callback should change the result instead
