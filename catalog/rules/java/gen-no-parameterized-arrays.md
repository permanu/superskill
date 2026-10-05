---
id: java-gen-no-parameterized-arrays
lang: java
prefix: gen
title: "Store collections of parameterized types in lists, not arrays"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [array, parameterized, erasure, heap-pollution]
  files: ["**/*.java"]
  symbols: [List]
related: [java-gen-instanceof-wildcard]
sources:
  - title: "Java Tutorials: Restrictions on Generics"
    url: https://docs.oracle.com/javase/tutorial/java/generics/restrictions.html
---
> Parameterized arrays are not allowed; use List<List<T>> instead of casting through an array.

## Why

The Restrictions on Generics page states "You cannot create arrays of parameterized types": arrays check their element type at runtime, and erasure leaves the parameterized element type uncheckable, so the language forbids the array. The common workaround, an unchecked cast of a wildcard array, restores the compile-time hole the restriction exists to prevent and can let the wrong element type be stored undetected.

## Bad

```java
import java.util.List;

class Buckets {
    @SuppressWarnings("unchecked")
    private final List<String>[] buckets = (List<String>[]) new List<?>[10];
}
```

## Good

```java
import java.util.ArrayList;
import java.util.List;

class Buckets {
    private final List<List<String>> buckets = new ArrayList<>();

    void add(int index, String value) {
        while (buckets.size() <= index) {
            buckets.add(new ArrayList<>());
        }
        buckets.get(index).add(value);
    }
}
```

## See Also

- [java-gen-instanceof-wildcard](gen-instanceof-wildcard.md) - the runtime-check side of the same erasure limit
