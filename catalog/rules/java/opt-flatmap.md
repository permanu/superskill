---
id: java-opt-flatmap
lang: java
prefix: opt
title: "Use flatMap() when the mapping function returns an Optional"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optional, flatmap, nesting, transform]
  files: ["**/*.java"]
  symbols: [Optional.flatMap, Optional.map]
related: [java-opt-map-null]
sources:
  - title: "Optional API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Optional.html
---
> flatMap keeps one level of Optional; map would nest it.

## Why

The flatMap documentation says it "is similar to map(Function), but the mapping function is one whose result is already an Optional, and if invoked, flatMap does not wrap it within an additional Optional." A mapper that returns Optional used with map produces Optional<Optional<T>>, pushing an extra unwrap onto every caller and breaking chained calls like orElse.

## Bad

```java
import java.util.Optional;

class Service {
    Optional<String> primary(long id) {
        return Optional.empty();
    }

    Optional<Optional<String>> lookup(long id) {
        return Optional.of(id).map(this::primary);
    }
}
```

## Good

```java
import java.util.Optional;

class Service {
    Optional<String> primary(long id) {
        return Optional.empty();
    }

    Optional<String> lookup(long id) {
        return Optional.of(id).flatMap(this::primary);
    }
}
```

## See Also

- [java-opt-map-null](opt-map-null.md) - when map is the right choice instead
