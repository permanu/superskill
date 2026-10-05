---
id: java-perf-parallel-stream-gate
lang: java
prefix: perf
title: "Parallelize a stream only when the work per element pays for splitting"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [parallel, stream, split, throughput]
  files: ["**/*.java"]
  symbols: [parallelStream, parallel]
related: [java-perf-jmh-measure, java-perf-stream-stateless]
sources:
  - title: "java.util.stream package summary"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/stream/package-summary.html
---
> Keep streams sequential until measurements show the work per element outweighs splitting and combining.

## Why

The java.util.stream documentation notes that "the stream implementations in the JDK create serial streams unless parallelism is explicitly requested", and warns that "it may actually be counterproductive to perform the operation in parallel" because the combining step can be expensive. Parallel execution partitions the source and merges partial results, so small or cheap pipelines pay more for coordination than they save. Add parallel() only when the per-element work is substantial, the operations are independent, and a benchmark confirms the win.

## Bad

```java
import java.util.List;

class Normalizer {

    List<String> normalize(List<String> values) {
        return values.parallelStream()
                .map(String::trim)
                .toList();
    }
}
```

## Good

```java
import java.util.List;

class Normalizer {

    List<String> normalize(List<String> values) {
        return values.stream()
                .map(String::trim)
                .toList();
    }
}
```

## See Also

- [java-perf-jmh-measure](perf-jmh-measure.md) - the measurement that justifies parallelism
- [java-perf-stream-stateless](perf-stream-stateless.md) - statefulness makes parallel results incorrect
