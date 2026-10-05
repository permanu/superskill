---
id: java-opt-of-nullable
lang: java
prefix: opt
title: "Choose of() and ofNullable() from the null contract"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optional, ofnullable, "null", creation]
  files: ["**/*.java"]
  symbols: [Optional.of, Optional.ofNullable]
related: [java-opt-map-null]
sources:
  - title: "Optional API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Optional.html
---
> Use of() for values that must be present and ofNullable() where null means empty.

## Why

Optional.of "returns an Optional describing the given non-null value" and throws NullPointerException for null, while ofNullable "returns an Optional describing the given value, if non-null, otherwise returns an empty Optional". Passing a possibly-null value to of turns an expected absence into a crash; ofNullable states at the creation site that null is an accepted outcome.

## Bad

```java
import java.util.Optional;

class Config {
    private String theme;

    Optional<String> theme() {
        return Optional.of(theme);
    }
}
```

## Good

```java
import java.util.Optional;

class Config {
    private String theme;

    Optional<String> theme() {
        return Optional.ofNullable(theme);
    }
}
```

## See Also

- [java-opt-map-null](opt-map-null.md) - the same null-to-empty rule inside map
