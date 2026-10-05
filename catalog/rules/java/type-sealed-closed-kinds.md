---
id: java-type-sealed-closed-kinds
lang: java
prefix: type
title: "Model a closed set of alternatives as a sealed interface"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sealed, interface, permits, alternatives, hierarchy]
  files: ["**/*.java"]
  symbols: [sealed]
related: [java-type-sealed-public-alternatives, java-type-exhaustive-switch, java-type-enum-fixed-instances]
sources:
  - title: "JEP 409: Sealed Classes"
    url: https://openjdk.org/jeps/409
---
> Restrict a hierarchy to a known set of alternatives with a sealed interface and final implementations.

## Why

JEP 409 motivates sealing with exactly this case: "sometimes we want to model a fixed set of kinds of values", and the author is "interested in the clarity of code that handles known subclasses, and not interested in writing code to defend against unknown subclasses". An open interface forces every consumer to add a fallback branch for implementations that cannot exist; a sealed type records the closed set in the code the compiler checks.

## Bad

```java
interface Shape {
}

class Circle implements Shape {
}

class Square implements Shape {
}

class Areas {
    double area(Shape shape) {
        if (shape instanceof Circle) {
            return 1.0;
        }
        if (shape instanceof Square) {
            return 2.0;
        }
        throw new IllegalArgumentException("unknown shape: " + shape.getClass());
    }
}
```

## Good

```java
sealed interface Shape permits Circle, Square {
}

record Circle(double radius) implements Shape {
}

record Square(double side) implements Shape {
}

class Areas {
    double area(Shape shape) {
        return switch (shape) {
            case Circle c -> Math.PI * c.radius() * c.radius();
            case Square s -> s.side() * s.side();
        };
    }
}
```

## See Also

- [java-type-sealed-public-alternatives](type-sealed-public-alternatives.md) - exposing the sealed abstraction to consumers
- [java-type-exhaustive-switch](type-exhaustive-switch.md) - the switch this hierarchy makes safe
- [java-type-enum-fixed-instances](type-enum-fixed-instances.md) - when the fixed set is instances rather than kinds
