---
id: java-const-static-final-immutable
lang: java
prefix: const
title: "Make constants static final and deeply immutable"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constants, static-final, immutability]
  files: ["**/*.java"]
  symbols: [static]
related: [java-style-constant-names, java-anti-static-mutable]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> A constant is a static final field whose contents cannot change.

## Why

Google style section 5.2.4 defines the term precisely: "constants are static final fields whose contents are deeply immutable and whose methods have no detectable side effects", and its examples mark a static final mutable collection as "not constants" with the note "merely intending to never mutate the object is not enough". The modifier pair alone does not make a constant — the referenced object must not offer a way to change.

## Bad

```java
import java.util.HashSet;
import java.util.Set;

class Registry {
    static final Set<String> MODULES = new HashSet<>();
}
```

## Good

```java
import java.util.Set;

class Registry {
    static final Set<String> MODULES = Set.of();
}
```

## See Also

- [java-style-constant-names](style-constant-names.md) - naming the constants this defines
- [java-anti-static-mutable](anti-static-mutable.md) - the global state it prevents
