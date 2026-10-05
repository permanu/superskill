---
id: java-anti-static-mutable
lang: java
prefix: anti
title: "Do not keep mutable static state"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [static, mutable, global-state, constants]
  files: ["**/*.java"]
  symbols: [static]
related: [java-const-static-final-immutable]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> Static fields that can change are global variables with a lifetime nobody owns.

## Why

Google style section 5.2.4 defines constants as "static final fields whose contents are deeply immutable and whose methods have no detectable side effects", and warns that "merely intending to never mutate the object is not enough". A mutable static field is shared by every thread and every test in the process, so its state leaks across code that never asked to share, and no constructor or close can reset it.

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

- [java-const-static-final-immutable](const-static-final-immutable.md) - the constant definition this violates
