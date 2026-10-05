---
id: java-lint-immutable-enum
lang: java
prefix: lint
title: "Keep enum fields final and deeply immutable"
severity: should
enforce: tool
tool: "errorprone:ImmutableEnumChecker"
baseline: latest
status: verified
triggers:
  keywords: [enum, immutability, fields]
  files: ["**/*.java"]
  symbols: [ImmutableEnumChecker]
related: [java-type-enum-fixed-instances]
sources:
  - title: "Error Prone: ImmutableEnumChecker"
    url: https://errorprone.info/bugpattern/ImmutableEnumChecker
---
> Enum state is constant state; fields must be final and immutable.

## Why

Error Prone's ImmutableEnumChecker requires that "all fields in your enum class should be final and either be primitive or refer to deeply immutable objects", because "we all think of enum values as constants ... and would be very surprised if any of their state ever changed, or was not thread-safe". A non-final array field on an enum makes shared, mutable state reachable from every user of the constant.

## Bad

```java
enum Suit {
    HEARTS;

    String[] colors = { "red" };
}
```

## Good

```java
enum Suit {
    HEARTS;

    private final String color = "red";
}
```

## See Also

- [java-type-enum-fixed-instances](type-enum-fixed-instances.md) - when an enum is the right model at all
