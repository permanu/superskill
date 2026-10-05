---
id: java-async-then-combine
lang: java
prefix: async
title: "Combine independent stages with thenCombine"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [completablefuture, thencombine, parallel, combine]
  files: ["**/*.java"]
  symbols: [CompletableFuture.thenCombine]
related: [java-async-then-compose, java-async-all-of]
sources:
  - title: "CompletableFuture API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/CompletableFuture.html
---
> Join two in-flight stages with thenCombine instead of nesting one inside the other.

## Why

CompletableFuture.thenCombine "returns a new CompletionStage that, when this and the other given stage both complete normally, is executed with the two results as arguments to the supplied function". Nesting the second lookup inside thenCompose makes it start only after the first stage completes, serializing work that could run at the same time; thenCombine lets both stages proceed independently and combines them when they are done.

## Bad

```java
import java.util.concurrent.CompletableFuture;

class Profile {
    CompletableFuture<String> combined(CompletableFuture<String> user, CompletableFuture<String> plan) {
        return user.thenCompose(name -> plan.thenApply(planName -> name + "/" + planName));
    }
}
```

## Good

```java
import java.util.concurrent.CompletableFuture;

class Profile {
    CompletableFuture<String> combined(CompletableFuture<String> user, CompletableFuture<String> plan) {
        return user.thenCombine(plan, (name, planName) -> name + "/" + planName);
    }
}
```

## See Also

- [java-async-then-compose](async-then-compose.md) - when the next step depends on the previous result
- [java-async-all-of](async-all-of.md) - combining more than two stages
