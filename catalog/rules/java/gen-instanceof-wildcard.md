---
id: java-gen-instanceof-wildcard
lang: java
prefix: gen
title: "Use an unbounded wildcard in instanceof tests of generic types"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [instanceof, wildcard, reifiable, erasure]
  files: ["**/*.java"]
  symbols: [List]
related: [java-gen-no-parameterized-arrays, java-gen-unbounded-wildcard]
sources:
  - title: "Java Tutorials: Restrictions on Generics"
    url: https://docs.oracle.com/javase/tutorial/java/generics/restrictions.html
---
> Test with instanceof List<?>, not the raw List; only reifiable types may be tested.

## Why

The Restrictions on Generics page explains that because erasure removes the type argument, "you cannot verify which parameterized type for a generic type is being used at runtime", and concludes "the most you can do is to use an unbounded wildcard to verify that the list is an ArrayList: if (list instanceof ArrayList<?>) { // OK; instanceof requires a reifiable type }". A test against the raw type compiles silently but checks only the erased class and discards the element type entirely; only reifiable types — including unbounded wildcards — are permitted in an instanceof expression.

## Bad

```java
import java.util.List;

class Inspector {
    boolean isEmptyList(Object value) {
        if (value instanceof List) {
            return ((List) value).isEmpty();
        }
        return false;
    }
}
```

## Good

```java
import java.util.List;

class Inspector {
    boolean isEmptyList(Object value) {
        if (value instanceof List<?> list) {
            return list.isEmpty();
        }
        return false;
    }
}
```

## See Also

- [java-gen-no-parameterized-arrays](gen-no-parameterized-arrays.md) - the array form of the erasure limit
- [java-gen-unbounded-wildcard](gen-unbounded-wildcard.md) - when the wildcard type belongs in a signature
