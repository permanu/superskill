---
id: java-coll-sub-list-view
lang: java
prefix: coll
title: "Treat subList results as views and copy when you need a snapshot"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sublist, view, copy, snapshot]
  files: ["**/*.java"]
  symbols: [List.subList, List.copyOf]
related: [java-coll-immutable-factory]
sources:
  - title: "Collection API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Collection.html
  - title: "List API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/List.html
---
> subList is a live view; wrap it in List.copyOf when the caller needs a standalone list.

## Why

The Collection documentation lists List.subList among "view collections" that "do not store elements, but instead they rely on a backing collection", and warns that "any changes made to the backing collection are visible in the view collection" and vice versa. Returning a raw subList hands callers a window into mutable state and ties its validity to the backing list; List.copyOf "returns an unmodifiable List containing the elements of the given Collection, in its iteration order", which detaches the result.

## Bad

```java
import java.util.List;

class Window {
    List<String> firstPage(List<String> items) {
        return items.subList(0, 10);
    }
}
```

## Good

```java
import java.util.List;

class Window {
    List<String> firstPage(List<String> items) {
        return List.copyOf(items.subList(0, 10));
    }
}
```

## See Also

- [java-coll-immutable-factory](coll-immutable-factory.md) - the factory methods behind the copy
