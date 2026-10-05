---
id: java-num-double-compare
lang: java
prefix: num
title: "Order floating-point values with Double.compare"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [comparator, double, ordering, nan]
  files: ["**/*.java"]
  symbols: [Double.compare]
related: [java-num-nan-test]
sources:
  - title: "Double API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Double.html
---
> Compare doubles with Double.compare so NaN and signed zeros have a defined order.

## Why

The Double documentation explains that compareTo "defines a total order where -0.0 is less than +0.0 and where a NaN is equal to itself and considered greater than positive infinity", and Double.compare implements the same total order. Subtracting and casting to int truncates differences smaller than 1 to zero and has no answer for NaN, so a comparator written that way can report "equal" for distinct values or violate the comparator contract.

## Bad

```java
import java.util.List;

class Ranker {
    void sort(List<Double> values) {
        values.sort((left, right) -> (int) (left - right));
    }
}
```

## Good

```java
import java.util.List;

class Ranker {
    void sort(List<Double> values) {
        values.sort(Double::compare);
    }
}
```

## See Also

- [java-num-nan-test](num-nan-test.md) - testing for NaN before ordering it
