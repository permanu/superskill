---
id: java-coll-immutable-factory
lang: java
prefix: coll
title: "Build fixed collections with List.of, Set.of, and Map.of"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [list, factory, immutable, collection]
  files: ["**/*.java"]
  symbols: [List.of, Set.of, Map.of]
related: [java-coll-sub-list-view]
sources:
  - title: "List API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/List.html
  - title: "Map API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Map.html
---
> Prefer the unmodifiable factories for fixed collections; they reject nulls and mutations.

## Why

The List documentation states that "the List.of and List.copyOf static factory methods provide a convenient way to create unmodifiable lists", that "elements cannot be added, removed, or replaced", and that they "disallow null elements. Attempts to create them with null elements result in NullPointerException". Map.of carries the same contract for maps, rejecting null keys and values and duplicate keys. A hand-built mutable list can be modified by any holder, so the factory both shortens the code and fixes the contents.

## Bad

```java
import java.util.ArrayList;
import java.util.List;

class Roles {
    List<String> defaults() {
        List<String> roles = new ArrayList<>();
        roles.add("reader");
        roles.add("writer");
        return roles;
    }
}
```

## Good

```java
import java.util.List;

class Roles {
    List<String> defaults() {
        return List.of("reader", "writer");
    }
}
```

## See Also

- [java-coll-sub-list-view](coll-sub-list-view.md) - turning views into standalone copies
