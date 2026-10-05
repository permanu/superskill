---
id: java-opt-or-else-get
lang: java
prefix: opt
title: "Use orElseGet() when the fallback must be computed"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optional, orelseget, orelse, default]
  files: ["**/*.java"]
  symbols: [Optional.orElseGet, Optional.orElse]
related: [java-opt-or-else-throw, java-opt-or-chain]
sources:
  - title: "Optional API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Optional.html
---
> Pass constants to orElse and a Supplier to orElseGet so computed defaults run only when needed.

## Why

orElse "returns the value, if present, otherwise returns other" — its argument is evaluated before the call, so a method call in that position runs even when the Optional is present. orElseGet "returns the value, if present, otherwise returns the result produced by the supplying function", deferring the computation to the empty case.

## Bad

```java
import java.util.Optional;

class Cache {
    String value(Optional<String> cached) {
        return cached.orElse(load());
    }

    private static String load() {
        return "expensive";
    }
}
```

## Good

```java
import java.util.Optional;

class Cache {
    String value(Optional<String> cached) {
        return cached.orElseGet(Cache::load);
    }

    private static String load() {
        return "expensive";
    }
}
```

## See Also

- [java-opt-or-else-throw](opt-or-else-throw.md) - the throwing variant
- [java-opt-or-chain](opt-or-chain.md) - chaining several fallbacks
