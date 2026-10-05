---
id: java-conv-objects-to-string
lang: java
prefix: conv
title: "Render possibly-null values with Objects.toString"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tostring, "null", objects, rendering]
  files: ["**/*.java"]
  symbols: [Objects.toString]
related: [java-conv-objects-equals]
sources:
  - title: "Objects API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Objects.html
---
> One call renders null as "null" instead of throwing.

## Why

Objects.toString "returns the result of calling toString for a non-null argument and \"null\" for a null argument", and its two-argument form substitutes a chosen default. Calling value.toString() directly dereferences a possibly-null reference, so rendering code crashes on exactly the values it was meant to describe; the helper makes the null case part of the contract.

## Bad

```java
class Render {
    String text(Object value) {
        return value.toString();
    }
}
```

## Good

```java
import java.util.Objects;

class Render {
    String text(Object value) {
        return Objects.toString(value);
    }
}
```

## See Also

- [java-conv-objects-equals](conv-objects-equals.md) - the equality counterpart
