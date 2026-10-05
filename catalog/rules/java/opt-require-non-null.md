---
id: java-opt-require-non-null
lang: java
prefix: opt
title: "Validate parameters with Objects.requireNonNull"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["null", validation, parameters, requirenonnull]
  files: ["**/*.java"]
  symbols: [Objects.requireNonNull]
related: [java-opt-never-null]
sources:
  - title: "Objects API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Objects.html
---
> Fail fast on null parameters with requireNonNull; it returns the value for assignment.

## Why

Objects.requireNonNull "checks that the specified object reference is not null" and "is designed primarily for doing parameter validation in methods and constructors". It returns its argument, so the check and the assignment are one statement, and the message overload names the offending parameter so the NullPointerException points at the caller's mistake instead of surfacing later at an unrelated use.

## Bad

```java
class Service {
    private final String name;

    Service(String name) {
        if (name == null) {
            throw new NullPointerException("name");
        }
        this.name = name;
    }
}
```

## Good

```java
import java.util.Objects;

class Service {
    private final String name;

    Service(String name) {
        this.name = Objects.requireNonNull(name, "name");
    }
}
```

## See Also

- [java-opt-never-null](opt-never-null.md) - the return-side null contract
