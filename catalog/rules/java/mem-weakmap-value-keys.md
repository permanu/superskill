---
id: java-mem-weakmap-value-keys
lang: java
prefix: mem
title: "Keep WeakHashMap values free of strong references to their keys"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [weakhashmap, reference-cycle, memory-leak]
  files: ["**/*.java"]
  symbols: [WeakHashMap]
related: [java-mem-weak-cache]
sources:
  - title: "WeakHashMap API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/WeakHashMap.html
---
> A value that strongly references its own key defeats the weak key; store only the data the entry needs.

## Why

The WeakHashMap implementation note warns that "the value objects in a WeakHashMap are held by ordinary strong references" and that values must not "strongly refer to their own keys, either directly or indirectly, since that will prevent the keys from being discarded". A back-reference from the value to the key forms a cycle rooted in the map, so the entry never goes away and the map behaves like a strong map that grows forever.

## Bad

```java
import java.util.WeakHashMap;

class Attachment {
    private final Object owner;
    private final String data;

    Attachment(Object owner, String data) {
        this.owner = owner;
        this.data = data;
    }
}

class AttachmentCache {
    private final WeakHashMap<Object, Attachment> cache = new WeakHashMap<>();

    void attach(Object owner, String data) {
        cache.put(owner, new Attachment(owner, data));
    }
}
```

## Good

```java
import java.util.WeakHashMap;

class Attachment {
    private final String data;

    Attachment(String data) {
        this.data = data;
    }
}

class AttachmentCache {
    private final WeakHashMap<Object, Attachment> cache = new WeakHashMap<>();

    void attach(Object owner, String data) {
        cache.put(owner, new Attachment(data));
    }
}
```

## See Also

- [java-mem-weak-cache](mem-weak-cache.md) - the weak-key cache this protects
