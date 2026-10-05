---
id: java-opt-or-else-throw
lang: java
prefix: opt
title: "Replace isPresent-and-get with orElseThrow"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optional, orelsethrow, get, exception]
  files: ["**/*.java"]
  symbols: [Optional.orElseThrow, Optional.get]
related: [java-opt-or-else-get]
sources:
  - title: "Optional API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Optional.html
---
> Express the failure with orElseThrow; get() should not be called without a presence check.

## Why

The Optional.get documentation carries the API note "The preferred alternative to this method is orElseThrow()", and orElseThrow(Supplier) "returns the value, otherwise throws an exception produced by the exception supplying function". The combined form keeps the value and the failure in one expression and lets the caller choose the exception type and message instead of the generic NoSuchElementException.

## Bad

```java
import java.util.Optional;

class Settings {
    String theme(Optional<String> configured) {
        if (configured.isPresent()) {
            return configured.get();
        }
        throw new IllegalStateException("theme not configured");
    }
}
```

## Good

```java
import java.util.Optional;

class Settings {
    String theme(Optional<String> configured) {
        return configured.orElseThrow(() -> new IllegalStateException("theme not configured"));
    }
}
```

## See Also

- [java-opt-or-else-get](opt-or-else-get.md) - the non-throwing fallback for absent values
