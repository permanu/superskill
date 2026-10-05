---
id: java-num-bigdecimal-divide
lang: java
prefix: num
title: "Give BigDecimal division a scale and rounding mode"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [bigdecimal, divide, rounding, scale]
  files: ["**/*.java"]
  symbols: [BigDecimal.divide, RoundingMode]
related: [java-num-bigdecimal-money]
sources:
  - title: "BigDecimal API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/math/BigDecimal.html
---
> Pass scale and rounding to divide so non-terminating quotients have a defined result.

## Why

The BigDecimal class documentation explains that "in the case of divide, the exact quotient could have an infinitely long decimal expansion; for example, 1 divided by 3. If the quotient has a nonterminating decimal expansion and the operation is specified to return an exact result, an ArithmeticException is thrown." Supplying a scale and a RoundingMode makes the result finite and the rounding policy explicit; the deprecated int rounding constants should be avoided in favor of the RoundingMode enum.

## Bad

```java
import java.math.BigDecimal;

class Split {
    BigDecimal third(BigDecimal amount) {
        return amount.divide(BigDecimal.valueOf(3));
    }
}
```

## Good

```java
import java.math.BigDecimal;
import java.math.RoundingMode;

class Split {
    BigDecimal third(BigDecimal amount) {
        return amount.divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP);
    }
}
```

## See Also

- [java-num-bigdecimal-money](num-bigdecimal-money.md) - exact decimal values in the first place
