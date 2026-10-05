---
id: java-const-bigdecimal-constants
lang: java
prefix: const
title: "Reuse BigDecimal's predefined constants"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [bigdecimal, constants, zero, reuse]
  files: ["**/*.java"]
  symbols: [BigDecimal.ZERO, BigDecimal.ONE]
related: [java-num-bigdecimal-money]
sources:
  - title: "BigDecimal API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/math/BigDecimal.html
---
> Use ZERO, ONE, and TEN instead of constructing the same values again.

## Why

BigDecimal publishes ZERO, ONE, TWO, and TEN as static fields — "the value 0, with a scale of 0", "the value 1, with a scale of 0", and so on. A constructor call such as `new BigDecimal(0)` always allocates a fresh instance for a value the class already defines; the named constant states the intent at the call site and is shared.

## Bad

```java
import java.math.BigDecimal;

class Totals {
    BigDecimal empty() {
        return new BigDecimal(0);
    }
}
```

## Good

```java
import java.math.BigDecimal;

class Totals {
    BigDecimal empty() {
        return BigDecimal.ZERO;
    }
}
```

## See Also

- [java-num-bigdecimal-money](num-bigdecimal-money.md) - why the values are BigDecimal at all
