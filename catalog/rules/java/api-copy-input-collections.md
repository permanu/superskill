---
id: java-api-copy-input-collections
lang: java
prefix: api
title: "Copy caller-supplied collections in constructors"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constructor, collection, copy, encapsulation]
  files: ["**/*.java"]
  symbols: [List.copyOf]
related: [java-api-immutable-exposure]
sources:
  - title: "Collection API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Collection.html
---
> Snapshot input collections so later mutations cannot change your state.

## Why

The Collection documentation notes that "all general-purpose Collection implementation classes should provide ... a constructor with a single argument of type Collection, which creates a new collection with the same elements as its argument", and that copying "allows the user to copy any collection, producing an equivalent collection of the desired implementation type". A constructor that stores the caller's list keeps a live reference, so the caller can change the object's contents after construction, and the object's invariants depend on code it does not control.

## Bad

```java
import java.util.List;

class Roster {
    private final List<String> names;

    Roster(List<String> names) {
        this.names = names;
    }
}
```

## Good

```java
import java.util.List;

class Roster {
    private final List<String> names;

    Roster(List<String> names) {
        this.names = List.copyOf(names);
    }
}
```

## See Also

- [java-api-immutable-exposure](api-immutable-exposure.md) - the return-side counterpart
