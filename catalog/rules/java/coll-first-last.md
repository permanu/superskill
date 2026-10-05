---
id: java-coll-first-last
lang: java
prefix: coll
title: "Use getFirst and getLast instead of index arithmetic"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [getfirst, getlast, list, index]
  files: ["**/*.java"]
  symbols: [List.getFirst, List.getLast]
related: [java-coll-sub-list-view]
sources:
  - title: "List API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/List.html
  - title: "ArrayList API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/ArrayList.html
---
> Read the ends of a list with getFirst and getLast; the index math belongs to the list.

## Why

List declares getFirst as "gets the first element of this collection" and getLast as "gets the last element of this collection", and the implementations throw NoSuchElementException when the collection is empty rather than letting an index escape. Callers writing get(0) and get(size() - 1) repeat the boundary arithmetic — and an empty list produces IndexOutOfBoundsException from a value the caller computed, not from the access itself.

## Bad

```java
import java.util.List;

class Feed {
    String next(List<String> items) {
        return items.get(0);
    }

    String latest(List<String> items) {
        return items.get(items.size() - 1);
    }
}
```

## Good

```java
import java.util.List;

class Feed {
    String next(List<String> items) {
        return items.getFirst();
    }

    String latest(List<String> items) {
        return items.getLast();
    }
}
```

## See Also

- [java-coll-sub-list-view](coll-sub-list-view.md) - the other positional access that needs care
