---
id: java-opt-never-null
lang: java
prefix: opt
title: "Never return null from a method declared to return Optional"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optional, "null", return, contract]
  files: ["**/*.java"]
  symbols: [Optional]
related: [java-opt-return-type-only]
sources:
  - title: "Optional API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Optional.html
---
> Return Optional.empty(), never null; callers are entitled to treat the Optional itself as present.

## Why

The Optional API note states: "A variable whose type is Optional should never itself be null; it should always point to an Optional instance." Callers chain methods like map, or, and orElse directly on the returned value, so a null return turns an expected absence into a NullPointerException far from its source and defeats the contract the return type declares.

## Bad

```java
import java.util.Optional;

class Repository {
    Optional<String> find(long id) {
        return null;
    }
}
```

## Good

```java
import java.util.Optional;

class Repository {
    Optional<String> find(long id) {
        return Optional.empty();
    }
}
```

## See Also

- [java-opt-return-type-only](opt-return-type-only.md) - where Optional belongs at all
