---
id: java-type-sealed-permits-inferred
lang: java
prefix: type
title: "Let permits be inferred when implementations share the file"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sealed, permits, inference, hierarchy]
  files: ["**/*.java"]
  symbols: [sealed]
related: [java-type-sealed-closed-kinds, java-type-sealed-non-sealed]
sources:
  - title: "JEP 409: Sealed Classes"
    url: https://openjdk.org/jeps/409
---
> Omit the permits clause when every permitted subtype is in the same compilation unit.

## Why

JEP 409 says that when all the subclasses are declared in the same file as the sealed class, "the sealed class is inferred to have three permitted subclasses" without a permits clause. The explicit list then duplicates information the compiler already has, and every new implementation needs two edits — the class and the list — that can drift apart.

## Bad

```java
sealed interface Shape permits Circle, Square {
}

final class Circle implements Shape {
}

final class Square implements Shape {
}
```

## Good

```java
sealed interface Shape {
}

final class Circle implements Shape {
}

final class Square implements Shape {
}
```

## See Also

- [java-type-sealed-closed-kinds](type-sealed-closed-kinds.md) - when a sealed interface is the right model
- [java-type-sealed-non-sealed](type-sealed-non-sealed.md) - re-opening a branch deliberately
