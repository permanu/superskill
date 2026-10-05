---
id: java-opt-or-chain
lang: java
prefix: opt
title: "Chain alternative sources with or()"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optional, or, fallback, chain]
  files: ["**/*.java"]
  symbols: [Optional.or]
related: [java-opt-or-else-get]
sources:
  - title: "Optional API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Optional.html
---
> Fall back between Optionals with or(); nested isPresent branches hide the chain.

## Why

The or method "returns an Optional describing the value" when present, "otherwise returns an Optional produced by the supplying function". Spelling a fallback chain as isPresent checks plus get() mixes unwrapping into control flow, while or() keeps the alternatives in one expression that still ends with orElse or orElseThrow.

## Bad

```java
import java.util.Optional;

class Config {
    String value(Optional<String> primary, Optional<String> secondary) {
        if (primary.isPresent()) {
            return primary.get();
        }
        return secondary.orElse("default");
    }
}
```

## Good

```java
import java.util.Optional;

class Config {
    String value(Optional<String> primary, Optional<String> secondary) {
        return primary.or(() -> secondary).orElse("default");
    }
}
```

## See Also

- [java-opt-or-else-get](opt-or-else-get.md) - producing the final default value
