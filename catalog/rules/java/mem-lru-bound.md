---
id: java-mem-lru-bound
lang: java
prefix: mem
title: "Bound in-memory caches so they cannot grow without limit"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cache, lru, eviction, memory]
  files: ["**/*.java"]
  symbols: [LinkedHashMap, removeEldestEntry]
related: [java-mem-weak-cache]
sources:
  - title: "LinkedHashMap API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/LinkedHashMap.html
---
> Give every cache an eviction policy; access-ordered LinkedHashMap with removeEldestEntry is the built-in LRU.

## Why

The LinkedHashMap documentation says the access-ordered constructor creates a map whose encounter order is "the order in which its entries were last accessed" and that "this kind of map is well-suited to building LRU caches"; removeEldestEntry is "invoked by put and putAll after inserting a new entry" and "is useful if the map represents a cache: it allows the map to reduce memory consumption by deleting stale entries". An unbounded cache turns every distinct key into permanent retention.

## Bad

```java
import java.util.HashMap;
import java.util.Map;

class ImageCache {
    private final Map<String, byte[]> images = new HashMap<>();

    void put(String key, byte[] image) {
        images.put(key, image);
    }

    byte[] get(String key) {
        return images.get(key);
    }
}
```

## Good

```java
import java.util.LinkedHashMap;
import java.util.Map;

class ImageCache {
    private static final int MAX_ENTRIES = 100;

    private final Map<String, byte[]> images =
            new LinkedHashMap<>(16, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, byte[]> eldest) {
                    return size() > MAX_ENTRIES;
                }
            };

    void put(String key, byte[] image) {
        images.put(key, image);
    }

    byte[] get(String key) {
        return images.get(key);
    }
}
```

## See Also

- [java-mem-weak-cache](mem-weak-cache.md) - the other way to keep a cache from pinning entries
