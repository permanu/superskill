---
id: java-anti-self-assignment
lang: java
prefix: anti
title: "Do not assign a variable to itself"
severity: must
enforce: tool
tool: "errorprone:SelfAssignment"
baseline: latest
status: verified
triggers:
  keywords: [assignment, self, shadowing, bug]
  files: ["**/*.java"]
  symbols: [SelfAssignment]
related: [java-anti-unused-variable]
sources:
  - title: "Error Prone: SelfAssignment"
    url: https://errorprone.info/bugpattern/SelfAssignment
---
> value = value does nothing; the intended target was probably the field.

## Why

Error Prone's SelfAssignment check states that "the left-hand side and right-hand side of this assignment are the same. It has no effect." The usual cause is a parameter that shadows a field, so the statement looks like it stores the argument while the field stays unchanged; the code compiles, tests may pass, and the missing state surfaces much later.

## Bad

```java
class Limits {
    private int max;

    void reset(int max) {
        max = max;
    }
}
```

## Good

```java
class Limits {
    private int max;

    void reset(int max) {
        this.max = max;
    }
}
```

## See Also

- [java-anti-unused-variable](anti-unused-variable.md) - the related dead-code smell
