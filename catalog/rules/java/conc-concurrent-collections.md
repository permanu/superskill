---
id: java-conc-concurrent-collections
lang: java
prefix: conc
title: "Use concurrent collections for maps and sets shared across threads"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [concurrent, hashmap, collection, thread-safety]
  files: ["**/*.java"]
  symbols: [ConcurrentHashMap, ConcurrentSkipListMap]
related: [java-conc-lock-consistency, java-conc-blocking-queue]
sources:
  - title: "java.util.concurrent package summary"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/package-summary.html
---
> Share a ConcurrentHashMap instead of a plain HashMap that multiple threads mutate.

## Why

The java.util.concurrent package summary prescribes the mapping: "When many threads are expected to access a given collection, a ConcurrentHashMap is normally preferable to a synchronized HashMap", and a concurrent collection "is thread-safe, but not governed by a single exclusion lock". A plain HashMap mutated by several threads without a lock is a data race; its internal arrays and size bookkeeping are not safe under concurrent writes, and readers may observe a corrupt or arbitrarily stale structure.

## Bad

```java
import java.util.HashMap;
import java.util.Map;

class Registry {
    private final Map<String, String> entries = new HashMap<>();

    void put(String key, String value) {
        entries.put(key, value);
    }

    String get(String key) {
        return entries.get(key);
    }
}
```

## Good

```java
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

class Registry {
    private final Map<String, String> entries = new ConcurrentHashMap<>();

    void put(String key, String value) {
        entries.put(key, value);
    }

    String get(String key) {
        return entries.get(key);
    }
}
```

## See Also

- [java-conc-lock-consistency](conc-lock-consistency.md) - when a plain collection under one lock is the right choice
- [java-conc-blocking-queue](conc-blocking-queue.md) - the queue-shaped version of this decision
