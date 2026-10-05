---
id: java-perf-stream-side-effects
lang: java
prefix: perf
title: "Accumulate stream results with collect, not side effects"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [stream, collect, side-effect, accumulate]
  files: ["**/*.java"]
  symbols: [forEach, collect]
related: [java-perf-stream-stateless, java-perf-parallel-stream-gate]
sources:
  - title: "java.util.stream package summary"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/stream/package-summary.html
---
> Build collections from streams with collect instead of mutating an external list in forEach.

## Why

The java.util.stream documentation discourages side-effects in behavioral parameters to stream operations: they lead to unwitting violations of the statelessness requirement and other thread-safety hazards. Mutating an external list from forEach makes the pipeline's result depend on execution order and turns a parallel stream into a race, while the collector path is designed for accumulation. The stream's own example marks this pattern with the comment "Unnecessary use of side-effects!".

## Bad

```java
import java.util.ArrayList;
import java.util.List;

class TagCollector {

    List<String> tags(List<String> raw) {
        List<String> tags = new ArrayList<>();
        raw.stream().forEach(tag -> tags.add(tag.trim()));
        return tags;
    }
}
```

## Good

```java
import java.util.List;

class TagCollector {

    List<String> tags(List<String> raw) {
        return raw.stream().map(String::trim).toList();
    }
}
```

## See Also

- [java-perf-stream-stateless](perf-stream-stateless.md) - stateful lambdas break pipelines the same way
- [java-perf-parallel-stream-gate](perf-parallel-stream-gate.md) - side effects are one reason parallel streams misbehave
