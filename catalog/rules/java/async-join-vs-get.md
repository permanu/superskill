---
id: java-async-join-vs-get
lang: java
prefix: async
title: "Prefer join in composition code; get where interruption matters"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [completablefuture, join, get, blocking]
  files: ["**/*.java"]
  symbols: [CompletableFuture.join, CompletableFuture.get]
related: [java-async-completion-exception]
sources:
  - title: "CompletableFuture API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/CompletableFuture.html
---
> Use join() inside pipelines and get() only where interruption is part of the contract.

## Why

The CompletableFuture documentation explains that get() and get(long, TimeUnit) throw an ExecutionException wrapping the cause, "to simplify usage in most contexts, this class also defines methods join() and getNow(T) that instead throw the CompletionException directly in these cases". join's unchecked exception keeps composition chains free of try/catch noise, while get's checked InterruptedException remains the right call at a boundary where the caller must react to being interrupted.

## Bad

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

class Pipeline {
    String run(CompletableFuture<String> stage) {
        try {
            return stage.get();
        } catch (InterruptedException | ExecutionException e) {
            throw new IllegalStateException(e);
        }
    }
}
```

## Good

```java
import java.util.concurrent.CompletableFuture;

class Pipeline {
    String run(CompletableFuture<String> stage) {
        return stage.join();
    }
}
```

## See Also

- [java-async-completion-exception](async-completion-exception.md) - the wrapper each form throws
