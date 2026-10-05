---
id: java-mem-refers-to
lang: java
prefix: mem
title: "Test referents with refersTo instead of comparing get()"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [reference, referent, identity]
  files: ["**/*.java"]
  symbols: [Reference, refersTo]
related: [java-mem-reference-reachable]
sources:
  - title: "Reference API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/ref/Reference.html
---
> Compare referents with refersTo(obj); get()==obj briefly strengthens the object against collection.

## Why

The Reference.get API note explains that it "returns a strong reference to the referent", which "may cause the garbage collector to treat it as strongly reachable until some later collection cycle", and recommends "use ref.refersTo(obj) rather than ref.get() == obj" when testing whether an object is the referent. Identity checks on weak references are exactly that case, so refersTo avoids postponing the collection the check is trying to observe.

## Bad

```java
import java.lang.ref.WeakReference;

class CacheEntry {
    private final WeakReference<Object> cached;

    CacheEntry(Object value) {
        this.cached = new WeakReference<>(value);
    }

    boolean holds(Object candidate) {
        return cached.get() == candidate;
    }
}
```

## Good

```java
import java.lang.ref.WeakReference;

class CacheEntry {
    private final WeakReference<Object> cached;

    CacheEntry(Object value) {
        this.cached = new WeakReference<>(value);
    }

    boolean holds(Object candidate) {
        return cached.refersTo(candidate);
    }
}
```

## See Also

- [java-mem-reference-reachable](mem-reference-reachable.md) - keeping the reference object itself alive
