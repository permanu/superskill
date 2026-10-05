---
id: java-mem-weak-cache
lang: java
prefix: mem
title: "Use weak keys for caches that must not pin their entries"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cache, weak, garbage-collection, memory]
  files: ["**/*.java"]
  symbols: [WeakHashMap, WeakReference]
related: [java-mem-weakmap-value-keys, java-mem-softref-cache]
sources:
  - title: "java.lang.ref package summary"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/ref/package-summary.html
  - title: "WeakHashMap API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/WeakHashMap.html
---
> Keep per-object caches from extending the lifetime of their keys; weak keys let the collector reclaim both.

## Why

The java.lang.ref package documentation assigns weak references the job of "implementing canonicalizing mappings that do not prevent their keys (or values) from being reclaimed", and a WeakHashMap entry "will automatically be removed when its key is no longer in ordinary use". A cache keyed by a strong reference to a session, request, or object graph keeps that key alive for as long as the cache entry exists; weak keys let the entry and the key disappear together.

## Bad

```java
import java.util.HashMap;
import java.util.Map;

class SessionProfiles {

    private final Map<Session, String> profiles = new HashMap<>();

    String profileFor(Session session) {
        return profiles.computeIfAbsent(session, key -> "default");
    }
}

class Session {
}
```

## Good

```java
import java.util.Map;
import java.util.WeakHashMap;

class SessionProfiles {

    private final Map<Session, String> profiles = new WeakHashMap<>();

    String profileFor(Session session) {
        return profiles.computeIfAbsent(session, key -> "default");
    }
}

class Session {
}
```

## See Also

- [java-mem-weakmap-value-keys](mem-weakmap-value-keys.md) - the trap that defeats weak keys
- [java-mem-softref-cache](mem-softref-cache.md) - the soft-reference variant for recomputable caches
