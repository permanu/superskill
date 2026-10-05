---
id: java-coll-copy-on-write
lang: java
prefix: coll
title: "Use CopyOnWriteArrayList for listener lists"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [copyonwrite, listeners, concurrency, traversal]
  files: ["**/*.java"]
  symbols: [CopyOnWriteArrayList]
related: [java-conc-concurrent-collections]
sources:
  - title: "CopyOnWriteArrayList API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/CopyOnWriteArrayList.html
---
> For read-heavy collections, snapshot on write.

## Why

CopyOnWriteArrayList is "a thread-safe variant of ArrayList in which all mutative operations (add, set, and so on) are implemented by making a fresh copy of the underlying array", which "is ordinarily too costly, but may be more efficient than alternatives when traversal operations vastly outnumber mutations". Its iterator uses a snapshot and "is guaranteed not to throw ConcurrentModificationException", so a listener registered during a notification does not break the loop in progress.

## Bad

```java
import java.util.ArrayList;
import java.util.List;

class Listeners {
    private final List<Runnable> listeners = new ArrayList<>();

    void register(Runnable listener) {
        listeners.add(listener);
    }

    void fire() {
        for (Runnable listener : listeners) {
            listener.run();
        }
    }
}
```

## Good

```java
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

class Listeners {
    private final List<Runnable> listeners = new CopyOnWriteArrayList<>();

    void register(Runnable listener) {
        listeners.add(listener);
    }

    void fire() {
        for (Runnable listener : listeners) {
            listener.run();
        }
    }
}
```

## See Also

- [java-conc-concurrent-collections](conc-concurrent-collections.md) - the general concurrent-collection rule
