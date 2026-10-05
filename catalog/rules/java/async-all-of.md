---
id: java-async-all-of
lang: java
prefix: async
title: "Wait for a batch of stages with allOf"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [completablefuture, allof, batch, wait]
  files: ["**/*.java"]
  symbols: [CompletableFuture.allOf]
related: [java-async-any-of, java-async-then-combine]
sources:
  - title: "CompletableFuture API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/CompletableFuture.html
---
> Complete when every stage is done with allOf, not by joining them one by one.

## Why

CompletableFuture.allOf "returns a new CompletableFuture that is completed when all of the given CompletableFutures complete", and the class documentation notes that if any of them completes exceptionally the combined future does too, "with a CompletionException holding this exception as its cause". Joining the stages in a loop waits for them in sequence and throws at the first failure, leaving the rest unobserved; allOf waits for the batch as one stage that the pipeline can time out or recover.

## Bad

```java
import java.util.List;
import java.util.concurrent.CompletableFuture;

class Report {
    String gather(List<CompletableFuture<String>> stages) {
        StringBuilder report = new StringBuilder();
        for (CompletableFuture<String> stage : stages) {
            report.append(stage.join());
        }
        return report.toString();
    }
}
```

## Good

```java
import java.util.List;
import java.util.concurrent.CompletableFuture;

class Report {
    CompletableFuture<String> gather(List<CompletableFuture<String>> stages) {
        return CompletableFuture.allOf(stages.toArray(new CompletableFuture<?>[0]))
                .thenApply(ignored -> {
                    StringBuilder report = new StringBuilder();
                    for (CompletableFuture<String> stage : stages) {
                        report.append(stage.join());
                    }
                    return report.toString();
                });
    }
}
```

## See Also

- [java-async-any-of](async-any-of.md) - the first-to-finish counterpart
- [java-async-then-combine](async-then-combine.md) - combining exactly two stages
