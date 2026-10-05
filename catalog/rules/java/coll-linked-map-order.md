---
id: java-coll-linked-map-order
lang: java
prefix: coll
title: "Preserve map iteration order with LinkedHashMap"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [linkedhashmap, ordering, map, copy]
  files: ["**/*.java"]
  symbols: [LinkedHashMap]
related: [java-coll-immutable-factory]
sources:
  - title: "LinkedHashMap API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/LinkedHashMap.html
---
> Reach for LinkedHashMap when iteration order is part of the contract.

## Why

LinkedHashMap "spares its clients from the unspecified, generally chaotic ordering provided by HashMap" and "can be used to produce a copy of a map that has the same order as the original, regardless of the original map's implementation". A HashMap copy silently discards the source order, so any caller that renders, diffs, or compares maps by iteration order sees unstable results.

## Bad

```java
import java.util.HashMap;
import java.util.Map;

class Headers {
    Map<String, String> copy(Map<String, String> original) {
        return new HashMap<>(original);
    }
}
```

## Good

```java
import java.util.LinkedHashMap;
import java.util.Map;

class Headers {
    Map<String, String> copy(Map<String, String> original) {
        return new LinkedHashMap<>(original);
    }
}
```

## See Also

- [java-coll-immutable-factory](coll-immutable-factory.md) - fixing contents as well as order
