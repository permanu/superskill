---
id: java-opt-map-null
lang: java
prefix: opt
title: "Let map() turn a null mapping result into an empty Optional"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optional, map, "null", transform]
  files: ["**/*.java"]
  symbols: [Optional.map, Optional.flatMap]
related: [java-opt-flatmap]
sources:
  - title: "Optional API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Optional.html
---
> Return the value directly from map(); a null result already becomes Optional.empty().

## Why

The map documentation says it "returns an Optional describing (as if by ofNullable) the result of applying the given mapping function", and adds: "If the mapping function returns a null result then this method returns an empty Optional." Wrapping the result in flatMap with ofNullable repeats that rule by hand and hides that null is an accepted outcome of the mapping.

## Bad

```java
import java.util.Optional;

class Lookup {
    Optional<String> nameOf(User user) {
        return Optional.ofNullable(user).flatMap(u -> Optional.ofNullable(u.name()));
    }
}

class User {
    private String name;

    String name() {
        return name;
    }
}
```

## Good

```java
import java.util.Optional;

class Lookup {
    Optional<String> nameOf(User user) {
        return Optional.ofNullable(user).map(User::name);
    }
}

class User {
    private String name;

    String name() {
        return name;
    }
}
```

## See Also

- [java-opt-flatmap](opt-flatmap.md) - when the mapper genuinely returns an Optional
