---
id: java-perf-hashmap-capacity
lang: java
prefix: perf
title: "Size a HashMap for the expected entry count to avoid rehashing"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [hashmap, capacity, sizing, resize]
  files: ["**/*.java"]
  symbols: [HashMap, newHashMap]
related: [java-perf-linkedlist-indexing]
sources:
  - title: "HashMap API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/HashMap.html
---
> Construct maps with the expected size so entries do not trigger a rehash.

## Why

The HashMap documentation explains that when entries exceed the load factor times the capacity "the hash table is rehashed (that is, internal data structures are rebuilt)", and that the expected number of entries "should be taken into account when setting its initial capacity, so as to minimize the number of rehash operations". Building a map of known size with the default constructor rebuilds its table as it grows. HashMap.newHashMap(numMappings) picks a capacity that holds the expected entries without resizing.

## Bad

```java
import java.util.HashMap;
import java.util.List;
import java.util.Map;

class IndexBuilder {

    Map<String, Integer> index(List<String> words) {
        Map<String, Integer> index = new HashMap<>();
        for (int i = 0; i < words.size(); i++) {
            index.put(words.get(i), i);
        }
        return index;
    }
}
```

## Good

```java
import java.util.HashMap;
import java.util.List;
import java.util.Map;

class IndexBuilder {

    Map<String, Integer> index(List<String> words) {
        Map<String, Integer> index = HashMap.newHashMap(words.size());
        for (int i = 0; i < words.size(); i++) {
            index.put(words.get(i), i);
        }
        return index;
    }
}
```

## See Also

- [java-perf-linkedlist-indexing](perf-linkedlist-indexing.md) - choosing list implementations by access pattern
