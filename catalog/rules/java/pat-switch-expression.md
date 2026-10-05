---
id: java-pat-switch-expression
lang: java
prefix: pat
title: "Dispatch on patterns with switch expressions"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [switch, pattern, expression, dispatch]
  files: ["**/*.java"]
  symbols: [switch]
related: [java-type-exhaustive-switch]
sources:
  - title: "JEP 441: Pattern Matching for switch"
    url: https://openjdk.org/jeps/441
---
> Return values from a pattern switch; each case yields and coverage is checked.

## Why

JEP 441 enhances "switch expressions and statements" so patterns can appear in case labels, and it uses "switch statements by requiring that pattern switch statements cover all possible input values" as a safety goal. A switch expression makes the dispatch produce a value directly, so each case is an expression rather than a return tucked into a statement, and the compiler checks that the arms are exhaustive.

## Bad

```java
class Shapes {
    double area(Object shape) {
        switch (shape) {
            case Circle c:
                return Math.PI * c.radius() * c.radius();
            case Square s:
                return s.side() * s.side();
            default:
                return 0;
        }
    }
}

record Circle(double radius) {
}

record Square(double side) {
}
```

## Good

```java
class Shapes {
    double area(Object shape) {
        return switch (shape) {
            case Circle c -> Math.PI * c.radius() * c.radius();
            case Square s -> s.side() * s.side();
            default -> 0;
        };
    }
}

record Circle(double radius) {
}

record Square(double side) {
}
```

## See Also

- [java-type-exhaustive-switch](type-exhaustive-switch.md) - dropping default when sealed coverage is proven
