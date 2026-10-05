---
id: java-conv-objects-equals
lang: java
prefix: conv
title: "Compare possibly-null values with Objects.equals"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [equals, "null", objects, comparison]
  files: ["**/*.java"]
  symbols: [Objects.equals]
related: [java-conv-objects-to-string]
sources:
  - title: "Objects API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Objects.html
---
> Null-safe equality in one call; no receiver dereference.

## Why

Objects.equals "returns true if the arguments are equal to each other and false otherwise. Consequently, if both arguments are null, true is returned. Otherwise, if the first argument is not null, equality is determined by calling the equals method of the first argument". Calling left.equals(right) directly throws when left is null, so every comparison site either repeats a null check or risks a NullPointerException that depends on data.

## Bad

```java
class Names {
    boolean same(String left, String right) {
        return left.equals(right);
    }
}
```

## Good

```java
import java.util.Objects;

class Names {
    boolean same(String left, String right) {
        return Objects.equals(left, right);
    }
}
```

## See Also

- [java-conv-objects-to-string](conv-objects-to-string.md) - the same helper for rendering
