---
id: java-num-bigdecimal-money
lang: java
prefix: num
title: "Use BigDecimal for exact decimal arithmetic, not double"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [bigdecimal, money, decimal, precision]
  files: ["**/*.java"]
  symbols: [BigDecimal]
related: [java-num-bigdecimal-valueof, java-num-bigdecimal-equals]
sources:
  - title: "Double API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Double.html
  - title: "BigDecimal API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/math/BigDecimal.html
---
> Keep monetary and other exact decimal values in BigDecimal; binary floating point cannot represent them exactly.

## Why

The Double documentation states that "this representation hazard of decimal fractions is one reason to use caution when storing monetary values as float or double", and lists "using BigDecimal to store decimal fractional values exactly" as the alternative; it shows that the closest double to 0.1 is 0.1000000000000000055511151231257827021181583404541015625. BigDecimal is documented as "immutable, arbitrary-precision signed decimal numbers" with "complete control over rounding behavior", so decimal results are exact until you choose to round.

## Bad

```java
class Invoice {
    double total(int quantity, double unitPrice) {
        return quantity * unitPrice;
    }
}
```

## Good

```java
import java.math.BigDecimal;

class Invoice {
    BigDecimal total(int quantity, BigDecimal unitPrice) {
        return unitPrice.multiply(BigDecimal.valueOf(quantity));
    }
}
```

## See Also

- [java-num-bigdecimal-valueof](num-bigdecimal-valueof.md) - converting doubles into BigDecimal safely
- [java-num-bigdecimal-equals](num-bigdecimal-equals.md) - comparing decimal values by number, not scale
