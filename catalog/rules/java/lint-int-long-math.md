---
id: java-lint-int-long-math
lang: java
prefix: lint
title: "Widen before doing int arithmetic assigned to long"
severity: should
enforce: tool
tool: "errorprone:IntLongMath"
baseline: latest
status: verified
triggers:
  keywords: [overflow, long, widening, arithmetic]
  files: ["**/*.java"]
  symbols: [IntLongMath]
related: [java-num-overflow-exact]
sources:
  - title: "Error Prone: IntLongMath"
    url: https://errorprone.info/bugpattern/IntLongMath
---
> Make one operand long so the intermediate result cannot overflow.

## Why

Error Prone's IntLongMath check explains that "performing an arithmetic expression on arguments of type int and then assigning the result to a long is error-prone. The result is widened to a long as the final step, and the intermediate results may overflow." Its example, `24 * 60 * 60 * 1000 * 1000 * 1000`, overflows to -1857093632 until the first literal is written `24L`.

## Bad

```java
class Timing {
    long nanosPerDay() {
        return 24 * 60 * 60 * 1000 * 1000 * 1000;
    }
}
```

## Good

```java
class Timing {
    long nanosPerDay() {
        return 24L * 60 * 60 * 1000 * 1000 * 1000;
    }
}
```

## See Also

- [java-num-overflow-exact](num-overflow-exact.md) - detecting overflow when it must be an error
