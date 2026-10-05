---
id: java-num-bigdecimal-equals
lang: java
prefix: num
title: "Compare BigDecimal values with compareTo, not equals"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [bigdecimal, compareto, equals, scale]
  files: ["**/*.java"]
  symbols: [BigDecimal.compareTo]
related: [java-num-bigdecimal-money]
sources:
  - title: "BigDecimal API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/math/BigDecimal.html
---
> Compare decimals by numeric value; equals also requires the same scale.

## Why

The BigDecimal.equals documentation says two objects are "equal only if they are equal in value and scale. Therefore 2.0 is not equal to 2.00 when compared by this method", while the class documentation explains that "the natural order of BigDecimal considers members of the same cohort to be equal to each other". Values that arrive from different computations routinely carry different scales, so numeric equality must use compareTo, which returns zero for numerically equal values.

## Bad

```java
import java.math.BigDecimal;

class Prices {
    boolean same(BigDecimal left, BigDecimal right) {
        return left.equals(right);
    }
}
```

## Good

```java
import java.math.BigDecimal;

class Prices {
    boolean same(BigDecimal left, BigDecimal right) {
        return left.compareTo(right) == 0;
    }
}
```

## See Also

- [java-num-bigdecimal-money](num-bigdecimal-money.md) - why the values are BigDecimal in the first place
