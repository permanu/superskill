---
id: java-coll-immutable-elements
lang: java
prefix: coll
title: "Keep map keys and set elements immutable while stored"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [map, key, mutable, hashcode]
  files: ["**/*.java"]
  symbols: [HashMap, Set]
related: [java-coll-map-compute-absent]
sources:
  - title: "Map API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Map.html
---
> Store immutable keys; mutating a stored object breaks its hash lookup.

## Why

The Map interface documentation warns: "Note: great care must be exercised if mutable objects are used as map keys. The behavior of a map is not specified if the value of an object is changed in a manner that affects equals comparisons while the object is a key in the map." A content-hashed key such as an ArrayList changes its hashCode when its elements change, so the entry stays in the table while every lookup computes a different bucket and misses. Use an immutable type such as String or a record as the key.

## Bad

```java
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

class Inventory {
    private final Map<List<String>, Integer> counts = new HashMap<>();

    void add(List<String> item) {
        counts.merge(item, 1, Integer::sum);
    }

    void rename(List<String> item, String next) {
        item.set(0, next);
    }
}
```

## Good

```java
import java.util.HashMap;
import java.util.Map;

class Inventory {
    private final Map<String, Integer> counts = new HashMap<>();

    void add(String item) {
        counts.merge(item, 1, Integer::sum);
    }
}
```

## See Also

- [java-coll-map-compute-absent](coll-map-compute-absent.md) - writing entries whose keys stay stable
