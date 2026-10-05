---
id: java-num-overflow-exact
lang: java
prefix: num
title: "Detect int and long overflow with the *Exact methods"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [overflow, exact, arithmetic, bounds]
  files: ["**/*.java"]
  symbols: [Math.addExact, Math.multiplyExact]
related: [java-num-to-int-exact]
sources:
  - title: "Math API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Math.html
---
> Use addExact and multiplyExact where overflow must be an error, not a silent wraparound.

## Why

The Math class documentation states: "The best practice is to choose the primitive type and algorithm to avoid overflow. In cases where the size is int or long and overflow errors need to be detected, the methods whose names end with Exact throw an ArithmeticException when the results overflow." Plain + and * wrap around silently, so a value that overflows turns into a plausible but wrong number.

## Bad

```java
class Counters {
    int add(int total, int delta) {
        return total + delta;
    }
}
```

## Good

```java
class Counters {
    int add(int total, int delta) {
        return Math.addExact(total, delta);
    }
}
```

## See Also

- [java-num-to-int-exact](num-to-int-exact.md) - the same contract for narrowing conversions
