---
id: java-num-double-equality
lang: java
prefix: num
title: "Do not test computed floating-point values for exact equality"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [floating-point, equality, tolerance, rounding]
  files: ["**/*.java"]
  symbols: [Double]
related: [java-num-nan-test, java-num-bigdecimal-money]
sources:
  - title: "Double API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Double.html
---
> Compare computed floats against a tolerance or an ordered bound, never with ==.

## Why

The Double documentation shows that accumulating ten copies of 0.1 "should not be expected to be exactly equal to 1.0, but only to be close to 1.0", and uses it to explain a surprising infinite loop built on `d != 1.0`. Each arithmetic step rounds, so the exact equality of a computed value is not a stable property; comparisons must allow the accumulated error, either through a tolerance or an ordered bound.

## Bad

```java
class Sum {
    boolean addsUp() {
        double total = 0.0;
        for (int i = 0; i < 10; i++) {
            total += 0.1;
        }
        return total == 1.0;
    }
}
```

## Good

```java
class Sum {
    boolean addsUp() {
        double total = 0.0;
        for (int i = 0; i < 10; i++) {
            total += 0.1;
        }
        return Math.abs(total - 1.0) < 1e-9;
    }
}
```

## See Also

- [java-num-nan-test](num-nan-test.md) - the equality trap specific to NaN
- [java-num-bigdecimal-money](num-bigdecimal-money.md) - when exactness is required instead
