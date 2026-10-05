---
id: java-coll-map-compute-absent
lang: java
prefix: coll
title: "Populate map entries with computeIfAbsent"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [map, computeifabsent, get-put, cache]
  files: ["**/*.java"]
  symbols: [Map.computeIfAbsent]
related: [java-coll-map-merge]
sources:
  - title: "Map API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Map.html
---
> Replace get-then-put with computeIfAbsent; the map handles the missing case in one call.

## Why

Map.computeIfAbsent "attempts to compute its value using the given mapping function and enters it into this map unless null" when the key is absent or mapped to null, and returns the current or computed value. The manual get/if-null/put sequence repeats that rule at every call site and is easy to get wrong — for example by putting a freshly built value even when one already exists, or by forgetting the null check for keys explicitly mapped to null.

## Bad

```java
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

class Index {
    private final Map<String, List<String>> byLetter = new HashMap<>();

    void add(String word) {
        String key = word.substring(0, 1);
        List<String> words = byLetter.get(key);
        if (words == null) {
            words = new ArrayList<>();
            byLetter.put(key, words);
        }
        words.add(word);
    }
}
```

## Good

```java
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

class Index {
    private final Map<String, List<String>> byLetter = new HashMap<>();

    void add(String word) {
        byLetter.computeIfAbsent(word.substring(0, 1), key -> new ArrayList<>()).add(word);
    }
}
```

## See Also

- [java-coll-map-merge](coll-map-merge.md) - the accumulator counterpart for existing values
