---
id: java-anti-self-comparison
lang: java
prefix: anti
title: "Do not compare a value with itself"
severity: must
enforce: tool
tool: "errorprone:SelfComparison"
baseline: latest
status: verified
triggers:
  keywords: [compareto, self, comparison, bug]
  files: ["**/*.java"]
  symbols: [SelfComparison]
related: [java-anti-self-assignment]
sources:
  - title: "Error Prone: SelfComparison"
    url: https://errorprone.info/bugpattern/SelfComparison
---
> A self-comparison always returns zero; one operand is the wrong variable.

## Why

Error Prone's SelfComparison check states that "the arguments to compareTo method are the same object, so it always returns 0". A branch or sort key built on that result never varies, which means one of the operands was meant to be a different value; the bug is invisible because the comparison itself is legal.

## Bad

```java
class Order {
    int compare(String value) {
        return value.compareTo(value);
    }
}
```

## Good

```java
class Order {
    int compare(String left, String right) {
        return left.compareTo(right);
    }
}
```

## See Also

- [java-anti-self-assignment](anti-self-assignment.md) - the assignment-shaped variant
