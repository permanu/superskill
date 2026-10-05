---
id: java-gen-wildcard-return
lang: java
prefix: gen
title: "Avoid wildcard types in return positions"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [wildcard, return-type, api-design]
  files: ["**/*.java"]
  symbols: [List]
related: [java-gen-wildcard-pecs]
sources:
  - title: "Java Tutorials: Guidelines for Wildcard Use"
    url: https://docs.oracle.com/javase/tutorial/java/generics/wildcardGuidelines.html
---
> Return a concrete type; a wildcard return forces every caller to deal with wildcards.

## Why

The Guidelines for Wildcard Use page states that its rules "do not apply to a method's return type. Using a wildcard as a return type should be avoided because it forces programmers using the code to deal with wildcards." A caller that receives List<? extends Number> cannot add elements or pass the list to APIs that need a specific element type without its own capture work, so the wildcard leaks the implementation's flexibility into every use site.

## Bad

```java
import java.util.List;

class Shapes {
    static List<? extends Number> dimensions() {
        return List.of(1, 2, 3);
    }
}
```

## Good

```java
import java.util.List;

class Shapes {
    static List<Integer> dimensions() {
        return List.of(1, 2, 3);
    }
}
```

## See Also

- [java-gen-wildcard-pecs](gen-wildcard-pecs.md) - where wildcards belong instead
