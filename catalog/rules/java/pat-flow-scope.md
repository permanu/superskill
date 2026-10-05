---
id: java-pat-flow-scope
lang: java
prefix: pat
title: "Rely on flow scoping after a negated pattern guard"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [instanceof, pattern, scope, guard]
  files: ["**/*.java"]
  symbols: [instanceof]
related: [java-type-pattern-instanceof]
sources:
  - title: "JEP 394: Pattern Matching for instanceof"
    url: https://openjdk.org/jeps/394
---
> After a negated pattern guard returns, the variable is still in scope; do not re-cast.

## Why

JEP 394 explains that "a pattern variable is only in scope where the compiler can deduce that the pattern has definitely matched and the variable will have been assigned a value. This analysis is flow sensitive and works in a similar way to existing flow analyses such as definite assignment." A guard written as `if (!(value instanceof String text)) return ...;` therefore leaves `text` usable for the rest of the method, which removes the redundant cast that a separate type test would need.

## Bad

```java
class Shape {
    String describe(Object value) {
        if (!(value instanceof String)) {
            return "other";
        }
        return ((String) value).trim();
    }
}
```

## Good

```java
class Shape {
    String describe(Object value) {
        if (!(value instanceof String text)) {
            return "other";
        }
        return text.trim();
    }
}
```

## See Also

- [java-type-pattern-instanceof](type-pattern-instanceof.md) - binding the narrowed value in the pattern
