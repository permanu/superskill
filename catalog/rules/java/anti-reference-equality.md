---
id: java-anti-reference-equality
lang: java
prefix: anti
title: "Compare objects by value, not by identity"
severity: should
enforce: tool
tool: "errorprone:ReferenceEquality"
baseline: latest
status: verified
triggers:
  keywords: [equals, identity, comparison, reference]
  files: ["**/*.java"]
  symbols: [ReferenceEquality]
related: [java-conv-objects-equals]
sources:
  - title: "Error Prone: ReferenceEquality"
    url: https://errorprone.info/bugpattern/ReferenceEquality
---
> Use equals for values; == asks whether they are the same object.

## Why

Error Prone's ReferenceEquality check states that "reference types should normally be compared for value equality with equals(), not for object identity with == or !=", while allowing identity where it can prove the semantics match (enums, final classes using Object's equals). Two equal values that arrived through different paths fail an identity test, so == in business logic produces answers that depend on allocation history.

## Bad

```java
class Versions {
    boolean same(Object left, Object right) {
        return left == right;
    }
}
```

## Good

```java
class Versions {
    boolean same(Object left, Object right) {
        return left.equals(right);
    }
}
```

## See Also

- [java-conv-objects-equals](conv-objects-equals.md) - the null-safe form of the same comparison
