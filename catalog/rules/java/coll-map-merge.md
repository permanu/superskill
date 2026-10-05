---
id: java-coll-map-merge
lang: java
prefix: coll
title: "Accumulate map values with merge"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [map, merge, accumulate, counter]
  files: ["**/*.java"]
  symbols: [Map.merge]
related: [java-coll-map-compute-absent, java-coll-map-get-or-default]
sources:
  - title: "Map API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Map.html
  - title: "ConcurrentMap API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/ConcurrentMap.html
  - title: "ConcurrentHashMap API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html
---
> Express insert-or-update with merge; the remapping function decides how values combine.

## Why

Map.merge "associates it with the given non-null value" when the key is absent or mapped to null, and otherwise "replaces the associated value with the results of the given remapping function, or removes if the result is null". On a concurrent map the two forms genuinely differ: ConcurrentMap "provides thread safety and atomicity guarantees", and ConcurrentHashMap documents that "the entire method invocation is performed atomically", while the manual get and put are a read-modify-write in which two racing increments read the same value and one update is lost.

## Bad

```java
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

class Tally {
    private final Map<String, Integer> counts = new ConcurrentHashMap<>();

    void count(String word) {
        Integer current = counts.get(word);
        counts.put(word, current == null ? 1 : current + 1);
    }
}
```

## Good

```java
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

class Tally {
    private final Map<String, Integer> counts = new ConcurrentHashMap<>();

    void count(String word) {
        counts.merge(word, 1, Integer::sum);
    }
}
```

## See Also

- [java-coll-map-compute-absent](coll-map-compute-absent.md) - building the first value
- [java-coll-map-get-or-default](coll-map-get-or-default.md) - reading with a fallback
