---
id: java-type-sealed-non-sealed
lang: java
prefix: type
title: "Re-open a sealed branch deliberately with non-sealed"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sealed, non-sealed, extension, hierarchy]
  files: ["**/*.java"]
  symbols: [non-sealed]
related: [java-type-sealed-closed-kinds, java-type-sealed-permits-inferred]
sources:
  - title: "JEP 409: Sealed Classes"
    url: https://openjdk.org/jeps/409
---
> Mark a permitted subclass non-sealed where unknown implementations must be allowed.

## Why

JEP 409 explains that "a permitted subclass may be declared non-sealed so that its part of the hierarchy reverts to being open for extension by unknown subclasses". Marking such a class final instead would freeze an extension point that was meant to stay open, and leaving it with no modifier at all is a compile-time error inside a sealed hierarchy — non-sealed is the modifier that records the intent.

## Bad

```java
sealed interface Shape permits Rectangle {
}

final class Rectangle implements Shape {
}
```

## Good

```java
sealed interface Shape permits Rectangle {
}

non-sealed class Rectangle implements Shape {
}
```

## See Also

- [java-type-sealed-closed-kinds](type-sealed-closed-kinds.md) - the closed-hierarchy model
- [java-type-sealed-permits-inferred](type-sealed-permits-inferred.md) - omitting the permits list
