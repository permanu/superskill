---
id: java-async-then-compose
lang: java
prefix: async
title: "Use thenCompose when the next step returns a stage"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [completablefuture, thencompose, nesting, pipeline]
  files: ["**/*.java"]
  symbols: [CompletableFuture.thenCompose]
related: [java-opt-flatmap]
sources:
  - title: "CompletableFuture API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/CompletableFuture.html
---
> Flatten dependent asynchronous steps with thenCompose; thenApply would nest the stages.

## Why

CompletableFuture.thenCompose "returns a new CompletionStage that is completed with the same value as the CompletionStage returned by the given function", so the result of the returned stage becomes the result of the composition. Using thenApply for a function that already returns a CompletableFuture produces a CompletableFuture<CompletableFuture<T>>, pushing an extra unwrap onto every caller and breaking chains like orTimeout and exceptionally.

## Bad

```java
import java.util.concurrent.CompletableFuture;

class Orders {
    CompletableFuture<CompletableFuture<String>> receipt(long id) {
        return find(id).thenApply(order -> price(order));
    }

    CompletableFuture<String> find(long id) {
        return CompletableFuture.completedFuture("order-" + id);
    }

    CompletableFuture<String> price(String order) {
        return CompletableFuture.completedFuture(order + ": 10");
    }
}
```

## Good

```java
import java.util.concurrent.CompletableFuture;

class Orders {
    CompletableFuture<String> receipt(long id) {
        return find(id).thenCompose(order -> price(order));
    }

    CompletableFuture<String> find(long id) {
        return CompletableFuture.completedFuture("order-" + id);
    }

    CompletableFuture<String> price(String order) {
        return CompletableFuture.completedFuture(order + ": 10");
    }
}
```

## See Also

- [java-opt-flatmap](opt-flatmap.md) - the same flattening decision for Optional
