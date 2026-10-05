---
id: java-type-record-data-carrier
lang: java
prefix: type
title: "Model immutable data carriers as records instead of hand-written value classes"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [record, data, carrier, immutable, value]
  files: ["**/*.java"]
  symbols: [Record]
related: [java-type-record-validate, java-type-record-accessor-invariants]
sources:
  - title: "JEP 395: Records"
    url: https://openjdk.org/jeps/395
---
> Declare immutable data carriers as records so the header defines the state and its derived API.

## Why

JEP 395 describes a data-carrier class as "a lot of low-value, repetitive, error-prone code: constructors, accessors, equals, hashCode, toString", and warns that cutting corners by omitting those methods leads to surprising behavior or poor debuggability. A record commits to an API derived mechanically from its state description, so every reader sees exactly which data the type carries and gets value equality and a useful toString for free.

## Bad

```java
class Point {
    private final int x;
    private final int y;

    Point(int x, int y) {
        this.x = x;
        this.y = y;
    }

    int x() {
        return x;
    }

    int y() {
        return y;
    }
}
```

## Good

```java
record Point(int x, int y) {
}
```

## See Also

- [java-type-record-validate](type-record-validate.md) - validating the state the header declares
- [java-type-record-accessor-invariants](type-record-accessor-invariants.md) - keeping accessors consistent with that state
