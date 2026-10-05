---
id: java-perf-stream-stateless
lang: java
prefix: perf
title: "Keep stream lambdas stateless"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [stream, lambda, stateful, parallel]
  files: ["**/*.java"]
  symbols: [Stream, map]
related: [java-perf-stream-side-effects, java-perf-parallel-stream-gate]
sources:
  - title: "java.util.stream package summary"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/stream/package-summary.html
---
> Express position in the pipeline instead of counting in a lambda; stateful parameters make results order-dependent.

## Why

The java.util.stream documentation states that "stream pipeline results may be nondeterministic or incorrect if the behavioral parameters to the stream operations are stateful", because the lambda's result then depends on state that can change during the stream pipeline. A lambda that increments a shared counter numbers elements by encounter order under sequential execution and scrambles them under parallel execution. The documented remedy is to avoid stateful behavioral parameters entirely and derive values from the element or its index.

## Bad

```java
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

class Ranker {

    List<String> ranked(List<String> names) {
        AtomicInteger rank = new AtomicInteger(1);
        return names.stream()
                .map(name -> rank.getAndIncrement() + ". " + name)
                .collect(Collectors.toList());
    }
}
```

## Good

```java
import java.util.List;
import java.util.stream.IntStream;

class Ranker {

    List<String> ranked(List<String> names) {
        return IntStream.range(0, names.size())
                .mapToObj(i -> (i + 1) + ". " + names.get(i))
                .toList();
    }
}
```

## See Also

- [java-perf-stream-side-effects](perf-stream-side-effects.md) - external mutation in forEach
- [java-perf-parallel-stream-gate](perf-parallel-stream-gate.md) - why order guarantees disappear in parallel
