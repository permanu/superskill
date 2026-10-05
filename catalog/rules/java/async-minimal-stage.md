---
id: java-async-minimal-stage
lang: java
prefix: async
title: "Expose CompletionStage, not a completable future"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [completablefuture, completionstage, api, encapsulation]
  files: ["**/*.java"]
  symbols: [CompletableFuture.minimalCompletionStage]
related: [java-api-immutable-exposure]
sources:
  - title: "CompletableFuture API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/CompletableFuture.html
---
> Return minimalCompletionStage() so callers cannot complete or mutate your future.

## Why

The CompletableFuture documentation notes that "all CompletionStage methods return CompletableFutures" and prescribes: "to restrict usages to only those methods defined in interface CompletionStage, use method minimalCompletionStage()". That method returns a stage that "cannot be independently completed or otherwise used in ways not defined by the methods of interface CompletionStage", so a caller cannot call complete, completeExceptionally, or obtrudeValue on a future your API owns.

## Bad

```java
import java.util.concurrent.CompletableFuture;

class Jobs {
    CompletableFuture<String> submit() {
        return CompletableFuture.supplyAsync(() -> "done");
    }
}
```

## Good

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

class Jobs {
    CompletionStage<String> submit() {
        return CompletableFuture.supplyAsync(() -> "done").minimalCompletionStage();
    }
}
```

## See Also

- [java-api-immutable-exposure](api-immutable-exposure.md) - the same principle for collections
