---
id: java-type-enum-fixed-instances
lang: java
prefix: type
title: "Use an enum for a fixed set of instances and sealed types for a fixed set of kinds"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [enum, sealed, constants, kinds, instances]
  files: ["**/*.java"]
  symbols: [Enum]
related: [java-type-sealed-closed-kinds, java-type-enum-no-ordinal]
sources:
  - title: "JEP 409: Sealed Classes"
    url: https://openjdk.org/jeps/409
---
> Model fixed value sets as enums and fixed value kinds as sealed hierarchies; string constants model neither.

## Why

JEP 409 separates the two cases: enum classes model "the situation where a given class has only a fixed number of instances", while sealed classes model "a fixed set of kinds of values". String constants model neither: the compiler cannot reject a typo, equality is content-based instead of identity, and nothing prevents an unbounded set of values from appearing at run time.

## Bad

```java
class Order {
    static final String STATUS_NEW = "new";
    static final String STATUS_PAID = "paid";

    String status = STATUS_NEW;

    boolean isOpen() {
        return STATUS_NEW.equals(status);
    }
}
```

## Good

```java
class Order {
    enum Status {
        NEW,
        PAID
    }

    Status status = Status.NEW;

    boolean isOpen() {
        return status == Status.NEW;
    }
}
```

## See Also

- [java-type-sealed-closed-kinds](type-sealed-closed-kinds.md) - the kinds case that enums do not cover
- [java-type-enum-no-ordinal](type-enum-no-ordinal.md) - persisting the constants this rule introduces
