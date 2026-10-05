---
id: java-gen-unbounded-wildcard
lang: java
prefix: gen
title: "Use List<?> when only Object-level operations are needed"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unbounded, wildcard, object, generics]
  files: ["**/*.java"]
  symbols: [List]
related: [java-gen-wildcard-pecs]
sources:
  - title: "Java Tutorials: Unbounded Wildcards"
    url: https://docs.oracle.com/javase/tutorial/java/generics/unboundedWildcards.html
---
> Write List<?> for methods that only read or use type-independent methods.

## Why

The Unbounded Wildcards page lists the two scenarios where "?" is useful: "If you are writing a method that can be implemented using functionality provided in the Object class" and "When the code is using methods in the generic class that don't depend on the type parameter". An unused type parameter on such a method adds nothing and suggests the method cares about the element type; List<Object> is not a substitute, because List<Integer> is not a subtype of it.

## Bad

```java
import java.util.List;

class Printer {
    static <T> void print(List<T> values) {
        for (T value : values) {
            System.out.println(value);
        }
    }
}
```

## Good

```java
import java.util.List;

class Printer {
    static void print(List<?> values) {
        for (Object value : values) {
            System.out.println(value);
        }
    }
}
```

## See Also

- [java-gen-wildcard-pecs](gen-wildcard-pecs.md) - choosing between extends, super, and the unbounded wildcard
