---
id: java-const-enum-instead-of-int
lang: java
prefix: const
title: "Model fixed sets with enums, not int constants"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [enum, constants, flags, types]
  files: ["**/*.java"]
  symbols: [Enum]
related: [java-type-enum-fixed-instances]
sources:
  - title: "Java Tutorials: Enum Types"
    url: https://docs.oracle.com/javase/tutorial/java/javaOO/enum.html
---
> Replace int constants with an enum; the compiler then checks the values.

## Why

The Enum Types lesson says: "You should use enum types any time you need to represent a fixed set of constants." An int constant carries no type information — any int fits anywhere the constant is accepted, invalid values are undetectable, and printing shows a number. An enum restricts the values to the declared constants, gives them names and behavior, and makes switches checkable.

## Bad

```java
class Flags {
    static final int READ = 1;
    static final int WRITE = 2;
}
```

## Good

```java
enum Flag {
    READ, WRITE
}
```

## See Also

- [java-type-enum-fixed-instances](type-enum-fixed-instances.md) - choosing between enums and sealed types
