---
id: java-type-enum-no-ordinal
lang: java
prefix: type
title: "Persist enum constants by name, never by ordinal"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [enum, ordinal, persist, name, serialization]
  files: ["**/*.java"]
  symbols: [Enum.ordinal]
related: [java-type-enum-fixed-instances]
sources:
  - title: "Enum API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Enum.html
---
> Store and transmit enum constants by name; ordinals are declaration-order implementation details.

## Why

The Enum API says of ordinal(): "Most programmers will have no use for this method. It is designed for use by sophisticated enum-based data structures, such as EnumSet and EnumMap." The ordinal is the constant's position in the declaration, so inserting or reordering a constant silently renumbers every stored value, and data written by one release is read as a different constant by the next.

## Bad

```java
enum Priority {
    LOW,
    HIGH
}

class Task {
    Priority priority = Priority.LOW;

    int code() {
        return priority.ordinal();
    }
}
```

## Good

```java
enum Priority {
    LOW,
    HIGH
}

class Task {
    Priority priority = Priority.LOW;

    String code() {
        return priority.name();
    }
}
```

## See Also

- [java-type-enum-fixed-instances](type-enum-fixed-instances.md) - the enum declaration this rule protects
