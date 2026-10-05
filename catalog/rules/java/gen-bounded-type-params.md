---
id: java-gen-bounded-type-params
lang: java
prefix: gen
title: "Bound type parameters to the operations the code needs"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [bounded, type-parameter, extends, comparable]
  files: ["**/*.java"]
  symbols: [Comparable]
related: [java-gen-generic-parameters]
sources:
  - title: "Java Tutorials: Bounded Type Parameters"
    url: https://docs.oracle.com/javase/tutorial/java/generics/bounded.html
---
> Add extends bounds so the type parameter exposes the methods the body calls.

## Why

The Bounded Type Parameters page notes that "bounded type parameters allow you to invoke methods defined in the bounds" and that a bound also restricts which types callers may pass. Without a bound, a method that needs to compare values must cast to Comparable, reintroducing the unchecked call that generics were meant to remove; with `T extends Comparable<T>` the comparison is type-checked and the compiler rejects types that cannot be ordered.

## Bad

```java
class Max {
    static <T> T max(T left, T right) {
        return ((Comparable) left).compareTo(right) > 0 ? left : right;
    }
}
```

## Good

```java
class Max {
    static <T extends Comparable<T>> T max(T left, T right) {
        return left.compareTo(right) > 0 ? left : right;
    }
}
```

## See Also

- [java-gen-generic-parameters](gen-generic-parameters.md) - introducing the type parameter itself
