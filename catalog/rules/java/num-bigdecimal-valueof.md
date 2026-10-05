---
id: java-num-bigdecimal-valueof
lang: java
prefix: num
title: "Convert doubles to BigDecimal with valueOf, not the constructor"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [bigdecimal, valueof, constructor, conversion]
  files: ["**/*.java"]
  symbols: [BigDecimal.valueOf]
related: [java-num-bigdecimal-money]
sources:
  - title: "BigDecimal API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/math/BigDecimal.html
---
> Route double values through BigDecimal.valueOf so the decimal digits are the ones the double prints.

## Why

The BigDecimal(double) constructor documentation warns that "the results of this constructor can be somewhat unpredictable": `new BigDecimal(0.1)` is "actually equal to 0.1000000000000000055511151231257827021181583404541015625" because 0.1 cannot be represented exactly as a double. BigDecimal.valueOf(double) instead uses "the double's canonical string representation provided by the Double.toString(double) method", giving the decimal the programmer intended.

## Bad

```java
import java.math.BigDecimal;

class Rates {
    BigDecimal rate() {
        return new BigDecimal(0.1);
    }
}
```

## Good

```java
import java.math.BigDecimal;

class Rates {
    BigDecimal rate() {
        return BigDecimal.valueOf(0.1);
    }
}
```

## See Also

- [java-num-bigdecimal-money](num-bigdecimal-money.md) - where exact decimal values matter
