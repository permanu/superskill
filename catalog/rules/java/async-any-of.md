---
id: java-async-any-of
lang: java
prefix: async
title: "Race alternatives with anyOf"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [completablefuture, anyof, race, mirrors]
  files: ["**/*.java"]
  symbols: [CompletableFuture.anyOf]
related: [java-async-all-of]
sources:
  - title: "CompletableFuture API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/CompletableFuture.html
---
> Complete with the first stage that finishes instead of probing them in turn.

## Why

CompletableFuture.anyOf "returns a new CompletableFuture that is completed when any of the given CompletableFutures complete, with the same result", and if it completed exceptionally the combined future "also does so, with a CompletionException holding this exception as its cause". Sequentially joining candidates measures them one after another, so the slowest candidate chosen first delays the answer; anyOf completes as soon as any source responds.

## Bad

```java
import java.util.List;
import java.util.concurrent.CompletableFuture;

class Mirror {
    String fastest(List<CompletableFuture<String>> mirrors) {
        RuntimeException failure = null;
        for (CompletableFuture<String> mirror : mirrors) {
            try {
                return mirror.join();
            } catch (RuntimeException e) {
                failure = e;
            }
        }
        throw failure;
    }
}
```

## Good

```java
import java.util.List;
import java.util.concurrent.CompletableFuture;

class Mirror {
    CompletableFuture<Object> fastest(List<CompletableFuture<String>> mirrors) {
        return CompletableFuture.anyOf(mirrors.toArray(new CompletableFuture<?>[0]));
    }
}
```

## See Also

- [java-async-all-of](async-all-of.md) - waiting for every stage instead
