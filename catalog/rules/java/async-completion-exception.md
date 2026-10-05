---
id: java-async-completion-exception
lang: java
prefix: async
title: "Catch CompletionException, not the original failure type"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [completablefuture, completionexception, join, exception]
  files: ["**/*.java"]
  symbols: [CompletionException, CompletableFuture.join]
related: [java-async-join-vs-get]
sources:
  - title: "CompletableFuture API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/CompletableFuture.html
---
> join and get wrap stage failures; classify the wrapper and unwrap the cause.

## Why

The CompletableFuture documentation states that "in case of exceptional completion with a CompletionException, methods get() and get(long, TimeUnit) throw an ExecutionException with the same cause as held in the corresponding CompletionException", while join() and getNow(T) "instead throw the CompletionException directly". A try/catch around join that names the original failure type never fires, because the exception that arrives is a CompletionException carrying that type as its cause.

## Bad

```java
import java.util.concurrent.CompletableFuture;

class Lookup {
    String value(CompletableFuture<String> stage) {
        try {
            return stage.join();
        } catch (IllegalStateException e) {
            return "fallback";
        }
    }
}
```

## Good

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

class Lookup {
    String value(CompletableFuture<String> stage) {
        try {
            return stage.join();
        } catch (CompletionException e) {
            return "fallback";
        }
    }
}
```

## See Also

- [java-async-join-vs-get](async-join-vs-get.md) - the two unwrapping styles this rule distinguishes
