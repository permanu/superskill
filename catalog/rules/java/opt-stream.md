---
id: java-opt-stream
lang: java
prefix: opt
title: "Flatten streams of Optionals with Optional.stream()"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optional, stream, flatmap, pipeline]
  files: ["**/*.java"]
  symbols: [Optional.stream]
related: [java-opt-flatmap]
sources:
  - title: "Optional API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Optional.html
---
> Drop empties in a stream with flatMap(Optional::stream) instead of filter-and-get.

## Why

The stream method "returns a sequential Stream containing only that value" when present, otherwise an empty Stream, and its API note shows the intended use: "This method can be used to transform a Stream of optional elements to a Stream of present value elements: Stream<Optional<T>> os = ..; Stream<T> s = os.flatMap(Optional::stream)". The filter-and-get pair compiles the same intent while hiding an unchecked unwrap inside the pipeline.

## Bad

```java
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

class Names {
    List<String> present(List<Optional<String>> values) {
        return values.stream()
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toList());
    }
}
```

## Good

```java
import java.util.List;
import java.util.Optional;

class Names {
    List<String> present(List<Optional<String>> values) {
        return values.stream()
                .flatMap(Optional::stream)
                .toList();
    }
}
```

## See Also

- [java-opt-flatmap](opt-flatmap.md) - the same flattening idea between Optionals
