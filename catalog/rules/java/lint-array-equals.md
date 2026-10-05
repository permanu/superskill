---
id: java-lint-array-equals
lang: java
prefix: lint
title: "Compare array contents with Arrays.equals"
severity: should
enforce: tool
tool: "errorprone:ArrayEquals"
baseline: latest
status: verified
triggers:
  keywords: [array, equals, comparison]
  files: ["**/*.java"]
  symbols: [ArrayEquals]
related: [java-coll-set-membership]
sources:
  - title: "Error Prone: ArrayEquals"
    url: https://errorprone.info/bugpattern/ArrayEquals
---
> Compare arrays by content; equals on an array checks object identity.

## Why

Error Prone's ArrayEquals check observes that "generally when comparing arrays for equality, the programmer intends to check that the contents of the arrays are equal rather than that they are actually the same object", and that common helpers such as the instance `.equals()` method and `Objects.equals` compare arrays for reference equality. It prescribes `java.util.Arrays#equals()` for content comparison.

## Bad

```java
class Tokens {
    boolean same(String[] left, String[] right) {
        return left.equals(right);
    }
}
```

## Good

```java
import java.util.Arrays;

class Tokens {
    boolean same(String[] left, String[] right) {
        return Arrays.equals(left, right);
    }
}
```

## See Also

- [java-coll-set-membership](coll-set-membership.md) - choosing the right equality semantics for a collection
